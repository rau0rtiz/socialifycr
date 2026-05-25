import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://app.socialifycr.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, full_name, role = "admin" } = await req.json();
    if (!email) throw new Error("email requerido");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Find or create user
    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let actionLink: string | null = null;
    let isNew = false;

    if (existing) {
      userId = existing.id;
      // Send recovery link so they can set/reset password
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${APP_URL}/reset-password` },
      });
      if (error) throw error;
      actionLink = data.properties?.action_link ?? null;
    } else {
      // Create user with random password and send invite link
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (createErr) throw createErr;
      userId = created.user.id;
      isNew = true;

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${APP_URL}/reset-password` },
      });
      if (error) throw error;
      actionLink = data.properties?.action_link ?? null;
    }

    if (!userId) throw new Error("No se pudo resolver user_id");

    // 2. Assign system role (ignore duplicates)
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (roleErr && roleErr.code !== "23505") throw roleErr;

    // 3. Send branded email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado");

    const subject = "🔑 Tu acceso a Socialify está listo";
    const greeting = full_name ? `¡Bienvenida, ${full_name}!` : "¡Bienvenida a Socialify!";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background:#ffffff;">
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">${greeting} 🎉</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Se te ha dado acceso como <strong>administradora de la agencia</strong> en la plataforma de Socialify.
          Vas a tener acceso a todas las herramientas internas: clientes, comunicaciones, accesos, frameworks, CRM y finanzas.
        </p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Hacé clic en el botón de abajo para ${isNew ? "crear" : "restablecer"} tu contraseña e ingresar:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${actionLink}"
             style="background-color: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            ${isNew ? "Crear mi contraseña" : "Restablecer contraseña"}
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          Este link expira en 24 horas. Si no esperabas este correo, podés ignorarlo.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">Socialify — Marketing Intelligence Platform</p>
      </div>
    `;

    const { data: emailRecord } = await supabaseAdmin.from("sent_emails").insert({
      recipient_email: email,
      subject,
      html_content: html,
      source: "agency_admin_invite",
      status: "pending",
    }).select("id").single();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Raúl Ortiz <notificaciones@socialifycr.com>",
        to: [email],
        subject,
        html,
      }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(resData));

    if (emailRecord?.id) {
      await supabaseAdmin.from("sent_emails").update({
        status: "sent",
        resend_id: resData?.id || null,
      }).eq("id", emailRecord.id);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, is_new: isNew }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("invite-agency-admin error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
