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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) throw new Error("Missing email configuration");

    const body = await req.json();
    const { sheetId, recipientEmail, recipientName, subject, includeTechNotes } = body;

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

    const html = buildHtml({
      sheet,
      clientName,
      shots,
      includeTechNotes: !!includeTechNotes,
      recipientName,
    });

    const finalSubject = subject?.trim() || `Resumen de producción · ${sheet.title || clientName}`;

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
      metadata: { sheet_id: sheetId, sheet_title: sheet.title, client_name: clientName, include_tech_notes: !!includeTechNotes },
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
