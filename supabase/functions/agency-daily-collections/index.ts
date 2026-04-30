import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPIENTS = ['ale@socialifycr.com', 'raul@socialifycr.com'];
const FROM = 'Raúl Ortiz <finanzas@notify.socialifycr.com>';

const fmtMoney = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${Math.round(amount).toLocaleString('es-CR')}`;
  return `$${Math.round(amount).toLocaleString('en-US')}`;
};

const fmtDateCR = (iso: string) => {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', timeZone: 'America/Costa_Rica' });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse body for test mode (single test recipient)
    let testEmail: string | null = null;
    let dryRun = false;
    try {
      const body = await req.json();
      testEmail = body?.test_email || null;
      dryRun = body?.dry_run === true;
    } catch (_) {}

    // Fecha de hoy en zona horaria de Costa Rica
    const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
    const todayStr = nowCR.toISOString().slice(0, 10);

    // Cobros pendientes: vencidos + hoy
    const { data: collections, error } = await supabase
      .from('agency_collections')
      .select('id, customer_name, due_date, amount, currency, collection_type, notes')
      .eq('status', 'pending')
      .lte('due_date', todayStr)
      .order('due_date', { ascending: true });

    if (error) throw error;

    const overdue = (collections || []).filter((c: any) => c.due_date < todayStr);
    const today = (collections || []).filter((c: any) => c.due_date === todayStr);

    if (overdue.length === 0 && today.length === 0 && !testEmail) {
      return new Response(JSON.stringify({ success: true, message: 'Sin cobros pendientes hoy' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalUsd = (collections || []).reduce((s: number, c: any) => {
      const usd = c.currency === 'CRC' ? c.amount / 520 : c.amount;
      return s + Number(usd);
    }, 0);

    const renderRow = (c: any, isOverdue: boolean) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;font-size:14px;color:#111827;font-weight:600;">${c.customer_name}</td>
        <td style="padding:12px 8px;font-size:13px;color:${isOverdue ? '#dc2626' : '#374151'};">
          ${fmtDateCR(c.due_date)}${isOverdue ? ' <span style="color:#dc2626;">⚠️ vencido</span>' : ''}
        </td>
        <td style="padding:12px 8px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmtMoney(Number(c.amount), c.currency)}</td>
        <td style="padding:12px 8px;font-size:12px;color:#6b7280;">${c.collection_type === 'one_off' ? 'One-off' : c.collection_type === 'post_production' ? 'Post-prod' : 'Mensual'}</td>
      </tr>
    `;

    const renderSection = (title: string, items: any[], color: string, isOverdue: boolean) => {
      if (items.length === 0) return '';
      return `
        <h2 style="font-size:16px;color:${color};margin:24px 0 8px;">${title} (${items.length})</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 8px;font-size:12px;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Cliente</th>
              <th style="padding:10px 8px;font-size:12px;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Fecha</th>
              <th style="padding:10px 8px;font-size:12px;color:#6b7280;text-align:right;text-transform:uppercase;letter-spacing:.5px;">Monto</th>
              <th style="padding:10px 8px;font-size:12px;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(c => renderRow(c, isOverdue)).join('')}
          </tbody>
        </table>
      `;
    };

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
          <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px;">
            <h1 style="font-size:22px;color:#111827;margin:0;">📋 Cobros del día</h1>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">${nowCR.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })}</p>
          </div>

          <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="font-size:12px;color:#065f46;text-transform:uppercase;letter-spacing:.5px;">Total pendiente</div>
            <div style="font-size:28px;color:#065f46;font-weight:700;">${fmtMoney(totalUsd, 'USD')}</div>
            <div style="font-size:13px;color:#047857;margin-top:4px;">${overdue.length} vencidos · ${today.length} para hoy</div>
          </div>

          ${renderSection('🚨 Vencidos', overdue, '#dc2626', true)}
          ${renderSection('📅 Para hoy', today, '#059669', false)}

          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
            <a href="https://app.socialifycr.com/agencia/finanzas" style="display:inline-block;background:#10b981;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Ir a Finanzas Agencia</a>
          </div>

          <p style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center;">
            Resumen automático diario · Socialify
          </p>
        </div>
      </div>
    `;

    const subject = overdue.length > 0
      ? `🚨 ${overdue.length + today.length} cobros pendientes (${overdue.length} vencidos)`
      : `📋 ${today.length} cobros para hoy`;

    if (dryRun) {
      return new Response(JSON.stringify({ success: true, html, subject, recipients: testEmail ? [testEmail] : RECIPIENTS }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipients = testEmail ? [testEmail] : RECIPIENTS;
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: recipients,
        subject: testEmail ? `[TEST] ${subject}` : subject,
        html,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      throw new Error(`Resend error: ${JSON.stringify(emailData)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      sent_to: recipients,
      overdue_count: overdue.length,
      today_count: today.length,
      total_usd: totalUsd,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
