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

    // Build conditional session CTA block
    const qualifiesForSession = business_level >= 4;
    const isExploratory = business_level === 6;

    let sessionCta = '';
    if (qualifiesForSession) {
      const sessionTitle = isExploratory
        ? '¿Querés llevar tu marca al siguiente nivel?'
        : '¿Querés ayuda para implementarlo?';
      const sessionDesc = isExploratory
        ? 'Agendá una sesión exploratoria donde analizamos tu contexto y definimos un plan preliminar de trabajo. Lo ejecutés con nosotros o no, el plan es tuyo.'
        : 'Agendá una sesión gratuita de 1 hora donde definimos un plan concreto para tu negocio. Lo ejecutés con nosotros o no, el plan es tuyo.';
      const sessionButton = isExploratory
        ? 'Agendar sesión exploratoria'
        : 'Agendar sesión gratuita';
      const calendlyUrl = 'https://calendly.com/socialifycr/estrategia';

      sessionCta = `
        <div style="margin-top:24px;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
          <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#212121;">${sessionTitle}</h3>
          <p style="margin:0 0 16px;font-size:14px;color:#212121cc;line-height:1.5;">${sessionDesc}</p>
          <a href="${calendlyUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#FF6B35;color:#ffffff;font-weight:600;text-decoration:none;border-radius:8px;font-size:14px;">${sessionButton}</a>
        </div>`;
    }

    // Replace template variables
    let html = template.html_content
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{level_name\}\}/g, level.name)
      .replace(/\{\{level_number\}\}/g, String(business_level))
      .replace(/\{\{level_desc\}\}/g, level.desc)
      .replace(/\{\{session_cta\}\}/g, sessionCta)
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
