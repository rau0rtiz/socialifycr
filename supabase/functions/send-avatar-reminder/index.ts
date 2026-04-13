import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVATAR_UPDATE_URL = "https://socialifycr.lovable.app/actualizar-foto";

const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #6366f1; margin: 0; font-size: 28px;">Socialify</h2>
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0ff; display: inline-flex; align-items: center; justify-content: center;">
      <span style="font-size: 36px;">📸</span>
    </div>
  </div>
  <h1 style="color: #1a1a2e; font-size: 22px; text-align: center; margin-bottom: 16px;">
    ¡Agrega tu foto de perfil!
  </h1>
  <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 8px;">
    Tu equipo te reconocerá más fácil con una foto de perfil.
  </p>
  <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
    Solo toma unos segundos — haz click en el botón para actualizar tu foto ahora.
  </p>
  <div style="text-align: center; margin-bottom: 40px;">
    <a href="${AVATAR_UPDATE_URL}" style="display: inline-block; background: #6366f1; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
      Actualizar mi foto
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">
    Socialify · socialifycr.com
  </p>
</div>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Validate JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerUserId = claimsData.claims.sub;

  // Check caller is admin/owner
  const { data: callerRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerUserId);

  const isAdmin = callerRoles?.some((r: any) => r.role === "owner" || r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Get all user_ids from user_roles
    const { data: roleUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id");

    // 2. Get all user_ids from client_team_members
    const { data: teamUsers } = await supabaseAdmin
      .from("client_team_members")
      .select("user_id");

    // 3. Merge and deduplicate
    const allUserIds = new Set<string>();
    roleUsers?.forEach((r: any) => allUserIds.add(r.user_id));
    teamUsers?.forEach((r: any) => allUserIds.add(r.user_id));

    if (allUserIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No users found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get profiles without avatar
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", Array.from(allUserIds))
      .is("avatar_url", null);

    const usersToNotify = (profiles || []).filter((p: any) => p.email);

    let sentCount = 0;
    const subject = "Actualiza tu foto de perfil en Socialify";

    for (const profile of usersToNotify) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Socialify <notificaciones@socialifycr.com>",
            to: [profile.email],
            subject,
            html: emailHtml,
          }),
        });

        const data = await res.json();

        await supabaseAdmin.from("sent_emails").insert({
          recipient_email: profile.email,
          recipient_name: profile.full_name || null,
          subject,
          html_content: emailHtml,
          status: res.ok ? "sent" : "failed",
          resend_id: data?.id || null,
          error_message: res.ok ? null : JSON.stringify(data),
          source: "notification",
          sent_by: callerUserId,
        });

        if (res.ok) sentCount++;
      } catch (emailErr) {
        console.error(`Error sending to ${profile.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: usersToNotify.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
