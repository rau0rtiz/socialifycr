// Comfortex — detección heurística de urgencia desde custom_answers.
// El slug real lo asigna Meta cuando publica el form; no lo hardcodeamos.

export type UrgencyBucket = '24h' | '1-3d' | '4-7d' | 'cotizar';

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s]+/g, ' ')
    .trim();

const KEY_HINTS = ['pronto', 'urgen', 'cuando', 'necesitan', 'plazo', 'entrega'];

const mapValueToBucket = (value: string): UrgencyBucket | null => {
  const v = normalize(value);
  if (!v) return null;
  if (v.includes('24') || v.includes('proxima') || v.includes('hoy') || v.includes('urgen')) return '24h';
  if (v.match(/\b1\s*[-a]?\s*3\b/) || v.includes('1 a 3') || v.includes('1-3')) return '1-3d';
  if (v.match(/\b4\s*[-a]?\s*7\b/) || v.includes('4 a 7') || v.includes('4-7') || v.includes('semana')) return '4-7d';
  if (v.includes('cotiz') || v.includes('solo quiero') || v.includes('informacion')) return 'cotizar';
  return null;
};

export const getUrgencyFromLead = (
  custom_answers: Record<string, unknown> | null | undefined,
): UrgencyBucket | null => {
  if (!custom_answers || typeof custom_answers !== 'object') return null;
  for (const [rawKey, rawVal] of Object.entries(custom_answers)) {
    const key = normalize(rawKey);
    if (!KEY_HINTS.some((h) => key.includes(h))) continue;
    if (rawVal == null) continue;
    const bucket = mapValueToBucket(String(rawVal));
    if (bucket) return bucket;
  }
  // Fallback: escanear todos los valores si la key no ayudó
  for (const rawVal of Object.values(custom_answers)) {
    if (rawVal == null) continue;
    const v = normalize(String(rawVal));
    if (v.includes('proxima') && v.includes('24')) return '24h';
    if (v.includes('1-3 dias') || v.includes('1 a 3 dias')) return '1-3d';
    if (v.includes('4-7 dias') || v.includes('4 a 7 dias')) return '4-7d';
    if (v === 'solo quiero cotizar') return 'cotizar';
  }
  return null;
};

export const URGENCY_LABELS: Record<UrgencyBucket, string> = {
  '24h': 'Próximas 24h',
  '1-3d': '1-3 días',
  '4-7d': '4-7 días',
  cotizar: 'Solo cotiza',
};

export const URGENCY_SHORT: Record<UrgencyBucket, string> = {
  '24h': '24h',
  '1-3d': '1-3d',
  '4-7d': '4-7d',
  cotizar: 'Cotiza',
};

// Clases Tailwind semánticas (usan tokens ya definidos en index.css).
export const URGENCY_STYLE: Record<UrgencyBucket, string> = {
  '24h': 'bg-red-500/15 text-red-500 border-red-500/30',
  '1-3d': 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  '4-7d': 'bg-muted text-muted-foreground border-border',
  cotizar: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
};

export const URGENCY_ORDER: UrgencyBucket[] = ['24h', '1-3d', '4-7d', 'cotizar'];
