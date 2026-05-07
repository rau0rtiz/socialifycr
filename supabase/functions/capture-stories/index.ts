import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function scanStoryImage(imageUrl: string, apiKey: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an OCR assistant that extracts sales-related information from Instagram story images. 
Extract any visible text that could be: customer name, phone number, brand/product name, price/amount, or any other sale-related info.
Use the provided tool to return structured data. If a field is not found, set it to null.
Focus on text overlays, captions, and any written content visible in the image.
Amounts should be numbers only (no currency symbols). Phone numbers should include only digits and dashes.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract any sales-related text from this Instagram story image:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_story_data",
              description: "Extract structured sales data from the story image text",
              parameters: {
                type: "object",
                properties: {
                  customer_name: { type: "string", description: "Customer name if visible", nullable: true },
                  customer_phone: { type: "string", description: "Phone number if visible", nullable: true },
                  brand: { type: "string", description: "Brand or product name if visible", nullable: true },
                  amount: { type: "number", description: "Price or amount if visible (number only)", nullable: true },
                  notes: { type: "string", description: "Any other relevant text from the image", nullable: true },
                },
                required: ["customer_name", "customer_phone", "brand", "amount", "notes"],
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_story_data" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`AI scan failed (${response.status}):`, errText);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      // Only return if at least one field has a value
      const hasValue = Object.values(parsed).some(v => v !== null && v !== undefined && v !== "");
      return hasValue ? parsed : null;
    }
    return null;
  } catch (err) {
    console.warn("AI scan error:", err);
    return null;
  }
}

async function persistThumbnail(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  storyId: string,
  sourceUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.warn(`Could not fetch thumbnail for ${storyId}: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${clientId}/${storyId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("story-thumbnails")
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) {
      console.warn(`Upload failed for ${storyId}:`, upErr.message);
      return null;
    }
    const { data: pub } = supabase.storage.from("story-thumbnails").getPublicUrl(path);
    return pub.publicUrl;
  } catch (err) {
    console.warn(`persistThumbnail error for ${storyId}:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
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

    const results: { clientId: string; captured: number; scanned: number; error?: string }[] = [];

    for (const conn of connections || []) {
      try {
        const accessToken = conn.refresh_token || conn.access_token;
        if (!accessToken || !conn.instagram_account_id) {
          results.push({ clientId: conn.client_id, captured: 0, scanned: 0, error: "Missing credentials" });
          continue;
        }

        // Fetch active stories
        const storiesUrl = `https://graph.facebook.com/v21.0/${conn.instagram_account_id}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`;
        const storiesRes = await fetch(storiesUrl);
        const storiesData = await storiesRes.json();

        if (storiesData.error) {
          console.error(`Meta API error for client ${conn.client_id}:`, storiesData.error);
          results.push({ clientId: conn.client_id, captured: 0, scanned: 0, error: storiesData.error.message });
          continue;
        }

        const stories = storiesData.data || [];
        console.log(`Client ${conn.client_id}: Found ${stories.length} active stories`);

        let capturedCount = 0;
        let scannedCount = 0;

        for (const story of stories) {
          // Fetch insights for this story
          let insights = { impressions: 0, reach: 0, replies: 0, exits: 0, taps_forward: 0, taps_back: 0 };
          
          try {
            const insightsUrl = `https://graph.facebook.com/v21.0/${story.id}/insights?metric=impressions,reach,replies,exits,taps_forward,taps_back&access_token=${accessToken}`;
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

          // Check if this story already has scanned_data and persistent thumbnail
          const { data: existingStory } = await supabase
            .from("archived_stories")
            .select("id, scanned_data, persistent_thumbnail_url")
            .eq("client_id", conn.client_id)
            .eq("story_id", story.id)
            .maybeSingle();

          // Scan the image with AI if we have an API key and haven't scanned yet
          let scannedData = existingStory?.scanned_data || null;
          const imageUrl = story.thumbnail_url || story.media_url;
          if (lovableApiKey && !scannedData && imageUrl) {
            console.log(`Scanning story ${story.id} with AI...`);
            scannedData = await scanStoryImage(imageUrl, lovableApiKey);
            if (scannedData) {
              scannedCount++;
              console.log(`Story ${story.id} scanned:`, scannedData);
            }
          }

          // Persist thumbnail to storage (only once per story)
          let persistentUrl: string | null = existingStory?.persistent_thumbnail_url || null;
          if (!persistentUrl && imageUrl) {
            persistentUrl = await persistThumbnail(supabase, conn.client_id, story.id, imageUrl);
          }

          // Scan the image with AI if we have an API key and haven't scanned yet
          let scannedData = existingStory?.scanned_data || null;
          const imageUrl = story.media_url || story.thumbnail_url;
          if (lovableApiKey && !scannedData && imageUrl) {
            console.log(`Scanning story ${story.id} with AI...`);
            scannedData = await scanStoryImage(imageUrl, lovableApiKey);
            if (scannedData) {
              scannedCount++;
              console.log(`Story ${story.id} scanned:`, scannedData);
            }
          }

          // Upsert story (update if exists, insert if new)
          const upsertPayload: Record<string, unknown> = {
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
          };

          // Only set scanned_data if we have new data
          if (scannedData) {
            upsertPayload.scanned_data = scannedData;
          }

          const { error: upsertError } = await supabase
            .from("archived_stories")
            .upsert(upsertPayload, {
              onConflict: "client_id,story_id",
            });

          if (upsertError) {
            console.error(`Error upserting story ${story.id}:`, upsertError);
          } else {
            capturedCount++;
          }
        }

        results.push({ clientId: conn.client_id, captured: capturedCount, scanned: scannedCount });
      } catch (clientErr) {
        console.error(`Error processing client ${conn.client_id}:`, clientErr);
        results.push({ 
          clientId: conn.client_id, 
          captured: 0, 
          scanned: 0,
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
