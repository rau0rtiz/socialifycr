import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_TO = "raul@socialifycr.com";
const PUBLIC_BASE = "https://app.socialifycr.com";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.trim().slice(0, 120) : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
    const email = typeof body?.email === "string" ? body.email.trim().slice(0, 320) : "";
    const answers = Array.isArray(body?.answers) ? body.answers.slice(0, 500) : null;
    const html = typeof body?.html === "string" ? body.html.slice(0, 2_000_000) : null;

    if (!slug || !name || !answers) {
      return json({ error: "Datos incompletos" }, 400);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ error: "Correo inválido" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error: docErr } = await admin
      .from("agency_proposals")
      .select("id, title, slug, is_published, client_name")
      .eq("slug", slug)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doc || !doc.is_published) return json({ error: "Formulario no disponible" }, 404);

    const cleanAnswers = answers
      .filter((a: any) => a && typeof a === "object")
      .map((a: any) => ({
        id: String(a.id ?? "").slice(0, 40),
        label: String(a.label ?? "").slice(0, 300),
        type: String(a.type ?? "text").slice(0, 20),
        value: String(a.value ?? "").slice(0, 5000),
      }));

    const { data: inserted, error: insErr } = await admin
      .from("document_form_responses")
      .insert({
        proposal_id: doc.id,
        slug,
        respondent_name: name,
        respondent_email: email || null,
        answers: cleanAnswers,
        html_snapshot: html,
        user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      })
      .select("id, created_at")
      .single();

    if (insErr) throw insErr;

    const { count } = await admin
      .from("document_form_responses")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", doc.id);

    // Notificación interna (best-effort)
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const answered = cleanAnswers.filter((a) => a.value);
        const rows = answered
          .slice(0, 40)
          .map(
            (a) =>
              `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6E6A62;font-size:12px;">${esc(a.label)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px;color:#1A1916;">${esc(a.value)}</td></tr>`,
          )
          .join("");

        const emailHtml = `<!doctype html><html><body style="margin:0;background:#F6F1E8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
            <div style="background:#fff;border-radius:16px;padding:26px;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#E9772C;font-weight:700;">Formulario recibido</p>
              <h1 style="margin:0 0 6px;font-size:21px;color:#1A1916;">${esc(doc.title)}</h1>
              <p style="margin:0 0 18px;color:#6E6A62;font-size:14px;">
                ${esc(name)}${email ? ` · ${esc(email)}` : ""}${doc.client_name ? ` · ${esc(doc.client_name)}` : ""}<br/>
                Respuesta #${count ?? 1} · ${answered.length} campos completados
              </p>
              <table style="width:100%;border-collapse:collapse;">${rows}</table>
              ${answered.length > 40 ? `<p style="margin:14px 0 0;color:#9C968B;font-size:12px;">…y ${answered.length - 40} respuestas más.</p>` : ""}
              <p style="margin:22px 0 0;">
                <a href="${PUBLIC_BASE}/agencia/documentacion" style="display:inline-block;background:#121110;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600;font-size:14px;">Ver en Documentación</a>
              </p>
            </div>
          </div>
        </body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Socialify <notificaciones@socialifycr.com>",
            to: [NOTIFY_TO],
            subject: `Formulario recibido: ${doc.title} — ${name}`,
            html: emailHtml,
          }),
        });
      }
    } catch (e) {
      console.error("[submit-form-response] notify failed", e);
    }

    return json({ success: true, id: inserted.id, count: count ?? 1 });
  } catch (err) {
    console.error("[submit-form-response]", err);
    return json({ error: "No se pudo guardar la respuesta" }, 500);
  }
});
