import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICK_EMAIL = "vender@socialify.local";
const QUICK_PASSWORD = "QuickSeller!2026";
const FULL_NAME = "Vendedor Demo";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Find or create the user
    let userId: string | null = null;
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", QUICK_EMAIL)
      .maybeSingle();

    if (existing?.id) {
      userId = existing.id;
      // Reset password to make sure it's known
      await admin.auth.admin.updateUserById(userId, {
        password: QUICK_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: QUICK_EMAIL,
        password: QUICK_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: FULL_NAME },
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    if (!userId) throw new Error("No user id");

    // 2. Make sure profile has full_name
    await admin.from("profiles").upsert({
      id: userId,
      email: QUICK_EMAIL,
      full_name: FULL_NAME,
    });

    // 3. Assign system role 'setter' (idempotent)
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "setter" });
    if (roleErr && roleErr.code !== "23505") throw roleErr;

    // 4. Add as team member (setter) to ALL clients
    const { data: clients } = await admin.from("clients").select("id");
    let assigned = 0;
    for (const c of clients ?? []) {
      const { error } = await admin
        .from("client_team_members")
        .insert({ client_id: c.id, user_id: userId, role: "setter" });
      if (!error || error.code === "23505") assigned++;
      else console.warn("team insert err", c.id, error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: QUICK_EMAIL,
        clients_assigned: assigned,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("seed-quick-seller error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
