import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    // ---- POST: process unsubscription ----
    if (req.method === "POST") {
      const { token, reason } = await req.json();
      console.log("[handle-unsubscribe] POST received, token:", token?.slice(0, 8));

      if (!token) {
        return new Response(JSON.stringify({ error: "Token requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (tokenErr) {
        console.error("[handle-unsubscribe] DB error:", tokenErr);
        return new Response(JSON.stringify({ error: "Error al validar token" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!tokenRecord) {
        console.warn("[handle-unsubscribe] Token not found");
        return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenRecord.used_at) {
        console.log("[handle-unsubscribe] Token already used:", tokenRecord.email);
        return new Response(JSON.stringify({
          already_unsubscribed: true,
          email: tokenRecord.email,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used
      const { error: updateTokenErr } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .update({ used_at: new Date().toISOString(), reason: reason || null })
        .eq("id", tokenRecord.id);

      if (updateTokenErr) {
        console.error("[handle-unsubscribe] Failed to mark token used:", updateTokenErr);
      }

      // Update email_contacts (best-effort; not all emails may be in the contacts table)
      const { error: contactErr } = await supabaseAdmin
        .from("email_contacts")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason || null,
        })
        .eq("email", tokenRecord.email.toLowerCase());

      if (contactErr) {
        console.warn("[handle-unsubscribe] email_contacts update warning:", contactErr.message);
      }

      console.log("[handle-unsubscribe] Successfully unsubscribed:", tokenRecord.email);

      return new Response(JSON.stringify({
        success: true,
        email: tokenRecord.email,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- GET: validate token + return email ----
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    console.log("[handle-unsubscribe] GET received, token:", token?.slice(0, 8));

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
      .maybeSingle();

    if (tokenErr) {
      console.error("[handle-unsubscribe] GET DB error:", tokenErr);
      return new Response(JSON.stringify({ error: "Error al validar token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokenRecord) {
      console.warn("[handle-unsubscribe] GET Token not found");
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
    console.error("[handle-unsubscribe] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
