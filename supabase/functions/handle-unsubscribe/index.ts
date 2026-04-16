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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "POST") {
      const { token, reason } = await req.json();
      if (!token) {
        return new Response(JSON.stringify({ error: "Token requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token
      const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenErr || !tokenRecord) {
        return new Response(JSON.stringify({ error: "Token inválido o no encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenRecord.used_at) {
        return new Response(JSON.stringify({ error: "Ya te desuscribiste anteriormente", already_unsubscribed: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .update({ used_at: new Date().toISOString(), reason: reason || null })
        .eq("id", tokenRecord.id);

      // Update email_contacts if exists
      await supabaseAdmin
        .from("email_contacts")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason || null,
        })
        .eq("email", tokenRecord.email.toLowerCase());

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — validate token exists
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("email, used_at")
      .eq("token", token)
      .single();

    if (tokenErr || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      email: tokenRecord.email,
      already_used: !!tokenRecord.used_at,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("handle-unsubscribe error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
