// Aviso por correo cuando Ari deriva una conversación a un humano.
// Reutiliza send-notification-email (Resend + registro en sent_emails).
// Anti-spam: máximo 1 correo por conversación cada 60 minutos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALERT_TO = "raul@socialifycr.com";
const THROTTLE_MINUTES = 60;

export interface HumanAlertInput {
  conversationId: string;
  contactName?: string | null;
  handle?: string | null;
  reason: string;
  lastMessage?: string | null;
  draftReply?: string | null;
}

export async function notifyHumanNeeded(input: HumanAlertInput): Promise<void> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, serviceKey);

  try {
    // Throttle: no repetir aviso de la misma conversación en la última hora.
    const since = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000).toISOString();
    const shortId = input.conversationId.slice(0, 8);
    const { data: recent } = await admin
      .from("sent_emails")
      .select("id")
      .eq("recipient_email", ALERT_TO)
      .ilike("subject", `%#${shortId}%`)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      console.log(`[human-alert] aviso omitido por throttle (#${shortId})`);
      return;
    }

    const who = input.contactName || input.handle || "Contacto de Instagram";
    const subject = `Ari necesita tu ayuda — ${who} (#${shortId})`;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#faf8f5;padding:24px;color:#212121">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e8e2da">
    <h2 style="margin:0 0 4px;color:#e85d3a">Ari pidió intervención humana</h2>
    <p style="margin:0 0 16px;color:#6b6660;font-size:13px">Conversación de Instagram · Chats → Buzón</p>
    <p style="margin:0 0 6px"><strong>Contacto:</strong> ${esc(who)}${input.handle ? ` (@${esc(input.handle)})` : ""}</p>
    <p style="margin:0 0 16px"><strong>Motivo:</strong> ${esc(input.reason)}</p>
    ${input.lastMessage ? `<div style="background:#f5f1ec;border-radius:8px;padding:12px;margin:0 0 12px"><p style="margin:0 0 4px;font-size:11px;color:#6b6660;text-transform:uppercase">Último mensaje de la persona</p><p style="margin:0">${esc(input.lastMessage)}</p></div>` : ""}
    ${input.draftReply ? `<div style="background:#fdf3ef;border:1px solid #f3d9ce;border-radius:8px;padding:12px;margin:0 0 16px"><p style="margin:0 0 4px;font-size:11px;color:#c94a2b;text-transform:uppercase">Respuesta que Ari proponía (no enviada)</p><p style="margin:0">${esc(input.draftReply)}</p></div>` : ""}
    <a href="https://app.socialifycr.com/agencia/chats" style="display:inline-block;background:#e85d3a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Abrir el buzón</a>
  </div>
</body></html>`;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: ALERT_TO,
        toName: "Raúl",
        subject,
        html,
        previewText: `${who}: ${input.reason}`,
      }),
    });
    if (!res.ok) {
      console.error("[human-alert] send-notification-email falló:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[human-alert] error:", err);
  }
}
