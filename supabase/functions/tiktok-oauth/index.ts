import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIKTOK_CLIENT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY');
const TIKTOK_CLIENT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function verifyAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization header' };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }
  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`TikTok OAuth action: ${action}`);

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      throw new Error('TikTok credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Action: Generate authorization URL
    if (action === 'authorize') {
      const { redirectUri, clientId } = await req.json();

      const state = btoa(JSON.stringify({ clientId }));

      // TikTok Login Kit v2 scopes (sandbox supports these)
      const scopes = [
        'user.info.basic',
        'video.list',
      ];

      // TikTok v2 authorization endpoint
      const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
      authUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes.join(','));
      authUrl.searchParams.set('state', state);

      console.log('Generated TikTok auth URL');

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Exchange code for tokens and fetch user info
    if (action === 'fetch-accounts') {
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: authError }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { code, redirectUri, clientId } = await req.json();

      // Verify user has access to this client
      const { data: hasAccess } = await supabase.rpc('has_client_access', {
        _client_id: clientId,
        _user_id: user.id,
      });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Exchanging TikTok authorization code for tokens');

      // TikTok v2 token exchange
      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error || (tokenData.data && tokenData.data.error_code)) {
        console.error('Token exchange error:', tokenData);
        const errMsg = tokenData.error_description || tokenData.data?.description || tokenData.error || 'Token exchange failed';
        throw new Error(errMsg);
      }

      // TikTok v2 returns nested data
      const accessToken = tokenData.access_token || tokenData.data?.access_token;
      const refreshToken = tokenData.refresh_token || tokenData.data?.refresh_token;
      const expiresIn = tokenData.expires_in || tokenData.data?.expires_in || 86400;
      const openId = tokenData.open_id || tokenData.data?.open_id;

      console.log('Successfully obtained TikTok tokens, openId:', openId);

      // Fetch user info
      let displayName = '';
      let avatarUrl = '';
      try {
        const userInfoResponse = await fetch(
          'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const userInfoData = await userInfoResponse.json();
        console.log('TikTok user info response:', JSON.stringify(userInfoData));

        if (userInfoData.data?.user) {
          displayName = userInfoData.data.user.display_name || '';
          avatarUrl = userInfoData.data.user.avatar_url || '';
        }
      } catch (err) {
        console.log('Error fetching TikTok user info:', err);
      }

      return new Response(JSON.stringify({
        account: {
          openId,
          displayName: displayName || `TikTok User`,
          avatarUrl,
        },
        accessToken,
        refreshToken,
        expiresIn,
        clientId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Save connection to database
    if (action === 'save-connection') {
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: authError }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { clientId, openId, displayName, accessToken, refreshToken, expiresIn } = await req.json();

      const { data: hasAccess } = await supabase.rpc('has_client_access', {
        _client_id: clientId,
        _user_id: user.id,
      });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const { data: existing } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('client_id', clientId)
        .eq('platform', 'tiktok')
        .maybeSingle();

      const connectionData = {
        client_id: clientId,
        platform: 'tiktok',
        platform_user_id: openId,
        platform_page_name: displayName,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'active',
        connected_by: user.id,
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

      console.log(`TikTok connection saved for client ${clientId}`);

      return new Response(JSON.stringify({ success: true, connection: result.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Refresh token
    if (action === 'refresh-token') {
      const { refreshToken: oldRefreshToken, clientId } = await req.json();

      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: oldRefreshToken,
        }),
      });

      const tokenData = await tokenResponse.json();
      const newAccessToken = tokenData.access_token || tokenData.data?.access_token;
      const newRefreshToken = tokenData.refresh_token || tokenData.data?.refresh_token;
      const expiresIn = tokenData.expires_in || tokenData.data?.expires_in || 86400;

      if (!newAccessToken) {
        throw new Error('Failed to refresh TikTok token');
      }

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      await supabase
        .from('platform_connections')
        .update({
          access_token: newAccessToken,
          refresh_token: newRefreshToken || oldRefreshToken,
          token_expires_at: tokenExpiresAt,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', clientId)
        .eq('platform', 'tiktok');

      return new Response(JSON.stringify({ success: true, accessToken: newAccessToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TikTok OAuth error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
