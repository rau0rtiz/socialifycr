import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENTS = ["raul@socialifycr.com", "lucia@socialifycr.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const payload = await req.json();
    // Trigger payload shape: { record: {...}, old_record, type }
    const lead = payload?.record ?? payload?.lead ?? payload;

    const answers = lead?.answers ?? {};
    const source = answers?.source;
    if (source !== "website-contact-form") {
      return new Response(JSON.stringify({ skipped: true, reason: "not website-contact-form" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = lead?.name ?? "—";
    const email = lead?.email ?? "—";
    const phone = lead?.phone ?? "—";
    const brand = answers?.brand ?? lead?.industry ?? "—";
    const goal90d = answers?.goal_90d ?? "—";
    const challenge = lead?.challenge ?? answers?.challenge ?? answers?.looking_for ?? "—";
    const tried = answers?.tried ?? "—";

    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
    const utms = utmKeys
      .map((k) => ({ key: k, value: answers?.[k] }))
      .filter((u) => u.value);

    const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const utmHtml = utms.length
      ? `<div style="margin-top:20px;padding:14px;background:#f3e8ff;border-radius:8px;">
          <div style="font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Atribución (UTMs)</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            ${utms.map(u => `<tr><td style="padding:4px 0;color:#666;width:100px;text-transform:capitalize;">${u.key.replace("utm_","")}</td><td style="padding:4px 0;font-weight:600;">${esc(String(u.value))}</td></tr>`).join("")}
          </table>
        </div>`
      : "";

    const block = (label: string, value: string) => `
      <div style="margin-top:14px;padding:14px;background:#f7f7f7;border-radius:8px;">
        <div style="font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${esc(label)}</div>
        <div style="font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(value)}</div>
      </div>`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <h2 style="margin:0 0 16px;color:#FF6B35;">Nuevo contacto desde socialifycr.com</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#666;width:140px;">Nombre</td><td style="padding:8px 0;font-weight:600;">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:#FF6B35;">${esc(email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Teléfono</td><td style="padding:8px 0;"><a href="tel:${esc(phone)}" style="color:#FF6B35;">${esc(phone)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Marca o negocio</td><td style="padding:8px 0;font-weight:600;">${esc(brand)}</td></tr>
        </table>
        ${block("Meta a 90 días", goal90d)}
        ${block("Reto actual más grande", challenge)}
        ${block("¿Qué se ha intentado hasta ahora?", tried)}
        ${utmHtml}
        <p style="margin-top:24px;font-size:12px;color:#999;">Lead registrado el ${new Date(lead?.created_at ?? Date.now()).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Socialify <notificaciones@socialifycr.com>",
        to: RECIPIENTS,
        reply_to: email,
        subject: `Nuevo contacto web: ${name} — ${subject}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-website-contact]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
