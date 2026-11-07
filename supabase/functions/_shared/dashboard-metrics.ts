// Pure helpers shared by the client-dashboard function and its tests (no Deno APIs).

export type ResultType = 'purchase' | 'messages' | 'leads' | 'traffic' | 'reach';

export const RESULT_LABEL: Record<ResultType, { one: string; many: string; cost: string }> = {
  purchase: { one: 'compra', many: 'compras', cost: 'Costo por compra' },
  messages: { one: 'conversación', many: 'conversaciones', cost: 'Costo por conversación' },
  leads: { one: 'lead', many: 'leads', cost: 'Costo por lead' },
  traffic: { one: 'visita', many: 'visitas', cost: 'Costo por visita' },
  reach: { one: 'persona alcanzada', many: 'personas alcanzadas', cost: 'Costo por mil' },
};

const PURCHASE = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'];
const MESSAGES = ['onsite_conversion.messaging_conversation_started_7d'];
const LEADS = ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead'];

type Action = { action_type: string; value: string | number };
export interface InsightRow {
  objective?: string;
  spend?: string | number;
  reach?: string | number;
  impressions?: string | number;
  frequency?: string | number;
  actions?: Action[];
  action_values?: Action[];
  video_p25_watched_actions?: Action[];
  video_p50_watched_actions?: Action[];
  video_p75_watched_actions?: Action[];
  video_p100_watched_actions?: Action[];
  video_thruplay_watched_actions?: Action[];
  video_avg_time_watched_actions?: Action[];
  video_play_actions?: Action[];
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** First matching action type in priority order (Meta repeats purchases under several aliases). */
export const pickAction = (list: Action[] | undefined, types: string[]) => {
  for (const t of types) {
    const a = (list || []).find((x) => x.action_type === t);
    if (a) return num(a.value);
  }
  return 0;
};
const sumAll = (list: Action[] | undefined) => (list || []).reduce((s, a) => s + num(a.value), 0);

/** Result type implied by a campaign objective; an explicit override always wins. */
export function resultTypeFor(objective: string | undefined, row?: InsightRow, override?: string | null): ResultType {
  if (override && override in RESULT_LABEL) return override as ResultType;
  const o = String(objective || '').toUpperCase();
  if (['OUTCOME_SALES', 'CONVERSIONS', 'PRODUCT_CATALOG_SALES'].includes(o)) return 'purchase';
  if (['OUTCOME_LEADS', 'LEAD_GENERATION'].includes(o)) return 'leads';
  if (o === 'MESSAGES') return 'messages';
  if (o === 'OUTCOME_ENGAGEMENT') return pickAction(row?.actions, MESSAGES) > 0 ? 'messages' : 'reach';
  if (['OUTCOME_TRAFFIC', 'LINK_CLICKS'].includes(o)) return 'traffic';
  return 'reach';
}

export interface Metrics {
  spend: number; reach: number; impressions: number; frequency: number;
  results: number; cost_per_result: number | null;
  purchase_value: number; roas: number | null; link_clicks: number;
  video: { plays: number; p25: number; p50: number; p75: number; p100: number; thruplays: number; avg_seconds: number } | null;
}

/** Normalises one Insights row for the given result type. `rate` converts money into the display currency. */
export function metricsFor(row: InsightRow, type: ResultType, rate = 1): Metrics {
  const spend = num(row.spend) * rate;
  const reach = num(row.reach);
  const impressions = num(row.impressions);
  const lpv = pickAction(row.actions, ['landing_page_view']);
  const link_clicks = pickAction(row.actions, ['link_click']);
  const results = type === 'purchase' ? pickAction(row.actions, PURCHASE)
    : type === 'messages' ? pickAction(row.actions, MESSAGES)
    : type === 'leads' ? pickAction(row.actions, LEADS)
    : type === 'traffic' ? (lpv || link_clicks)
    : reach;
  const cost_per_result = type === 'reach'
    ? (impressions > 0 ? (spend / impressions) * 1000 : null)
    : (results > 0 ? spend / results : null);
  const purchase_value = pickAction(row.action_values, PURCHASE) * rate;
  const plays = sumAll(row.video_play_actions);
  const p25 = sumAll(row.video_p25_watched_actions);
  const video = plays > 0 || p25 > 0 ? {
    plays, p25, p50: sumAll(row.video_p50_watched_actions), p75: sumAll(row.video_p75_watched_actions),
    p100: sumAll(row.video_p100_watched_actions), thruplays: sumAll(row.video_thruplay_watched_actions),
    avg_seconds: sumAll(row.video_avg_time_watched_actions),
  } : null;
  return {
    spend, reach, impressions, frequency: num(row.frequency) || (reach ? impressions / reach : 0),
    results, cost_per_result, purchase_value,
    roas: type === 'purchase' && spend > 0 && purchase_value > 0 ? purchase_value / spend : null,
    link_clicks, video,
  };
}

/** Ranking score: more results first, then cheaper result. */
export const rankAds = <T extends { metrics: Metrics }>(ads: T[]) =>
  [...ads].sort((a, b) => (b.metrics.results - a.metrics.results)
    || ((a.metrics.cost_per_result ?? Infinity) - (b.metrics.cost_per_result ?? Infinity)));

/** Campaigns shown to the client: null/empty selection means every campaign. */
export const isCampaignVisible = (id: string, visible: string[] | null | undefined) =>
  !visible || visible.length === 0 || visible.includes(id);

/** Money conversion between the ad account currency and the client's display currency (CRC = USD × 520). */
export function currencyRate(accountCurrency: string | null | undefined, display: string) {
  const from = String(accountCurrency || 'USD').toUpperCase();
  const to = String(display || 'USD').toUpperCase();
  if (from === to) return 1;
  if (from === 'USD' && to === 'CRC') return 520;
  if (from === 'CRC' && to === 'USD') return 1 / 520;
  return 1;
}

/** Previous window of equal length ending the day before `since` (YYYY-MM-DD). */
export function previousRange(since: string, until: string) {
  const d = (s: string) => new Date(`${s}T00:00:00Z`).getTime();
  const days = Math.round((d(until) - d(since)) / 86400000) + 1;
  const end = new Date(d(since) - 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { since: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10) };
}
