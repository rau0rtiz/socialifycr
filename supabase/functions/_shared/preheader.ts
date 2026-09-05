// Shared helper to inject the "preview text" (preheader) shown by inbox clients
// right after the subject line. Hidden inside the email body.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPreheader(text: string): string {
  const safe = escapeHtml(text.trim());
  // Trailing whitespace characters prevent inbox clients from pulling body copy
  // into the preview line.
  const filler = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${safe}${filler}</div>`;
}

/** Inserts the preheader as the first element inside <body> (or at the top of the HTML). */
export function injectPreheader(html: string, text?: string | null): string {
  if (!text || !text.trim()) return html;
  const block = buildPreheader(text);
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => `${m}${block}`);
  }
  return block + html;
}
