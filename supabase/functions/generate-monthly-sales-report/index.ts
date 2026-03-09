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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get all clients with monthly_sales_report enabled
    const { data: flags, error: flagsErr } = await supabase
      .from("client_feature_flags")
      .select("client_id")
      .eq("monthly_sales_report", true);

    if (flagsErr) throw flagsErr;
    if (!flags || flags.length === 0) {
      return new Response(JSON.stringify({ message: "No clients with monthly reports enabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = lastMonth.toLocaleString("es-CR", { month: "long", year: "numeric" });

    const results = [];

    for (const flag of flags) {
      const clientId = flag.client_id;

      // Get client info
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      if (!client) continue;

      // Get sales for last month
      const { data: sales, error: salesErr } = await supabase
        .from("message_sales")
        .select("*")
        .eq("client_id", clientId)
        .gte("sale_date", lastMonth.toISOString().split("T")[0])
        .lte("sale_date", lastMonthEnd.toISOString().split("T")[0]);

      if (salesErr) {
        console.error(`Error fetching sales for ${clientId}:`, salesErr);
        continue;
      }

      // Calculate totals
      const totalCRC = (sales || [])
        .filter((s) => s.currency === "CRC")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const totalUSD = (sales || [])
        .filter((s) => s.currency === "USD")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const totalCount = (sales || []).length;

      // Group by source
      const bySource: Record<string, { count: number; crc: number; usd: number }> = {};
      for (const s of sales || []) {
        if (!bySource[s.source]) bySource[s.source] = { count: 0, crc: 0, usd: 0 };
        bySource[s.source].count++;
        if (s.currency === "CRC") bySource[s.source].crc += Number(s.amount);
        else bySource[s.source].usd += Number(s.amount);
      }

      // Build HTML email
      const sourceRows = Object.entries(bySource)
        .map(
          ([source, data]) =>
            `<tr><td style="padding:8px;border-bottom:1px solid #eee">${source}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${data.count}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${data.crc > 0 ? `₡${data.crc.toLocaleString("es-CR")}` : "-"}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${data.usd > 0 ? `$${data.usd.toLocaleString("en-US")}` : "-"}</td></tr>`
        )
        .join("");

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#1a1a1a;font-size:22px;margin-bottom:4px">Reporte de Ventas - ${client.name}</h1>
          <p style="color:#666;font-size:14px;margin-top:0">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</p>
          
          <div style="display:flex;gap:16px;margin:24px 0">
            <div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center">
              <p style="color:#666;font-size:12px;margin:0">Total Ventas</p>
              <p style="font-size:28px;font-weight:bold;margin:4px 0;color:#1a1a1a">${totalCount}</p>
            </div>
            ${totalCRC > 0 ? `<div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center"><p style="color:#666;font-size:12px;margin:0">Total CRC</p><p style="font-size:22px;font-weight:bold;margin:4px 0;color:#1a1a1a">₡${totalCRC.toLocaleString("es-CR")}</p></div>` : ""}
            ${totalUSD > 0 ? `<div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center"><p style="color:#666;font-size:12px;margin:0">Total USD</p><p style="font-size:22px;font-weight:bold;margin:4px 0;color:#1a1a1a">$${totalUSD.toLocaleString("en-US")}</p></div>` : ""}
          </div>

          ${
            Object.keys(bySource).length > 0
              ? `<table style="width:100%;border-collapse:collapse;font-size:14px">
                  <thead><tr style="background:#f9f9f9"><th style="padding:8px;text-align:left">Fuente</th><th style="padding:8px;text-align:center">Ventas</th><th style="padding:8px;text-align:right">CRC</th><th style="padding:8px;text-align:right">USD</th></tr></thead>
                  <tbody>${sourceRows}</tbody>
                </table>`
              : `<p style="color:#999;text-align:center;padding:24px">No se registraron ventas este mes.</p>`
          }

          <p style="color:#999;font-size:12px;margin-top:32px;text-align:center">
            Generado automáticamente por Socialify • ${new Date().toLocaleDateString("es-CR")}
          </p>
        </div>
      `;

      // Get recipients (account_managers and editors)
      const { data: members } = await supabase
        .from("client_team_members")
        .select("user_id, role, profiles:user_id(email, full_name)")
        .eq("client_id", clientId)
        .in("role", ["account_manager", "editor"]);

      // Also get admin users
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(email, full_name)")
        .in("role", ["owner", "admin"]);

      const recipientEmails = new Set<string>();
      const allRecipients = [...(members || []), ...(admins || [])];
      
      for (const r of allRecipients) {
        const profile = r.profiles as any;
        const email = profile?.email;
        if (email && !recipientEmails.has(email)) {
          recipientEmails.add(email);

          // Send email via Resend
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Socialify <notificaciones@socialifycr.com>",
              to: [email],
              subject: `📊 Reporte de Ventas - ${client.name} - ${monthName}`,
              html,
            }),
          });
        }
      }

      results.push({
        client: client.name,
        sales: totalCount,
        recipients: recipientEmails.size,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
