import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting story capture process...");

    // Get all active Meta connections
    const { data: connections, error: connError } = await supabase
      .from("platform_connections")
      .select("client_id, access_token, instagram_account_id, refresh_token")
      .eq("platform", "meta")
      .eq("status", "active")
      .not("instagram_account_id", "is", null);

    if (connError) {
      throw new Error(`Error fetching connections: ${connError.message}`);
    }

    console.log(`Found ${connections?.length || 0} active Meta connections`);

    const results: { clientId: string; captured: number; error?: string }[] = [];

    for (const conn of connections || []) {
      try {
        const accessToken = conn.refresh_token || conn.access_token;
        if (!accessToken || !conn.instagram_account_id) {
          results.push({ clientId: conn.client_id, captured: 0, error: "Missing credentials" });
          continue;
        }

        // Fetch active stories
        const storiesUrl = `https://graph.facebook.com/v18.0/${conn.instagram_account_id}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`;
        const storiesRes = await fetch(storiesUrl);
        const storiesData = await storiesRes.json();

        if (storiesData.error) {
          console.error(`Meta API error for client ${conn.client_id}:`, storiesData.error);
          results.push({ clientId: conn.client_id, captured: 0, error: storiesData.error.message });
          continue;
        }

        const stories = storiesData.data || [];
        console.log(`Client ${conn.client_id}: Found ${stories.length} active stories`);

        let capturedCount = 0;

        for (const story of stories) {
          // Fetch insights for this story
          let insights = { impressions: 0, reach: 0, replies: 0, exits: 0, taps_forward: 0, taps_back: 0 };
          
          try {
            const insightsUrl = `https://graph.facebook.com/v18.0/${story.id}/insights?metric=impressions,reach,replies,exits,taps_forward,taps_back&access_token=${accessToken}`;
            const insightsRes = await fetch(insightsUrl);
            const insightsData = await insightsRes.json();

            if (insightsData.data) {
              for (const metric of insightsData.data) {
                const value = metric.values?.[0]?.value || 0;
                switch (metric.name) {
                  case "impressions": insights.impressions = value; break;
                  case "reach": insights.reach = value; break;
                  case "replies": insights.replies = value; break;
                  case "exits": insights.exits = value; break;
                  case "taps_forward": insights.taps_forward = value; break;
                  case "taps_back": insights.taps_back = value; break;
                }
              }
            }
          } catch (insightErr) {
            console.warn(`Could not fetch insights for story ${story.id}:`, insightErr);
          }

          // Upsert story (update if exists, insert if new)
          const { error: upsertError } = await supabase
            .from("archived_stories")
            .upsert({
              client_id: conn.client_id,
              story_id: story.id,
              media_type: story.media_type,
              media_url: story.media_url,
              thumbnail_url: story.thumbnail_url,
              permalink: story.permalink,
              timestamp: story.timestamp,
              impressions: insights.impressions,
              reach: insights.reach,
              replies: insights.replies,
              exits: insights.exits,
              taps_forward: insights.taps_forward,
              taps_back: insights.taps_back,
              captured_at: new Date().toISOString(),
            }, {
              onConflict: "client_id,story_id",
            });

          if (upsertError) {
            console.error(`Error upserting story ${story.id}:`, upsertError);
          } else {
            capturedCount++;
          }
        }

        results.push({ clientId: conn.client_id, captured: capturedCount });
      } catch (clientErr) {
        console.error(`Error processing client ${conn.client_id}:`, clientErr);
        results.push({ 
          clientId: conn.client_id, 
          captured: 0, 
          error: clientErr instanceof Error ? clientErr.message : "Unknown error" 
        });
      }
    }

    console.log("Story capture complete:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Story capture completed",
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in capture-stories:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
