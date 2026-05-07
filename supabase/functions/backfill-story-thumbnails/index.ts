import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function persistThumbnail(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  storyId: string,
  sourceUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${clientId}/${storyId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("story-thumbnails")
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) return null;
    const { data: pub } = supabase.storage.from("story-thumbnails").getPublicUrl(path);
    return pub.publicUrl;
  } catch {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.client_id;

    let query = supabase
      .from("archived_stories")
      .select("id, client_id, story_id, thumbnail_url, media_url")
      .is("persistent_thumbnail_url", null)
      .order("timestamp", { ascending: false })
      .limit(200);

    if (clientId) query = query.eq("client_id", clientId);

    const { data: rows, error } = await query;
    if (error) throw error;

    let processed = 0;
    let succeeded = 0;
    for (const row of rows || []) {
      const src = row.thumbnail_url || row.media_url;
      if (!src) continue;
      processed++;
      const url = await persistThumbnail(supabase, row.client_id, row.story_id, src);
      if (url) {
        await supabase
          .from("archived_stories")
          .update({ persistent_thumbnail_url: url })
          .eq("id", row.id);
        succeeded++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, succeeded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
