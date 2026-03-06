import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID');
const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`YouTube OAuth action: ${action}`);

    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      throw new Error('YouTube credentials not configured');
    }

    // Action: Generate authorization URL
    if (action === 'authorize') {
      const { redirectUri, clientId } = await req.json();
      
      const state = btoa(JSON.stringify({ clientId }));
      
      // Include broader scopes to access Brand Accounts and managed channels
      const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube', // Full YouTube access for managed channels
      ];
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', YOUTUBE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      console.log('Generated YouTube auth URL');
      
      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Exchange code for tokens and fetch channels
    if (action === 'fetch-accounts') {
      const { code, redirectUri, clientId } = await req.json();
      
      console.log('Exchanging YouTube authorization code for tokens');
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: YOUTUBE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error('Token exchange error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }
      
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in;
      
      console.log('Successfully obtained YouTube tokens');
      
      const allChannels: any[] = [];
      
      // 1. Fetch user's own YouTube channels (personal)
      try {
        const ownChannelsResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        const ownChannelsData = await ownChannelsResponse.json();
        
        if (!ownChannelsData.error && ownChannelsData.items) {
          for (const channel of ownChannelsData.items) {
            allChannels.push({
              id: channel.id,
              name: channel.snippet.title,
              thumbnail: channel.snippet.thumbnails?.default?.url,
              subscriberCount: channel.statistics?.subscriberCount,
              videoCount: channel.statistics?.videoCount,
              isOwned: true,
              type: 'personal',
            });
          }
          console.log(`Found ${ownChannelsData.items.length} own YouTube channels`);
        }
      } catch (err) {
        console.log('Error fetching own channels:', err);
      }
      
      // 2. Try managedByMe for Brand Accounts where user is manager
      try {
        const managedResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&managedByMe=true',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        const managedData = await managedResponse.json();
        
        if (!managedData.error && managedData.items) {
          for (const channel of managedData.items) {
            if (!allChannels.some(c => c.id === channel.id)) {
              allChannels.push({
                id: channel.id,
                name: channel.snippet.title,
                thumbnail: channel.snippet.thumbnails?.default?.url,
                subscriberCount: channel.statistics?.subscriberCount,
                videoCount: channel.statistics?.videoCount,
                isOwned: false,
                type: 'managed',
              });
            }
          }
          console.log(`Found ${managedData.items.length} managed YouTube channels`);
        } else if (managedData.error) {
          console.log('managedByMe not available:', managedData.error.message);
        }
      } catch (err) {
        console.log('Error fetching managed channels:', err);
      }
      
      // 3. Try to get channels via subscription to own channels or linked channels
      // This can sometimes reveal Brand Account channels
      try {
        const subscriptionsResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        // We don't add subscribed channels, just log for debugging
        const subsData = await subscriptionsResponse.json();
        console.log(`User has ${subsData.items?.length || 0} subscriptions`);
      } catch (err) {
        console.log('Error fetching subscriptions:', err);
      }
      
      console.log(`Total unique channels found: ${allChannels.length}`);
      
      // If no channels found, provide helpful message
      if (allChannels.length === 0) {
        console.log('No channels found - user may need to switch to the correct Google account');
      }
      
      return new Response(JSON.stringify({
        accounts: allChannels,
        accessToken,
        refreshToken,
        expiresIn,
        clientId,
        message: allChannels.length === 0 
          ? 'No se encontraron canales. Si administras un canal de Brand Account, asegúrate de iniciar sesión con la cuenta de Google correcta que tiene acceso al canal.'
          : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Save connection to database (requires authentication)
    if (action === 'save-connection') {
      // Verify JWT - only authenticated users can save connections
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { clientId, channelId, channelName, accessToken, refreshToken, expiresIn } = await req.json();

      // Verify user has access to this client
      const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      
      // Check for existing connection
      const { data: existing } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('client_id', clientId)
        .eq('platform', 'youtube')
        .maybeSingle();
      
      const connectionData = {
        client_id: clientId,
        platform: 'youtube',
        platform_user_id: channelId,
        platform_page_id: channelId,
        platform_page_name: channelName,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      
      let result;
      if (existing) {
        result = await supabase
          .from('platform_connections')
          .update(connectionData)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('platform_connections')
          .insert(connectionData)
          .select()
          .single();
      }
      
      if (result.error) {
        console.error('Error saving connection:', result.error);
        throw new Error(result.error.message);
      }
      
      console.log(`YouTube connection saved for client ${clientId}`);
      
      return new Response(JSON.stringify({ success: true, connection: result.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('YouTube OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
