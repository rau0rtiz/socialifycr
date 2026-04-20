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

    // Find campaigns scheduled for now or earlier
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

    const results: any[] = [];

    for (const campaign of campaigns) {
      // Mark as sending immediately to prevent double-dispatch
      const { error: lockErr } = await supabaseAdmin
        .from("email_campaigns")
        .update({ status: "sending" })
        .eq("id", campaign.id)
        .eq("status", "scheduled"); // optimistic lock

      if (lockErr) {
        console.error(`Lock failed for ${campaign.id}:`, lockErr);
        results.push({ id: campaign.id, ok: false, error: lockErr.message });
        continue;
      }

      // Invoke send-campaign with service-role auth
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        results.push({ id: campaign.id, ok: true, ...body });
      } catch (err: any) {
        console.error(`Dispatch failed for ${campaign.id}:`, err);
        await supabaseAdmin
          .from("email_campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, ok: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ dispatched: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Dispatcher error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
