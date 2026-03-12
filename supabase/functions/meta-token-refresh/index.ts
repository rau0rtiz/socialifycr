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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find connections expiring in the next 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiringConnections, error: fetchError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .lt('token_expires_at', sevenDaysFromNow);

    if (fetchError) {
      console.error('Error fetching expiring connections:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringConnections?.length || 0} connections to refresh`);

    const results = {
      refreshed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const connection of expiringConnections || []) {
      try {
        console.log(`Refreshing token for connection ${connection.id}`);

        // Try to exchange current token for a new long-lived token
        const response = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token` +
          `&client_id=${META_APP_ID}` +
          `&client_secret=${META_APP_SECRET}` +
          `&fb_exchange_token=${connection.access_token}`
        );

        const data = await response.json();

        if (data.error) {
          console.error(`Failed to refresh token for ${connection.id}:`, data.error);
          
          // Mark as expired if refresh fails
          await supabase
            .from('platform_connections')
            .update({ 
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id);
          
          results.failed++;
          results.errors.push(`${connection.id}: ${data.error.message}`);
          continue;
        }

        // Update with new token
        const expiresIn = data.expires_in || 5184000;
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        await supabase
          .from('platform_connections')
          .update({
            access_token: data.access_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);

        console.log(`Successfully refreshed token for ${connection.id}`);
        results.refreshed++;

      } catch (err) {
        console.error(`Error refreshing connection ${connection.id}:`, err);
        results.failed++;
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${connection.id}: ${errMessage}`);
      }
    }

    console.log('Token refresh complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meta-token-refresh:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});