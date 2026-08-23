import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  reel: { icon: '🎬', label: 'Reel' },
  story: { icon: '📱', label: 'Story' },
  post: { icon: '🖼️', label: 'Post' },
  foto: { icon: '📷', label: 'Foto' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  short: { icon: '▶️', label: 'Short' },
  otro: { icon: '🎞️', label: 'Pieza' },
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  multi: 'Multi-plataforma',
};

function esc(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function buildHtml({ sheet, clientName, shots, includeTechNotes, recipientName }: any): string {
  const recorded = shots.filter((s: any) => s.done);
  const piecesHtml = recorded.map((s: any, i: number) => {
    const meta = TYPE_LABELS[s.content_type || 'otro'] || TYPE_LABELS.otro;
    const platform = s.platform ? (PLATFORM_LABELS[s.platform] || s.platform) : '';
    return `
      <tr>
        <td style="padding:18px 22px;background:#ffffff;border-left:4px solid #d97757;border-bottom:1px solid #eee5d8;">
          <div style="font-family:Georgia,serif;font-size:13px;color:#8b7355;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">
            ${String(i + 1).padStart(2, '0')} · ${meta.icon} ${esc(meta.label)}${platform ? ` · ${esc(platform)}` : ''}
          </div>
          <div style="font-family:Georgia,serif;font-size:20px;color:#1a1a1a;line-height:1.3;margin-bottom:${s.hook || s.cta ? '10px' : '0'};">
            ${esc(s.concept || s.description || '(sin concepto)')}
          </div>
          ${s.hook ? `<div style="font-size:14px;color:#444;margin-top:6px;"><strong style="color:#1a1a1a;">Hook:</strong> ${esc(s.hook)}</div>` : ''}
          ${s.cta ? `<div style="font-size:14px;color:#444;margin-top:4px;"><strong style="color:#1a1a1a;">CTA:</strong> ${esc(s.cta)}</div>` : ''}
          ${includeTechNotes && s.tech_notes ? `
            <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #d4c5a9;">
              <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8b7355;margin-bottom:4px;">🎥 Notas técnicas</div>
              <div style="font-size:13px;color:#1a1a1a;white-space:pre-wrap;">${esc(s.tech_notes)}</div>
            </div>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e6;padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER claqueta -->
        <tr><td style="background:#1a1a1a;border-radius:16px 16px 0 0;padding:32px 28px;position:relative;">
          <div style="height:4px;background:linear-gradient(90deg,#d97757 0%,#e8b770 50%,#d97757 100%);border-radius:2px;margin-bottom:18px;"></div>
          <div style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#a89b85;margin-bottom:10px;">
            ● Hoja de producción · ${esc(clientName || '')}
          </div>
          <div style="font-family:Georgia,serif;font-size:32px;color:#f5f0e6;text-transform:uppercase;letter-spacing:0.03em;line-height:1.15;">
            ${esc(sheet.title || 'Producción')}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr>
              <td style="padding-right:12px;">
                <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#a89b85;margin-bottom:4px;">Fecha</div>
                <div style="color:#f5f0e6;font-size:15px;font-family:Georgia,serif;">${esc(formatDate(sheet.shoot_date))}</div>
              </td>
              <td style="padding-right:12px;">
                <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#a89b85;margin-bottom:4px;">Locación</div>
                <div style="color:#f5f0e6;font-size:15px;font-family:Georgia,serif;">${esc(sheet.location || '—')}</div>
              </td>
              <td>
                <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#a89b85;margin-bottom:4px;">Responsable</div>
                <div style="color:#f5f0e6;font-size:15px;font-family:Georgia,serif;">${esc(sheet.producer_name || '—')}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Saludo -->
        ${recipientName ? `<tr><td style="background:#ffffff;padding:24px 28px 8px;">
          <p style="margin:0;font-size:15px;color:#1a1a1a;">Hola ${esc(recipientName)},</p>
          <p style="margin:8px 0 0;font-size:14px;color:#555;line-height:1.5;">Te compartimos el resumen de las piezas grabadas en esta producción.</p>
        </td></tr>` : `<tr><td style="background:#ffffff;padding:24px 28px 8px;">
          <p style="margin:0;font-size:14px;color:#555;line-height:1.5;">Resumen de las piezas grabadas en esta producción.</p>
        </td></tr>`}

        <!-- COUNT -->
        <tr><td style="background:#ffffff;padding:8px 28px 20px;">
          <div style="display:inline-block;background:#1a1a1a;color:#f5f0e6;padding:6px 14px;border-radius:20px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">
            ${recorded.length} pieza${recorded.length !== 1 ? 's' : ''} grabada${recorded.length !== 1 ? 's' : ''}
          </div>
        </td></tr>

        <!-- PIECES -->
        <tr><td style="background:#ffffff;padding:0 16px 16px;">
          ${recorded.length === 0
            ? `<div style="padding:32px;text-align:center;color:#8b7355;font-size:14px;border:2px dashed #d4c5a9;border-radius:8px;">Sin piezas grabadas todavía.</div>`
            : `<table width="100%" cellpadding="0" cellspacing="0">${piecesHtml}</table>`}
        </td></tr>

        ${sheet.notes ? `<tr><td style="background:#ffffff;padding:20px 28px;border-top:1px solid #eee5d8;">
          <div style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#8b7355;margin-bottom:8px;">Notas del día</div>
          <div style="font-size:14px;color:#1a1a1a;white-space:pre-wrap;line-height:1.5;">${esc(sheet.notes)}</div>
        </td></tr>` : ''}

        <!-- FOOTER -->
        <tr><td style="background:#1a1a1a;border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;">
          <div style="font-size:11px;color:#a89b85;letter-spacing:0.15em;text-transform:uppercase;">
            Producido por Socialify
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildReceiptHtml({ sheet, clientName, shots, recipientName, shareUrl }: any): string {
  const recorded = shots.filter((s: any) => s.done);
  const folio = String(sheet.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();

  const rows = recorded.map((s: any, i: number) => {
    const meta = TYPE_LABELS[s.content_type || 'otro'] || TYPE_LABELS.otro;
    const platform = s.platform ? (PLATFORM_LABELS[s.platform] || s.platform) : '';
    const name = s.concept || s.description || '(sin nombre)';
    const files = (s.file_names || '').split(/[,\n]/).map((f: string) => f.trim()).filter(Boolean);
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px dashed #d4c5a9;vertical-align:top;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#1a1a1a;font-weight:bold;">
            ${String(i + 1).padStart(2, '0')}. ${esc(name)}
          </div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#8b7355;margin-top:3px;">
            ${meta.icon} ${esc(meta.label)}${platform ? ` · ${esc(platform)}` : ''}
          </div>
          ${files.length ? `<div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#5a5248;margin-top:5px;">${files.map((f: string) => `<span style="display:inline-block;border:1px solid #d4c5a9;border-radius:4px;padding:2px 6px;margin:2px 4px 0 0;">${esc(f)}</span>`).join('')}</div>` : ''}
        </td>
        <td style="padding:10px 0;text-align:right;vertical-align:top;font-family:'Courier New',Courier,monospace;font-size:13px;color:#1a1a1a;white-space:nowrap;">
          x1
        </td>
      </tr>`;
  }).join('');

  const counts: Record<string, number> = {};
  recorded.forEach((s: any) => {
    const key = (TYPE_LABELS[s.content_type || 'otro'] || TYPE_LABELS.otro).label;
    counts[key] = (counts[key] || 0) + 1;
  });
  const totalsHtml = Object.entries(counts).map(([label, n]) => `
    <tr>
      <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#5a5248;padding:2px 0;">${esc(label)}</td>
      <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#1a1a1a;text-align:right;padding:2px 0;">${n}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e6;padding:24px 12px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fffdf8;border-radius:14px;border:1px solid #eee5d8;">
        <tr><td style="padding:26px 24px 16px;text-align:center;border-bottom:2px dashed #d4c5a9;">
          <div style="font-size:10px;letter-spacing:0.35em;text-transform:uppercase;color:#8b7355;">Socialify · Comprobante de entrega</div>
          <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;margin-top:10px;text-transform:uppercase;letter-spacing:0.04em;">${esc(sheet.title || 'Producción')}</div>
          <div style="font-size:12px;color:#5a5248;margin-top:8px;">${esc(clientName || '')}</div>
        </td></tr>

        <tr><td style="padding:14px 24px;border-bottom:1px dashed #d4c5a9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:#5a5248;">
            <tr><td style="padding:2px 0;">FOLIO</td><td style="text-align:right;color:#1a1a1a;">#${esc(folio)}</td></tr>
            <tr><td style="padding:2px 0;">FECHA</td><td style="text-align:right;color:#1a1a1a;">${esc(formatDate(sheet.shoot_date))}</td></tr>
            ${sheet.location ? `<tr><td style="padding:2px 0;">LOCACIÓN</td><td style="text-align:right;color:#1a1a1a;">${esc(sheet.location)}</td></tr>` : ''}
            ${sheet.producer_name ? `<tr><td style="padding:2px 0;">RESPONSABLE</td><td style="text-align:right;color:#1a1a1a;">${esc(sheet.producer_name)}</td></tr>` : ''}
          </table>
        </td></tr>

        ${recipientName ? `<tr><td style="padding:14px 24px 0;font-size:13px;color:#1a1a1a;">Hola ${esc(recipientName)}, este es el detalle de lo grabado:</td></tr>` : ''}

        <tr><td style="padding:8px 24px 0;">
          <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8b7355;padding-bottom:6px;border-bottom:2px solid #1a1a1a;">Detalle de piezas</div>
          ${recorded.length === 0
            ? `<div style="padding:24px 0;text-align:center;color:#8b7355;font-size:13px;">Sin piezas grabadas.</div>`
            : `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`}
        </td></tr>

        <tr><td style="padding:16px 24px;border-top:2px dashed #d4c5a9;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${totalsHtml}
            <tr>
              <td style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#1a1a1a;font-weight:bold;padding-top:10px;border-top:1px solid #d4c5a9;">TOTAL PIEZAS</td>
              <td style="font-family:'Courier New',Courier,monospace;font-size:15px;color:#d97757;font-weight:bold;text-align:right;padding-top:10px;border-top:1px solid #d4c5a9;">${recorded.length}</td>
            </tr>
          </table>
        </td></tr>

        ${shareUrl ? `<tr><td style="padding:4px 24px 20px;text-align:center;">
          <a href="${shareUrl}" style="display:inline-block;background:#e85d3a;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;padding:14px 26px;border-radius:999px;">Ver y compartir mi recibo</a>
          <div style="font-size:11px;color:#8b7355;margin-top:10px;letter-spacing:0.05em;">Compartilo en tus historias</div>
        </td></tr>` : ''}

        ${sheet.notes ? `<tr><td style="padding:0 24px 16px;">
          <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8b7355;margin-bottom:6px;">Notas</div>
          <div style="font-size:12px;color:#1a1a1a;white-space:pre-wrap;line-height:1.5;">${esc(sheet.notes)}</div>
        </td></tr>` : ''}

        <tr><td style="padding:18px 24px 26px;text-align:center;border-top:2px dashed #d4c5a9;">
          <div style="font-size:11px;color:#8b7355;letter-spacing:0.2em;text-transform:uppercase;">¡Gracias por grabar con nosotros!</div>
          <div style="font-size:10px;color:#a89b85;margin-top:6px;">Socialify · socialifycr.com</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) throw new Error("Missing email configuration");

    const body = await req.json();
    const { sheetId, recipientEmail, recipientName, subject, includeTechNotes, format } = body;

    if (!sheetId || !recipientEmail) {
      return new Response(JSON.stringify({ error: "sheetId and recipientEmail are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = String(recipientEmail).split(',').map(s => s.trim()).filter(Boolean);
    if (emails.length === 0 || emails.some(e => !emailRegex.test(e))) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Load sheet + shots + client
    const [sheetRes, shotsRes] = await Promise.all([
      supabaseAdmin.from("production_sheets").select("*").eq("id", sheetId).maybeSingle(),
      supabaseAdmin.from("production_sheet_shots").select("*").eq("sheet_id", sheetId).order("sort_order"),
    ]);

    if (sheetRes.error || !sheetRes.data) throw new Error("Sheet not found");
    const sheet = sheetRes.data;
    const shots = shotsRes.data || [];

    const { data: client } = await supabaseAdmin.from("clients").select("name").eq("id", sheet.client_id).maybeSingle();
    const clientName = client?.name || '';

    const isReceipt = format === 'receipt';
    const shareUrl = sheet.public_share_enabled && sheet.public_share_token
      ? `https://app.socialifycr.com/recibo/${sheet.public_share_token}`
      : null;
    const html = isReceipt
      ? buildReceiptHtml({ sheet, clientName, shots, recipientName, shareUrl })
      : buildHtml({
          sheet,
          clientName,
          shots,
          includeTechNotes: !!includeTechNotes,
          recipientName,
        });

    const finalSubject = subject?.trim() || (isReceipt
      ? `Comprobante de entrega · ${sheet.title || clientName}`
      : `Resumen de producción · ${sheet.title || clientName}`);

    const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Socialify <hola@socialifycr.com>",
        to: emails,
        subject: finalSubject,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    await supabaseAdmin.from("sent_emails").insert({
      recipient_email: emails.join(', '),
      recipient_name: recipientName || null,
      subject: finalSubject,
      html_content: html,
      source: "production_summary",
      status: emailRes.ok ? "sent" : "failed",
      error_message: emailRes.ok ? null : JSON.stringify(emailResult),
      resend_id: emailRes.ok ? (emailResult?.id || null) : null,
      metadata: { sheet_id: sheetId, sheet_title: sheet.title, client_name: clientName, include_tech_notes: !!includeTechNotes, format: isReceipt ? 'receipt' : 'editorial' },
    });

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      throw new Error(emailResult?.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-production-summary error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
