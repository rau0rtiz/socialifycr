import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing email configuration");
    }

    const { name, email, business_level } = await req.json();
    if (!name || !email || !business_level) {
      return new Response(JSON.stringify({ error: "name, email, and business_level are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch template
    const { data: template, error: tplErr } = await supabaseAdmin
      .from("email_templates")
      .select("html_content, subject")
      .eq("slug", "funnel-result")
      .eq("status", "active")
      .single();

    if (tplErr || !template) {
      throw new Error("Email template 'funnel-result' not found");
    }

    const levelData = [
      { name: 'Idea', desc: 'Tu estrategia de marketing digital debería enfocarse en validar tu idea con contenido orgánico y construir una audiencia inicial antes de invertir en pauta.' },
      { name: 'Startup', desc: 'Tu estrategia de marketing digital debería enfocarse en generar tracción con contenido consistente y campañas de bajo presupuesto para atraer tus primeros clientes.' },
      { name: 'Growing', desc: 'Tu estrategia de marketing digital debería enfocarse en sistematizar tu contenido, escalar pauta pagada y construir embudos de conversión automatizados.' },
      { name: 'Scaling', desc: 'Tu estrategia de marketing digital debería enfocarse en diversificar canales, optimizar el costo por adquisición y delegar la operación creativa.' },
      { name: 'Established', desc: 'Tu estrategia de marketing digital debería enfocarse en expandir a nuevos mercados, fortalecer tu marca personal y maximizar el retorno de cada canal.' },
      { name: 'Empire', desc: 'Tu estrategia de marketing digital debería enfocarse en liderazgo de marca, alianzas estratégicas y crecimiento exponencial a través de múltiples plataformas.' },
    ];

    const level = levelData[business_level - 1] || levelData[0];

    // Replace template variables
    let html = template.html_content
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{level_name\}\}/g, level.name)
      .replace(/\{\{level_number\}\}/g, String(business_level))
      .replace(/\{\{level_desc\}\}/g, level.desc)
      .replace(/\{\{calendly_url\}\}/g, "https://calendly.com/socialifycr/estrategia");

    let subject = template.subject
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{level_name\}\}/g, level.name);

    // Send via Resend gateway
    const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Socialify <hola@socialifycr.com>",
        to: [email],
        subject,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    // Log to email_send_log
    await supabaseAdmin.from("email_send_log").insert({
      recipient_email: email,
      template_name: "funnel-result",
      status: emailRes.ok ? "sent" : "failed",
      error_message: emailRes.ok ? null : JSON.stringify(emailResult),
      metadata: { name, business_level, level_name: level.name },
    });

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-funnel-result error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
