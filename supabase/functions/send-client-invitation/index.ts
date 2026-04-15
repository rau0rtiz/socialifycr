import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  clientId: string;
  email: string;
  role: "account_manager" | "editor" | "viewer";
  inviteeName?: string;
}

const PUBLIC_APP_URL = "https://app.socialifycr.com";

const FALLBACK_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invitación a {{client_name}}</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">{{greeting}}</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Has sido invitado a unirte a <strong>{{client_name}}</strong> como <strong>{{role}}</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link}}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Aceptar Invitación</a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Este enlace expira en 7 días.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">Socialify - Dashboard de Marketing</p>
  </div>
</body>
</html>`;

const FALLBACK_SUBJECT = "Invitación a {{client_name}} - Socialify";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const body: InviteRequest = await req.json();
    const { clientId, email, role, inviteeName } = body;

    if (!clientId || !email || !role) throw new Error("Missing required fields: clientId, email, role");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email format");

    const validRoles = ["account_manager", "media_buyer", "closer", "setter", "editor", "viewer"];
    if (!validRoles.includes(role)) throw new Error("Invalid role");

    const { data: hasAccess, error: accessError } = await supabaseClient.rpc("has_client_access", {
      _client_id: clientId, _user_id: user.id,
    });
    if (accessError || !hasAccess) throw new Error("You don't have permission to invite users to this client");

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients").select("name").eq("id", clientId).single();
    if (clientError || !client) throw new Error("Client not found");

    const { data: existingInvite } = await supabaseAdmin
      .from("client_invitations")
      .select("id, token")
      .eq("client_id", clientId)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    let token: string;

    if (existingInvite) {
      const { error: updateError } = await supabaseAdmin
        .from("client_invitations")
        .update({ role, invitee_name: inviteeName || null, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", existingInvite.id);
      if (updateError) throw updateError;
      token = existingInvite.token;
    } else {
      const { data: newInvite, error: insertError } = await supabaseAdmin
        .from("client_invitations")
        .insert({ client_id: clientId, email: email.toLowerCase(), role, invitee_name: inviteeName || null, invited_by: user.id })
        .select("token").single();
      if (insertError) throw insertError;
      token = newInvite.token;
    }

    const inviteLink = `${PUBLIC_APP_URL}/invitacion/${token}`;
    const roleLabels: Record<string, string> = {
      account_manager: "Account Manager", editor: "Editor", viewer: "Viewer",
    };

    // Fetch template from DB with fallback
    let htmlTemplate = FALLBACK_HTML;
    let subjectTemplate = FALLBACK_SUBJECT;

    try {
      const { data: tpl } = await supabaseAdmin
        .from("email_templates")
        .select("html_content, subject")
        .eq("slug", "invitation")
        .eq("status", "active")
        .single();

      if (tpl) {
        htmlTemplate = tpl.html_content;
        subjectTemplate = tpl.subject;
      }
    } catch { /* use fallback */ }

    const greeting = inviteeName ? `Hola ${inviteeName},` : "Hola,";

    const emailHtml = htmlTemplate
      .replace(/\{\{client_name\}\}/g, client.name)
      .replace(/\{\{greeting\}\}/g, greeting)
      .replace(/\{\{role\}\}/g, roleLabels[role] || role)
      .replace(/\{\{link\}\}/g, inviteLink);

    const emailSubject = subjectTemplate
      .replace(/\{\{client_name\}\}/g, client.name);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Socialify <invitaciones@socialifycr.com>",
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    });

    await supabaseAdmin.from("sent_emails").insert({
      recipient_email: email,
      recipient_name: inviteeName || null,
      subject: emailSubject,
      html_content: emailHtml,
      status: emailError ? "failed" : "sent",
      resend_id: emailData?.id || null,
      error_message: emailError?.message || null,
      source: "invitation",
      sent_by: user.id,
      client_id: clientId,
    });

    if (emailError) {
      return new Response(
        JSON.stringify({ success: true, inviteLink, emailSent: false, emailError: emailError.message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, inviteLink, emailSent: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-client-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
