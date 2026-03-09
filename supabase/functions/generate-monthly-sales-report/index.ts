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

      // Get client context for AI analysis
      const { data: clientFull } = await supabase
        .from("clients")
        .select("name, industry, ai_context")
        .eq("id", clientId)
        .single();

      // Get previous month sales for comparison
      const prevMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1);
      const prevMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 0);
      const { data: prevSales } = await supabase
        .from("message_sales")
        .select("amount, currency, source, status")
        .eq("client_id", clientId)
        .gte("sale_date", prevMonth.toISOString().split("T")[0])
        .lte("sale_date", prevMonthEnd.toISOString().split("T")[0]);

      const prevCompleted = (prevSales || []).filter((s) => !s.status || s.status === "completed");
      const prevTotalCRC = prevCompleted.filter((s) => s.currency === "CRC").reduce((sum, s) => sum + Number(s.amount), 0);
      const prevTotalUSD = prevCompleted.filter((s) => s.currency === "USD").reduce((sum, s) => sum + Number(s.amount), 0);
      const prevCount = prevCompleted.length;

      const pctChange = (cur: number, prev: number) => {
        if (prev === 0) return cur > 0 ? "+100%" : "0%";
        const pct = Math.round(((cur - prev) / prev) * 100);
        return pct > 0 ? `+${pct}%` : `${pct}%`;
      };

      // Determine key points
      const crcChange = totalCRC - prevTotalCRC;
      const usdChange = totalUSD - prevTotalUSD;
      const countChangeNum = totalCount - prevCount;

      // Build AI analysis if API key available
      let aiAnalysis = '';
      if (lovableApiKey && totalCount > 0) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { 
                  role: 'system', 
                  content: `Eres un consultor de ventas. Genera un análisis breve en HTML (usa <h3>, <p>, <ul>, <li>, <strong>) siguiendo esta estructura exacta:
1. KPIs Clave: Los 3-4 KPIs más importantes para este tipo de negocio
2. Puntos Importantes: Qué va bien (🟢) y qué preocupa (🔴)  
3. Diagnóstico: Si algo va mal, explica por qué y cómo mejorar
4. Plan de Acción: 3-5 acciones concretas priorizadas
Sé directo, honesto y accionable. Español. Máximo 500 palabras.`
                },
                {
                  role: 'user',
                  content: `Cliente: ${client.name}, Industria: ${clientFull?.industry || 'No especificada'}, Contexto: ${clientFull?.ai_context || 'N/A'}
Ventas ${monthName}: ${totalCount} (anterior: ${prevCount}, cambio: ${pctChange(totalCount, prevCount)})
CRC: ₡${totalCRC.toLocaleString("es-CR")} (anterior: ₡${prevTotalCRC.toLocaleString("es-CR")}, cambio: ${pctChange(totalCRC, prevTotalCRC)})
USD: $${totalUSD.toLocaleString("en-US")} (anterior: $${prevTotalUSD.toLocaleString("en-US")}, cambio: ${pctChange(totalUSD, prevTotalUSD)})
Por fuente: ${JSON.stringify(bySource)}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1500,
            }),
          });
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content || '';
          }
        } catch (aiErr) {
          console.error('AI analysis failed, continuing without it:', aiErr);
        }
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
          
          <!-- Contexto -->
          <div style="background:#f0f4ff;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:4px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#333"><strong>🏢 Contexto:</strong> ${clientFull?.industry ? `Industria: ${clientFull.industry}.` : ''} ${clientFull?.ai_context ? clientFull.ai_context.substring(0, 200) : 'Reporte mensual de ventas por mensajería.'}</p>
          </div>

          <!-- KPIs -->
          <div style="display:flex;gap:16px;margin:24px 0">
            <div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center">
              <p style="color:#666;font-size:12px;margin:0">Total Ventas</p>
              <p style="font-size:28px;font-weight:bold;margin:4px 0;color:#1a1a1a">${totalCount}</p>
              <p style="font-size:11px;margin:0;color:${countChangeNum >= 0 ? '#16a34a' : '#dc2626'}">${pctChange(totalCount, prevCount)} vs mes anterior</p>
            </div>
            ${totalCRC > 0 ? `<div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center"><p style="color:#666;font-size:12px;margin:0">Total CRC</p><p style="font-size:22px;font-weight:bold;margin:4px 0;color:#1a1a1a">₡${totalCRC.toLocaleString("es-CR")}</p><p style="font-size:11px;margin:0;color:${crcChange >= 0 ? '#16a34a' : '#dc2626'}">${pctChange(totalCRC, prevTotalCRC)} vs mes anterior</p></div>` : ""}
            ${totalUSD > 0 ? `<div style="flex:1;background:#f5f5f5;border-radius:8px;padding:16px;text-align:center"><p style="color:#666;font-size:12px;margin:0">Total USD</p><p style="font-size:22px;font-weight:bold;margin:4px 0;color:#1a1a1a">$${totalUSD.toLocaleString("en-US")}</p><p style="font-size:11px;margin:0;color:${usdChange >= 0 ? '#16a34a' : '#dc2626'}">${pctChange(totalUSD, prevTotalUSD)} vs mes anterior</p></div>` : ""}
          </div>

          <!-- Desglose por fuente -->
          ${
            Object.keys(bySource).length > 0
              ? `<h3 style="font-size:15px;margin:24px 0 8px">📊 Desglose por Fuente</h3>
                 <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <thead><tr style="background:#f9f9f9"><th style="padding:8px;text-align:left">Fuente</th><th style="padding:8px;text-align:center">Ventas</th><th style="padding:8px;text-align:right">CRC</th><th style="padding:8px;text-align:right">USD</th></tr></thead>
                  <tbody>${sourceRows}</tbody>
                </table>`
              : `<p style="color:#999;text-align:center;padding:24px">No se registraron ventas este mes.</p>`
          }

          <!-- AI Analysis -->
          ${aiAnalysis ? `
          <div style="margin-top:28px;padding:20px;background:#fafafa;border-radius:8px;border:1px solid #e5e5e5">
            <h3 style="font-size:15px;margin:0 0 12px;color:#1a1a1a">🤖 Análisis Inteligente</h3>
            ${aiAnalysis}
          </div>
          ` : `
          <!-- Manual key points when AI is not available -->
          ${totalCount > 0 ? `
          <div style="margin-top:28px;padding:16px;background:#fafafa;border-radius:8px">
            <h3 style="font-size:15px;margin:0 0 8px">🟢🔴 Puntos Importantes</h3>
            <ul style="margin:0;padding-left:20px;font-size:13px;color:#333">
              ${countChangeNum > 0 ? `<li>🟢 Ventas subieron ${pctChange(totalCount, prevCount)} respecto al mes anterior</li>` : ''}
              ${countChangeNum < 0 ? `<li>🔴 Ventas bajaron ${pctChange(totalCount, prevCount)} respecto al mes anterior</li>` : ''}
              ${crcChange > 0 ? `<li>🟢 Ingresos CRC crecieron ${pctChange(totalCRC, prevTotalCRC)}</li>` : ''}
              ${crcChange < 0 ? `<li>🔴 Ingresos CRC bajaron ${pctChange(totalCRC, prevTotalCRC)}</li>` : ''}
              ${Object.keys(bySource).length > 1 ? `<li>💡 Fuente principal: ${Object.entries(bySource).sort((a, b) => b[1].count - a[1].count)[0][0]}</li>` : ''}
            </ul>
          </div>
          ` : ''}
          `}

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
