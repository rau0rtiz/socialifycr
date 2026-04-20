// Shared helpers for unsubscribe link generation and suppression checks.
// Reused across all email-sending edge functions.

const APP_URL = "https://app.socialifycr.com";

export function buildUnsubscribeFooter(url: string): string {
  return `<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">Si no deseas recibir más correos, puedes <a href="${url}" style="color:#9ca3af;text-decoration:underline;">desuscribirte aquí</a>.</p>
  </div>`;
}

export function injectUnsubscribeFooter(html: string, footer: string): string {
  if (html.includes("</body>")) return html.replace(/<\/body>/i, `${footer}</body>`);
  return html + footer;
}

/**
 * Get or create an unsubscribe token for the given email.
 * Reuses existing tokens so that previously-sent links keep working.
 */
export async function getOrCreateUnsubscribeToken(
  supabaseAdmin: any,
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();

  // 1. Try to fetch existing token
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();

  if (existing?.token) return existing.token;

  // 2. Create new token
  const newToken = crypto.randomUUID();
  const { error: insertErr } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .insert({ token: newToken, email: normalized });

  if (insertErr) {
    // Race condition: another concurrent send created it. Re-fetch.
    const { data: retry } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    if (retry?.token) return retry.token;
    throw insertErr;
  }

  return newToken;
}

/**
 * Build the public unsubscribe URL with both token and email visible
 * for a friendlier UX.
 */
export async function generateUnsubscribeUrl(
  supabaseAdmin: any,
  email: string,
): Promise<string> {
  const token = await getOrCreateUnsubscribeToken(supabaseAdmin, email);
  const normalized = email.trim().toLowerCase();
  return `${APP_URL}/desuscribirse?token=${token}&email=${encodeURIComponent(normalized)}`;
}

/**
 * Returns true if this email address has been suppressed (unsubscribed/bounced/complained).
 * Use this to skip sending to people who opted out.
 */
export async function isEmailSuppressed(
  supabaseAdmin: any,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const { data } = await supabaseAdmin
    .from("suppressed_emails")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  return !!data;
}
