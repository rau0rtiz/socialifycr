import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: campaigns, error } = await supabaseAdmin
      .from("email_campaigns")
      .select("id, name, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(20);

    if (error) throw error;

    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Dispatching ${campaigns.length} campaign(s)`);
    const results: any[] = [];

    for (const campaign of campaigns) {
      // Optimistic lock: mark as sending before invoking
      const { data: locked, error: lockErr } = await supabaseAdmin
        .from("email_campaigns")
        .update({ status: "sending" })
        .eq("id", campaign.id)
        .eq("status", "scheduled")
        .select("id");

      if (lockErr || !locked || locked.length === 0) {
        console.error(`[${campaign.id}] Lock failed:`, lockErr?.message);
        results.push({ id: campaign.id, ok: false, error: "lock_failed" });
        continue;
      }

      // Invoke send-campaign with service-role auth via direct fetch
      // (supabase.functions.invoke uses anon key which send-campaign rejects)
      try {
        console.log(`[${campaign.id}] Invoking send-campaign...`);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }

        console.log(`[${campaign.id}] send-campaign OK:`, body);
        results.push({ id: campaign.id, ok: true, ...body });
      } catch (err: any) {
        console.error(`[${campaign.id}] Dispatch failed:`, err?.message || err);
        await supabaseAdmin
          .from("email_campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, ok: false, error: err?.message || String(err) });
      }
    }

    return new Response(
      JSON.stringify({ dispatched: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Dispatcher top-level error:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
