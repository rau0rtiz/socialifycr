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

export const filterByRange = (leads: InstantFormLead[], rangeDays: string): InstantFormLead[] => {
  if (rangeDays === 'all') return leads;
  const days = parseInt(rangeDays, 10);
  if (!days) return leads;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return leads.filter((l) => {
    if (!l.created_time) return false;
    return new Date(l.created_time).getTime() >= cutoff;
  });
};

export const VOLUME_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '1–10', min: 1, max: 10 },
  { label: '11–50', min: 11, max: 50 },
  { label: '51–100', min: 51, max: 100 },
  { label: '101–500', min: 101, max: 500 },
  { label: '500+', min: 501, max: Infinity },
];
