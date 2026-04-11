import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper: verify JWT and return user (uses getClaims for Lovable Cloud compatibility)
async function verifyAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization header' };
  }
  const token = authHeader.replace('Bearer ', '');
  
  // Try getClaims first (works with Lovable Cloud signing keys)
  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (!claimsError && claimsData?.claims?.sub) {
      return { user: { id: claimsData.claims.sub as string }, error: null };
    }
  } catch {}
  
  // Fallback to getUser
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

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (action === 'authorize') {
      // Generate OAuth authorization URL
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      if (!clientId || !redirectUri) {
        return new Response(JSON.stringify({ error: 'Missing client_id or redirect_uri' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const scopes = [
        'pages_read_engagement',
        'pages_show_list',
        'instagram_basic',
        'instagram_manage_insights',
        'ads_read',
        'business_management',
        'pages_read_user_content'
      ].join(',');

      const state = JSON.stringify({ clientId, timestamp: Date.now() });
      const encodedState = btoa(state);

      const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${encodedState}` +
        `&response_type=code`;

      console.log('Generated auth URL for client:', clientId);

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch accounts without saving - requires authentication
    if (action === 'fetch-accounts') {
      // Verify JWT
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: authError }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { code, redirectUri, clientId } = body;

      if (!code || !redirectUri || !clientId) {
        return new Response(JSON.stringify({ error: 'Missing code, redirectUri, or clientId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has access to this client
      const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Fetching accounts for client:', clientId);

      // Exchange code for short-lived token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${META_APP_SECRET}` +
        `&code=${code}`
      );

      const tokenData = await tokenResponse.json();
      console.log('Token exchange completed');

      if (tokenData.error) {
        console.error('Token exchange error:', tokenData.error);
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange for long-lived token
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`
      );

      const longLivedData = await longLivedResponse.json();
      console.log('Long-lived token received');

      if (longLivedData.error) {
        console.error('Long-lived token error:', longLivedData.error);
        return new Response(JSON.stringify({ error: longLivedData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = longLivedData.access_token;
      const expiresIn = longLivedData.expires_in || 5184000;

      // Get user's pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}&limit=100`
      );
      const pagesData = await pagesResponse.json();
      console.log('Pages fetched:', pagesData.data?.length || 0);

      // Get Instagram accounts linked to pages
      const instagramAccounts: any[] = [];
      if (pagesData.data) {
        // Fetch all Instagram accounts in parallel for speed
        const igResults = await Promise.all(
          pagesData.data.map(async (page: any) => {
            try {
              const igResponse = await fetch(
                `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
              );
              const igData = await igResponse.json();
              if (igData.instagram_business_account) {
                return {
                  pageId: page.id,
                  pageName: page.name,
                  instagramId: igData.instagram_business_account.id,
                  pageAccessToken: page.access_token
                };
              }
            } catch (e) {
              console.error(`Error fetching IG for page ${page.id}:`, e);
            }
            return null;
          })
        );
        instagramAccounts.push(...igResults.filter(Boolean));
      }
      console.log('Instagram accounts found:', instagramAccounts.length);

      // Get ad accounts with names
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}&limit=100`
      );
      const adAccountsData = await adAccountsResponse.json();
      console.log('Ad accounts fetched:', adAccountsData.data?.length || 0);

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Return accounts data for user selection (don't save yet)
      return new Response(JSON.stringify({
        success: true,
        accounts: {
          pages: pagesData.data?.map((p: any) => ({ 
            id: p.id, 
            name: p.name, 
            access_token: p.access_token 
          })) || [],
          instagramAccounts,
          adAccounts: adAccountsData.data?.map((a: any) => ({ 
            id: a.id, 
            name: a.name || `Ad Account ${a.id}` 
          })) || [],
          accessToken,
          tokenExpiresAt
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save selected accounts to database (requires authentication)
    if (action === 'save-connection') {
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: authError }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { clientId, pageId, pageName, pageAccessToken, instagramId, adAccountId, tokenExpiresAt, accessToken } = body;

      if (!clientId || !pageId || !pageName || !pageAccessToken) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has access to this client
      const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Saving connection for client:', clientId, 'page:', pageName);

      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .maybeSingle();

      const connectionData = {
        client_id: clientId,
        platform: 'meta',
        access_token: accessToken || pageAccessToken,
        refresh_token: pageAccessToken,
        status: 'active',
        platform_page_id: pageId,
        platform_page_name: pageName,
        instagram_account_id: instagramId || null,
        ad_account_id: adAccountId || null,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingConnection) {
        result = await supabase
          .from('platform_connections')
          .update(connectionData)
          .eq('id', existingConnection.id)
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
        console.error('Database error:', result.error);
        return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Connection saved successfully');

      return new Response(JSON.stringify({
        success: true,
        connection: {
          id: result.data.id,
          platform: 'meta',
          pageName,
          instagramId,
          adAccountId
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meta-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
