// Fixed monthly delivery targets per client, broken down by content type.
// Each calendar piece (content_calendar_items.content_type) counts toward its type.

export interface DeliveryType {
  value: string;
  label: string;
  plural: string;
  icon: string;
}

export const DELIVERY_TYPES: DeliveryType[] = [
  { value: 'reel', label: 'Reel', plural: 'Reels', icon: '🎬' },
  { value: 'story', label: 'Story', plural: 'Stories', icon: '📱' },
  { value: 'foto', label: 'Foto', plural: 'Fotos', icon: '📷' },
  { value: 'post', label: 'Post', plural: 'Posts', icon: '🖼️' },
  { value: 'carrusel', label: 'Carrusel', plural: 'Carruseles', icon: '🎠' },
  { value: 'diseno', label: 'Diseño', plural: 'Diseños', icon: '🎨' },
  { value: 'correo', label: 'Correo', plural: 'Correos', icon: '✉️' },
  { value: 'tiktok', label: 'TikTok', plural: 'TikToks', icon: '🎵' },
  { value: 'short', label: 'Short', plural: 'Shorts', icon: '▶️' },
  { value: 'otro', label: 'Otro', plural: 'Otros', icon: '🎞️' },
];

export const deliveryType = (value: string | null | undefined): DeliveryType =>
  DELIVERY_TYPES.find((t) => t.value === value) ?? DELIVERY_TYPES[DELIVERY_TYPES.length - 1];

export interface TargetRow { client_id: string; content_type: string; monthly_target: number }
export interface TypeProgressItem { publish_date: string | null; content_type: string | null }

export interface TypeProgress {
  type: DeliveryType;
  target: number;
  scheduled: number;
  expected: number;
  gap: number;
  pace: 'on-track' | 'behind' | 'future';
}

export interface DeliveryProgress {
  types: TypeProgress[];
  totalTarget: number;
  totalScheduled: number;
  totalExpected: number;
  totalGap: number;
  pace: 'unset' | 'on-track' | 'behind' | 'future';
}

/** Per-type progress for a month. Only types with a target > 0 are tracked. */
export function deliveryProgress(
  items: TypeProgressItem[],
  month: string,
  targets: TargetRow[],
  today: string,
): DeliveryProgress {
  const prefix = month.slice(0, 7);
  const monthly = items.filter((i) => i.publish_date?.startsWith(prefix));
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const end = `${prefix}-${days}`;
  const elapsed = today < month ? 0 : today > end ? days : Number(today.slice(8, 10));

  const types: TypeProgress[] = [];
  for (const t of targets) {
    if (!t.monthly_target) continue;
    const scheduled = monthly.filter((i) => (i.content_type ?? 'otro') === t.content_type).length;
    const expected = Math.ceil((t.monthly_target * elapsed) / days);
    const due = monthly.filter((i) => (i.content_type ?? 'otro') === t.content_type && (i.publish_date ?? '') <= today).length;
    const gap = Math.max(0, expected - due);
    types.push({
      type: deliveryType(t.content_type),
      target: t.monthly_target,
      scheduled,
      expected,
      gap,
      pace: elapsed === 0 ? 'future' : gap > 0 ? 'behind' : 'on-track',
    });
  }

  const totalTarget = types.reduce((s, t) => s + t.target, 0);
  const totalScheduled = types.reduce((s, t) => s + t.scheduled, 0);
  const totalExpected = types.reduce((s, t) => s + t.expected, 0);
  const totalGap = types.reduce((s, t) => s + t.gap, 0);
  return {
    types,
    totalTarget,
    totalScheduled,
    totalExpected,
    totalGap,
    pace: totalTarget === 0 ? 'unset' : elapsed === 0 ? 'future' : totalGap > 0 ? 'behind' : 'on-track',
  };
}

/** Validates an editable target map: integer 0..10000 per type. */
export const validDeliveryTarget = (value: number) => Number.isInteger(value) && value >= 0 && value <= 10000;
