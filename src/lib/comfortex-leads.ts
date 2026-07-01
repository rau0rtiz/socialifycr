import type { InstantFormLead } from '@/hooks/use-instant-form-leads';

export const COMFORTEX_CLIENT_ID = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7';

const stripPrefix = (v: string) => v.replace(/^[a-z]:/i, '').replace(/^<test lead:.*?>$/i, '').trim();

export const cleanText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (!s) return '';
  // strip phone-like "p:" prefix that sometimes leaks from sheet exports
  s = stripPrefix(s);
  return s;
};

export const parseQuantity = (v: unknown): number | null => {
  const s = cleanText(v);
  if (!s) return null;
  // grab first number, supports "10 camisas", "20-30" → 20, "100.000" → 100000
  const match = s.match(/(\d+(?:[.,]\d+)*)/);
  if (!match) return null;
  const raw = match[1].replace(/[.,]/g, '');
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
};

const YES_RX = /^(s[ií]|yes|y|true|1|claro|por supuesto)/i;
const NO_RX = /^(no|n|false|0|ninguno)/i;

export const parseYesNo = (v: unknown): 'yes' | 'no' | null => {
  const s = cleanText(v).toLowerCase();
  if (!s) return null;
  if (YES_RX.test(s)) return 'yes';
  if (NO_RX.test(s)) return 'no';
  return null;
};

export const normalizeModel = (v: unknown): string => {
  const s = cleanText(v);
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\wáéíóúñ\s-]/gi, '')
    .trim();
};

export const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

export type ModelType = 'general' | 'polo' | 'cuello_redondo';

export const getModelFromLead = (lead: InstantFormLead, type: ModelType | 'all'): string => {
  const ca = lead.custom_answers || {};
  if (type === 'polo') return normalizeModel(ca.tipo_de_polo);
  if (type === 'cuello_redondo') return normalizeModel(ca.tipo_de_camisa);
  if (type === 'general') return normalizeModel(ca.modelo_de_camisa);
  // all → first non-empty
  return (
    normalizeModel(ca.modelo_de_camisa) ||
    normalizeModel(ca.tipo_de_polo) ||
    normalizeModel(ca.tipo_de_camisa)
  );
};

// Costa Rica = UTC-6 (sin DST). Todos los cortes por día/mes se calculan
// en CR para que "Hoy" y "Este mes" sean consistentes sin importar la
// zona horaria del navegador.
const CR_OFFSET_MS = -6 * 60 * 60 * 1000;

/** Devuelve el timestamp UTC que corresponde a la medianoche CR del día/mes indicado. */
const crStartTimestamp = (mode: 'today' | 'month'): number => {
  const nowCr = new Date(Date.now() + CR_OFFSET_MS);
  const y = nowCr.getUTCFullYear();
  const m = nowCr.getUTCMonth();
  const d = mode === 'today' ? nowCr.getUTCDate() : 1;
  // medianoche CR = 06:00 UTC de ese día
  return Date.UTC(y, m, d) - CR_OFFSET_MS;
};

export const getRangeCutoff = (rangeDays: string): number | null => {
  if (rangeDays === 'all') return null;
  if (rangeDays === 'today') return crStartTimestamp('today');
  if (rangeDays === 'month') return crStartTimestamp('month');
  const days = parseInt(rangeDays, 10);
  if (!days) return null;
  return Date.now() - days * 24 * 60 * 60 * 1000;
};

export const isInRange = (dateStr: string | null | undefined, rangeDays: string): boolean => {
  const cutoff = getRangeCutoff(rangeDays);
  if (cutoff === null) return true;
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) && t >= cutoff;
};

export const filterByRange = (leads: InstantFormLead[], rangeDays: string): InstantFormLead[] => {
  const cutoff = getRangeCutoff(rangeDays);
  if (cutoff === null) return leads;
  return leads.filter((l) => {
    const ts = l.created_time || l.created_at;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
};

// Buckets exactamente como las opciones del Instant Form de Comfortex
export const VOLUME_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '6–12', min: 6, max: 12 },
  { label: '13–29', min: 13, max: 29 },
  { label: '30–99', min: 30, max: 99 },
  { label: '100+', min: 100, max: Infinity },
];

