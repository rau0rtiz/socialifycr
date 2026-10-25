/** Builds short, human-readable share tokens for client calendar links. */

export function clientSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '');
  return base || 'cliente';
}

export function randomSuffix(len = 4): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rnd = new Uint32Array(len);
  crypto.getRandomValues(rnd);
  let out = '';
  for (let i = 0; i < len; i++) out += abc[rnd[i] % abc.length];
  return out;
}

/** Pretty token like "b-dental-k4t2": client name plus a short random suffix. */
export function prettyCalendarToken(name: string, suffixLen = 4): string {
  return `${clientSlug(name)}-${randomSuffix(suffixLen)}`;
}

/** Legacy tokens are the old 32-char hex UUIDs. */
export function isLegacyToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}
