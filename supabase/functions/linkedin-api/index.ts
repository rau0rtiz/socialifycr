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
    const orgId = connection.platform_page_id;

    if (!accessToken || !orgId) {
      return new Response(JSON.stringify({ connected: false, data: null, error: 'Missing token or org ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // Route endpoints
    if (endpoint === 'org-info') {
      const response = await fetch(
        `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`,
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
      // Get follower statistics
      const response = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn followers error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract total followers
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
      // Fetch organization posts
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:organization:${orgId})&count=${count}&sortBy=LAST_MODIFIED`,
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('LinkedIn posts error:', data);
        return new Response(JSON.stringify({ connected: true, data: null, error: data.message || 'API error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ connected: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (endpoint === 'page-statistics') {
      // Fetch page statistics (views, unique visitors)
      const response = await fetch(
        `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}`,
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
