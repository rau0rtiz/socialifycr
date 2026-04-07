import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID');
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET');
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

    console.log(`LinkedIn OAuth action: ${action}`);

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      throw new Error('LinkedIn credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Action: Generate authorization URL
    if (action === 'authorize') {
      const { redirectUri, clientId } = await req.json();

      const state = btoa(JSON.stringify({ clientId }));

      // OpenID Connect + Organization read scopes
      const scopes = [
        'openid',
        'profile',
        'email',
        'r_organization_social',
        'rw_organization_admin',
      ];

      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('state', state);

      console.log('Generated LinkedIn auth URL');

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Exchange code for tokens and fetch organizations
    if (action === 'fetch-accounts') {
      const { user, error: authError } = await verifyAuth(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: authError }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { code, redirectUri, clientId } = await req.json();

      const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Exchanging LinkedIn authorization code for tokens');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Token exchange error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;
      // LinkedIn doesn't always provide refresh tokens for 3-legged OAuth
      const refreshToken = tokenData.refresh_token || null;

      console.log('Successfully obtained LinkedIn tokens');

      // Fetch user profile (sub from OpenID)
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileResponse.json();
      const linkedInUserId = profileData.sub;
      const userName = profileData.name || profileData.email || 'Unknown';
      const userPicture = profileData.picture || null;

      console.log(`LinkedIn user: ${userName} (${linkedInUserId})`);

      // Build accounts list starting with personal profile
      const accounts: any[] = [];

      // Add personal profile option
      accounts.push({
        id: linkedInUserId,
        urn: `urn:li:person:${linkedInUserId}`,
        name: userName,
        logoUrl: userPicture,
        type: 'personal',
      });

      // Fetch organizations the user is admin of
      const orgsResponse = await fetch(
        `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,logoV2(original~:playableStreams))))`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const orgsData = await orgsResponse.json();

      if (orgsData.elements) {
        for (const el of orgsData.elements) {
          const org = el['organization~'];
          if (org) {
            let logoUrl: string | null = null;
            try {
              const original = org?.['logoV2']?.['original~'];
              if (original?.elements?.[0]?.identifiers?.[0]?.identifier) {
                logoUrl = original.elements[0].identifiers[0].identifier;
              }
            } catch (_) {}

            accounts.push({
              id: org.id.toString(),
              urn: `urn:li:organization:${org.id}`,
              name: org.localizedName,
              logoUrl,
              type: 'organization',
            });
          }
        }
      }

      console.log(`Found ${accounts.length} LinkedIn accounts (1 personal + ${accounts.length - 1} orgs)`);

      return new Response(JSON.stringify({
        accounts,
        accessToken,
        refreshToken,
        expiresIn,
        clientId,
        userId: linkedInUserId,
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

      const { clientId, orgId, orgName, accessToken, refreshToken, expiresIn, userId } = await req.json();

      const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
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
        .eq('platform', 'linkedin')
        .maybeSingle();

      const connectionData = {
        client_id: clientId,
        platform: 'linkedin',
        platform_user_id: userId || null,
        platform_page_id: orgId,
        platform_page_name: orgName,
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

      console.log(`LinkedIn connection saved for client ${clientId}`);

      return new Response(JSON.stringify({ success: true, connection: result.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
