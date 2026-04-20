import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIND_COACH_CLIENT_ID = "bfac1c16-0e02-4828-9744-1084309a9752";
const AVATAR_UPDATE_URL = "https://app.socialifycr.com/actualizar-foto";

function buildHtml(name: string, link: string): string {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 999px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 1px;">⚠️ URGENTE</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Actualiza tu foto de perfil</h1>
    </div>
    <p style="color: #1a1a2e; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Necesitamos que <strong>actualices tu foto de perfil</strong> en el dashboard de The Mind Coach lo antes posible.
    </p>
    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
      Tu foto ayuda a que el equipo te reconozca rápidamente en notificaciones, comisiones y reportes. Solo toma 30 segundos.
    </p>
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="${link}" style="display: inline-block; background: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 8px; text-decoration: none;">Actualizar mi foto ahora</a>
    </div>
    <p style="color: #999; font-size: 13px; line-height: 1.5; text-align: center; margin: 0 0 8px;">
      Si el botón no funciona, copia y pega este enlace:
    </p>
    <p style="color: #6366f1; font-size: 12px; text-align: center; word-break: break-all; margin: 0 0 32px;">
      ${link}
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">The Mind Coach · Powered by Socialify</p>
  </div>`;
}

function buildUnsubscribeFooter(url: string): string {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;max-width:600px;margin-left:auto;margin-right:auto;">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;font-family:Arial,sans-serif;">Si no deseas recibir más correos, puedes <a href="${url}" style="color:#9ca3af;text-decoration:underline;">desuscribirte aquí</a>.</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const tokenStr = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(tokenStr);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerUserId = claimsData.claims.sub;

  const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callerUserId);
  const isAdmin = callerRoles?.some((r: any) => r.role === "owner" || r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch ALL team members of The Mind Coach
    const { data: members, error: membersErr } = await supabaseAdmin
      .from("client_team_members")
      .select("user_id, profiles:user_id(id, email, full_name, avatar_url)")
      .eq("client_id", MIND_COACH_CLIENT_ID);

    if (membersErr) throw membersErr;

    const recipients = (members || [])
      .map((m: any) => m.profiles)
      .filter((p: any) => p && p.email);

    const subject = "🚨 URGENTE: Actualiza tu foto de perfil — The Mind Coach";
    let sentCount = 0;
    const results: any[] = [];

    for (const profile of recipients) {
      try {
        const firstName = (profile.full_name || "").split(" ")[0] || "";

        // Generate per-recipient unsubscribe token
        const unsubToken = crypto.randomUUID();
        await supabaseAdmin.from("email_unsubscribe_tokens").insert({
          token: unsubToken,
          email: profile.email.toLowerCase(),
        });
        const unsubUrl = `https://app.socialifycr.com/desuscribirse?token=${unsubToken}`;

        const html = buildHtml(firstName, AVATAR_UPDATE_URL) + buildUnsubscribeFooter(unsubUrl);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "The Mind Coach <notificaciones@socialifycr.com>",
            to: [profile.email],
            subject,
            html,
          }),
        });

        const data = await res.json();

        await supabaseAdmin.from("email_send_log").insert({
          recipient_email: profile.email,
          template_name: "mindcoach_avatar_urgent",
          status: res.ok ? "sent" : "failed",
          message_id: data?.id || null,
          error_message: res.ok ? null : JSON.stringify(data),
          metadata: { client_id: MIND_COACH_CLIENT_ID, sent_by: callerUserId, has_avatar: !!profile.avatar_url },
        });

        if (res.ok) sentCount++;
        results.push({ email: profile.email, ok: res.ok });
      } catch (err) {
        console.error(`Error sending to ${profile.email}:`, err);
        results.push({ email: profile.email, ok: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: recipients.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
