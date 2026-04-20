import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ─── POST: process unsubscription ─────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const token: string | undefined = body.token;
      const emailFromBody: string | undefined = body.email;
      const reason: string | null = body.reason || null;

      // Resolve target email — prefer token lookup, fall back to body email
      let resolvedEmail: string | null = null;
      let tokenRecord: any = null;

      if (token) {
        const { data } = await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .select("*")
          .eq("token", token)
          .maybeSingle();
        if (data) {
          tokenRecord = data;
          resolvedEmail = data.email;
        }
      }

      if (!resolvedEmail && emailFromBody) {
        resolvedEmail = emailFromBody.trim().toLowerCase();
      }

      if (!resolvedEmail) {
        return json(400, { error: "No se pudo identificar el correo a desuscribir." });
      }

      const normalizedEmail = resolvedEmail.trim().toLowerCase();

      // Already suppressed? Treat as success.
      const { data: existingSuppression } = await supabaseAdmin
        .from("suppressed_emails")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingSuppression) {
        return json(200, { already_unsubscribed: true, email: normalizedEmail });
      }

      // Mark token as used (best-effort)
      if (tokenRecord && !tokenRecord.used_at) {
        await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .update({ used_at: new Date().toISOString(), reason })
          .eq("id", tokenRecord.id);
      }

      // Insert into suppression list — global block across all flows
      const { error: suppressErr } = await supabaseAdmin
        .from("suppressed_emails")
        .insert({
          email: normalizedEmail,
          reason: "unsubscribe",
          metadata: { reason_text: reason, source: "unsubscribe_page" },
        });

      if (suppressErr && !suppressErr.message.includes("duplicate")) {
        console.error("[handle-unsubscribe] suppression insert error:", suppressErr);
      }

      // Update email_contacts (best-effort across all clients)
      await supabaseAdmin
        .from("email_contacts")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: reason,
        })
        .eq("email", normalizedEmail);

      return json(200, { success: true, email: normalizedEmail });
    }

    // ─── GET: validate token + return prefill email ───────────────────
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const emailParam = url.searchParams.get("email");

    let email: string | null = null;
    let alreadyUsed = false;

    if (token) {
      const { data } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("email, used_at")
        .eq("token", token)
        .maybeSingle();
      if (data) {
        email = data.email;
        alreadyUsed = !!data.used_at;
      }
    }

    if (!email && emailParam) {
      email = emailParam.trim().toLowerCase();
    }

    if (!email) {
      return json(400, { error: "Falta token o correo en el enlace." });
    }

    // Check suppression
    const { data: suppression } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    return json(200, {
      valid: true,
      email,
      already_used: alreadyUsed || !!suppression,
    });
  } catch (error) {
    console.error("[handle-unsubscribe] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json(500, { error: msg });
  }
});
