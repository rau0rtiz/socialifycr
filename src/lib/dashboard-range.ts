// Date ranges for the client results dashboard, computed in Costa Rica time (UTC-6).
export type RangePreset = 'today' | 'yesterday' | 'last_7d' | 'this_month' | 'last_month' | 'custom';

export const RANGE_LABEL: Record<RangePreset, string> = {
  today: 'Hoy', yesterday: 'Ayer', last_7d: 'Últimos 7 días', this_month: 'Este mes', last_month: 'Mes pasado', custom: 'Personalizado',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const crToday = (now = Date.now()) => iso(new Date(now - 6 * 3600000));

export function presetRange(p: Exclude<RangePreset, 'custom'>, now = Date.now()) {
  const t = new Date(`${crToday(now)}T00:00:00Z`);
  const day = (n: number) => iso(new Date(t.getTime() + n * 86400000));
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  switch (p) {
    case 'today': return { since: day(0), until: day(0) };
    case 'yesterday': return { since: day(-1), until: day(-1) };
    case 'last_7d': return { since: day(-6), until: day(0) };
    case 'this_month': return { since: iso(new Date(Date.UTC(y, m, 1))), until: day(0) };
    case 'last_month': return { since: iso(new Date(Date.UTC(y, m - 1, 1))), until: iso(new Date(Date.UTC(y, m, 0))) };
  }
}
