import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { clientId, endpoint, params } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch connection
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ connected: false, data: null, error: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = connection.access_token;
    const pageId = connection.platform_page_id;
    const platformUserId = connection.platform_user_id;

    if (!accessToken || !pageId) {
      return new Response(JSON.stringify({ connected: false, data: null, error: 'Missing token or page ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine if this is a personal profile or organization
    // Personal profiles have platform_page_id === platform_user_id (the sub/person ID)
    const isPersonalProfile = pageId === platformUserId;
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Route endpoints
    if (endpoint === 'org-info') {
      if (isPersonalProfile) {
        // For personal profiles, use userinfo endpoint
        const response = await fetch('https://api.linkedin.com/v2/userinfo', { headers });
        const data = await response.json();

        if (!response.ok) {
          console.error('LinkedIn personal profile error:', data);
          return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ connected: true, data: { ...data, isPersonalProfile: true } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `https://api.linkedin.com/v2/organizations/${pageId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn org-info error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ connected: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (endpoint === 'followers') {
      if (isPersonalProfile) {
        // LinkedIn API doesn't expose follower/connection count for personal profiles
        // Return null so the UI can handle it gracefully
        return new Response(JSON.stringify({ connected: true, data: { totalFollowers: null, isPersonalProfile: true } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get follower statistics for organization
      const response = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${pageId}`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn followers error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let totalFollowers = 0;
      if (data.elements?.[0]?.followerCounts) {
        const counts = data.elements[0].followerCounts;
        totalFollowers = (counts.organicFollowerCount || 0) + (counts.paidFollowerCount || 0);
      }

      return new Response(JSON.stringify({ connected: true, data: { totalFollowers, raw: data } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (endpoint === 'posts') {
      const count = params?.count || 10;
      const authorUrn = isPersonalProfile
        ? `urn:li:person:${pageId}`
        : `urn:li:organization:${pageId}`;

      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${authorUrn})&count=${count}&sortBy=LAST_MODIFIED`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn posts error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ connected: true, data: { ...data, isPersonalProfile } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (endpoint === 'page-statistics') {
      if (isPersonalProfile) {
        // Page statistics are not available for personal profiles
        return new Response(JSON.stringify({ connected: true, data: null, isPersonalProfile: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${pageId}`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn page-statistics error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ connected: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ connected: true, data: null, error: `Unknown endpoint: ${endpoint}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn API error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
