import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clientId, endpoint } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this client' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`YouTube API request for client ${clientId}, endpoint: ${endpoint}`);

    // Get the YouTube connection for this client
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'youtube')
      .eq('status', 'active')
      .maybeSingle();

    if (connectionError) {
      console.error('Error fetching YouTube connection:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch YouTube connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'No active YouTube connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token;
    const channelId = connection.platform_page_id; // YouTube channel ID

    if (!accessToken || !channelId) {
      return new Response(
        JSON.stringify({ error: 'Missing access token or channel ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'channel-stats') {
      // Fetch channel statistics
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!channelResponse.ok) {
        const errorText = await channelResponse.text();
        console.error('YouTube API error:', errorText);
        
        // Check if token expired
        if (channelResponse.status === 401) {
          // Try to refresh the token
          const refreshResult = await refreshYouTubeToken(supabase, connection);
          if (refreshResult.error) {
            return new Response(
              JSON.stringify({ error: 'Token expired and refresh failed' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Retry with new token
          const retryResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`,
            {
              headers: {
                Authorization: `Bearer ${refreshResult.accessToken}`,
              },
            }
          );
          
          if (!retryResponse.ok) {
            return new Response(
              JSON.stringify({ error: 'Failed to fetch channel data after token refresh' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const retryData = await retryResponse.json();
          return formatChannelResponse(retryData, corsHeaders);
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to fetch channel data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const channelData = await channelResponse.json();
      return formatChannelResponse(channelData, corsHeaders);
    }

    if (endpoint === 'channel-videos') {
      const { params } = await req.json().catch(() => ({ params: {} }));
      const limit = params?.limit || 10;

      // First get the uploads playlist ID
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!channelResponse.ok) {
        // Try token refresh on 401
        if (channelResponse.status === 401) {
          const refreshResult = await refreshYouTubeToken(supabase, connection);
          if (refreshResult.error) {
            return new Response(
              JSON.stringify({ error: 'Token expired and refresh failed' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          // Just return error, we'll handle retry in client
          return new Response(
            JSON.stringify({ error: 'Token refreshed, please retry', videos: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Failed to fetch channel data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const channelData = await channelResponse.json();
      if (!channelData.items || channelData.items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Channel not found', videos: [] }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return new Response(
          JSON.stringify({ error: 'No uploads playlist found', videos: [] }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch videos from uploads playlist
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!playlistResponse.ok) {
        console.error('Failed to fetch playlist:', await playlistResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to fetch videos', videos: [] }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const playlistData = await playlistResponse.json();
      const videoIds = (playlistData.items || [])
        .map((item: any) => item.contentDetails?.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) {
        return new Response(
          JSON.stringify({ videos: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch video statistics
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!videosResponse.ok) {
        console.error('Failed to fetch video stats:', await videosResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to fetch video statistics', videos: [] }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videosData = await videosResponse.json();
      const videos = (videosData.items || []).map((video: any) => ({
        id: video.id,
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        publishedAt: video.snippet?.publishedAt || '',
        thumbnailUrl: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
        viewCount: parseInt(video.statistics?.viewCount) || 0,
        likeCount: parseInt(video.statistics?.likeCount) || 0,
        commentCount: parseInt(video.statistics?.commentCount) || 0,
        duration: video.contentDetails?.duration || '',
      }));

      console.log(`Fetched ${videos.length} YouTube videos for channel ${channelId}`);

      return new Response(
        JSON.stringify({ videos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown endpoint' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('YouTube API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatChannelResponse(channelData: any, corsHeaders: Record<string, string>) {
  if (!channelData.items || channelData.items.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Channel not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const channel = channelData.items[0];
  const stats = channel.statistics;
  const snippet = channel.snippet;

  console.log(`YouTube channel stats for ${snippet.title}: ${stats.subscriberCount} subscribers`);

  return new Response(
    JSON.stringify({
      channelId: channel.id,
      name: snippet.title,
      subscriberCount: parseInt(stats.subscriberCount) || 0,
      viewCount: parseInt(stats.viewCount) || 0,
      videoCount: parseInt(stats.videoCount) || 0,
      thumbnailUrl: snippet.thumbnails?.default?.url,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function refreshYouTubeToken(supabase: any, connection: any) {
  const clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret || !connection.refresh_token) {
    return { error: 'Missing credentials for token refresh' };
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token refresh failed:', await tokenResponse.text());
      return { error: 'Token refresh failed' };
    }

    const tokens = await tokenResponse.json();
    
    // Update the connection with new access token
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Failed to update token:', updateError);
      return { error: 'Failed to save new token' };
    }

    console.log('YouTube token refreshed successfully');
    return { accessToken: tokens.access_token };
  } catch (error) {
    console.error('Token refresh error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMessage };
  }
}
