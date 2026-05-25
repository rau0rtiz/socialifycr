import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "raul@socialifycr.com";

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
    const subject = lead?.industry ?? "—";
    const message = lead?.challenge ?? "—";

    const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <h2 style="margin:0 0 16px;color:#FF6B35;">Nuevo contacto desde socialifycr.com</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#666;width:120px;">Nombre</td><td style="padding:8px 0;font-weight:600;">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:#FF6B35;">${esc(email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Teléfono</td><td style="padding:8px 0;"><a href="tel:${esc(phone)}" style="color:#FF6B35;">${esc(phone)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Asunto</td><td style="padding:8px 0;">${esc(subject)}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#f7f7f7;border-radius:8px;">
          <div style="font-size:12px;color:#666;margin-bottom:6px;">Mensaje</div>
          <div style="font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(message)}</div>
        </div>
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
        to: [RECIPIENT],
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
