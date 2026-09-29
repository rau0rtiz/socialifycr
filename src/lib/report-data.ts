import * as XLSX from 'xlsx';

export type Platform = 'meta' | 'tiktok' | 'google';
export const PLATFORM_LABEL: Record<Platform, string> = { meta: 'Meta', tiktok: 'TikTok', google: 'Google' };

export interface ParsedTable {
  headers: string[];
  rows: Record<string, unknown>[];
}

const toNum = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/[\s$₡%]/g, '').replace(/USD|CRC/gi, '');
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  // 1.234,56 -> 1234.56 ; 1,234.56 -> 1234.56 ; 11.900 -> 11900
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = /,\d{3}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (/\.\d{3}$/.test(s) && (s.match(/\./g) || []).length >= 1 && !/^0\./.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const parseXml = (text: string): ParsedTable => {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  // Buscar el elemento repetido más frecuente con hijos simples
  const counts = new Map<string, Element[]>();
  doc.querySelectorAll('*').forEach((el) => {
    if (el.children.length > 0 && Array.from(el.children).every((c) => c.children.length === 0)) {
      const arr = counts.get(el.tagName) ?? [];
      arr.push(el);
      counts.set(el.tagName, arr);
    }
  });
  const best = [...counts.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const headers = new Set<string>();
  const rows = best.map((el) => {
    const r: Record<string, unknown> = {};
    Array.from(el.attributes).forEach((a) => { r[a.name] = a.value; headers.add(a.name); });
    Array.from(el.children).forEach((c) => { r[c.tagName] = c.textContent ?? ''; headers.add(c.tagName); });
    return r;
  });
  return { headers: [...headers], rows };
};

export async function parseDataFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xml')) return parseXml(await file.text());
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const rows: Record<string, unknown>[] = [];
  const headers = new Set<string>();
  wb.SheetNames.forEach((sn) => {
    const r = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sn], { defval: null, raw: true });
    r.forEach((row) => {
      Object.keys(row).forEach((k) => headers.add(k));
      if (wb.SheetNames.length > 1) row.__hoja = sn;
      rows.push(row);
    });
  });
  return { headers: [...headers], rows };
}

const DATE_RE = /(fecha|date|día|dia|day|inicio del informe|reporting starts)/i;
const SPEND_RE = /(importe gastado|amount spent|spend|gasto|costo|cost|inversi)/i;
const NAME_RE = /(nombre del anuncio|ad name|anuncio|creative|creativo|ad\b|video name|campaign name|nombre de la campaña)/i;
const THUMB_RE = /(thumbnail|miniatura|image url|imagen|preview|creative url)/i;

const toDateKey = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 30000 && v < 60000) {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
};

export interface DatasetSummary {
  file: string;
  description: string;
  row_count: number;
  columns: string[];
  totals: Record<string, number>;
  daily_series?: { labels: string[]; series: Record<string, number[]> };
  top_rows: Record<string, unknown>[];
  thumbnails: Record<string, string>;
}

/** Calcula cifras exactas en el navegador para que la IA no invente números. */
export function summarize(table: ParsedTable, file: string, description: string, range?: { from?: string; to?: string }): DatasetSummary {
  const dateCol = table.headers.find((h) => DATE_RE.test(h));
  let rows = table.rows;
  if (dateCol && (range?.from || range?.to)) {
    rows = rows.filter((r) => {
      const k = toDateKey(r[dateCol]);
      if (!k) return true;
      return (!range.from || k >= range.from) && (!range.to || k <= range.to);
    });
  }
  const numericCols = table.headers.filter((h) => {
    if (h === dateCol) return false;
    const vals = rows.slice(0, 50).map((r) => r[h]).filter((v) => v !== null && v !== '');
    return vals.length > 0 && vals.filter((v) => toNum(v) !== null).length / vals.length > 0.8;
  });
  const totals: Record<string, number> = {};
  numericCols.forEach((c) => {
    totals[c] = Math.round(rows.reduce((s, r) => s + (toNum(r[c]) ?? 0), 0) * 100) / 100;
  });

  let daily_series: DatasetSummary['daily_series'];
  if (dateCol) {
    const byDay = new Map<string, Record<string, number>>();
    rows.forEach((r) => {
      const k = toDateKey(r[dateCol]);
      if (!k) return;
      const acc = byDay.get(k) ?? {};
      numericCols.slice(0, 15).forEach((c) => { acc[c] = (acc[c] ?? 0) + (toNum(r[c]) ?? 0); });
      byDay.set(k, acc);
    });
    const labels = [...byDay.keys()].sort();
    if (labels.length > 1) {
      const series: Record<string, number[]> = {};
      numericCols.slice(0, 15).forEach((c) => {
        series[c] = labels.map((l) => Math.round((byDay.get(l)?.[c] ?? 0) * 100) / 100);
      });
      daily_series = { labels, series };
    }
  }

  const spendCol = numericCols.find((c) => SPEND_RE.test(c));
  const sorted = spendCol ? [...rows].sort((a, b) => (toNum(b[spendCol]) ?? 0) - (toNum(a[spendCol]) ?? 0)) : rows;
  const top_rows = sorted.slice(0, 120);

  const nameCol = table.headers.find((h) => NAME_RE.test(h));
  const thumbCol = table.headers.find((h) => THUMB_RE.test(h));
  const thumbnails: Record<string, string> = {};
  if (nameCol && thumbCol) {
    rows.forEach((r) => {
      const u = String(r[thumbCol] ?? '');
      if (/^https?:\/\//.test(u)) thumbnails[String(r[nameCol])] = u;
    });
  }

  return { file, description, row_count: rows.length, columns: table.headers, totals, daily_series, top_rows, thumbnails };
}

export const htmlToText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style').forEach((e) => e.remove());
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 15000);
};

export const extractReportData = (html: string): unknown | null => {
  const m = html.match(/<script type="application\/json" id="socialify-report-data">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1].replace(/\\u003c/g, '<')); } catch { return null; }
};
