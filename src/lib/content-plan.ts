// Plan de contenido estructurado: se guarda como HTML autocontenido con los datos
// embebidos en un <script type="application/json"> para poder re-editarlo.

export type PlanUsage = 'anuncio' | 'organico' | 'ambos';
export type PlanGoal = 'venta' | 'trafico' | '';

export interface PlanTodo { id: string; text: string; done: boolean }
export interface PlanPiece {
  id: string;
  title: string;
  type: string;
  description: string;
  usage: PlanUsage;
  goal: PlanGoal;
  tags: string[];
  notes: string;
  references: string;
  todos: PlanTodo[];
}
export interface ContentPlanData {
  version: 1;
  productionDate: string;
  summary: string;
  pieces: PlanPiece[];
  todos: PlanTodo[];
  extraHtml: string;
}

export const PIECE_TYPES = ['Reel', 'Foto', 'Carrusel', 'Story', 'TikTok', 'Diseño', 'Otro'];
export const USAGE_LABEL: Record<PlanUsage, string> = { anuncio: 'Anuncio', organico: 'Orgánico', ambos: 'Anuncio + Orgánico' };
export const GOAL_LABEL: Record<Exclude<PlanGoal, ''>, string> = { venta: 'Venta', trafico: 'Tráfico' };

const MARKER_ID = 'socialify-content-plan';
export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyPiece = (n: number): PlanPiece => ({
  id: uid(), title: `Pieza ${n}`, type: 'Reel', description: '', usage: 'organico', goal: '',
  tags: [], notes: '', references: '', todos: [],
});

export const emptyPlan = (): ContentPlanData => ({
  version: 1, productionDate: '', summary: '', pieces: [], todos: [], extraHtml: '',
});

/** Ajusta la cantidad de piezas sin perder las ya llenadas. */
export const resizePieces = (pieces: PlanPiece[], count: number): PlanPiece[] => {
  const n = Math.max(0, Math.min(60, Math.floor(count) || 0));
  if (n <= pieces.length) return pieces.slice(0, n);
  const out = [...pieces];
  while (out.length < n) out.push(emptyPiece(out.length + 1));
  return out;
};

export const countByTag = (pieces: PlanPiece[]) => {
  const c = { anuncio: 0, organico: 0, venta: 0, trafico: 0 };
  for (const p of pieces) {
    if (p.usage === 'anuncio' || p.usage === 'ambos') c.anuncio++;
    if (p.usage === 'organico' || p.usage === 'ambos') c.organico++;
    if (p.goal === 'venta') c.venta++;
    if (p.goal === 'trafico') c.trafico++;
  }
  return c;
};

export const parseContentPlan = (html: string): ContentPlanData | null => {
  const m = html.match(new RegExp(`<script type="application/json" id="${MARKER_ID}">([\\s\\S]*?)</script>`));
  if (!m) return null;
  try {
    const data = JSON.parse(m[1].replace(/\\u003c/g, '<'));
    return { ...emptyPlan(), ...data };
  } catch { return null; }
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const multiline = (s: string) => esc(s).replace(/\n/g, '<br>');
const linkify = (s: string) => s.split(/\s+/).filter(Boolean).map((u) =>
  /^https?:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>` : esc(u)).join(' ');

const todosHtml = (todos: PlanTodo[]) => todos.length === 0 ? '' :
  `<ul class="todos">${todos.map((t) => `<li class="${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span>${esc(t.text)}</li>`).join('')}</ul>`;

export const buildContentPlanHtml = (data: ContentPlanData, title: string, clientName: string): string => {
  const c = countByTag(data.pieces);
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const pieces = data.pieces.map((p, i) => `
    <article class="piece">
      <div class="piece-head"><span class="num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(p.title || `Pieza ${i + 1}`)}</h3><span class="type">${esc(p.type)}</span></div></div>
      <div class="tags">
        <span class="tag usage-${p.usage}">${USAGE_LABEL[p.usage]}</span>
        ${p.goal ? `<span class="tag goal-${p.goal}">${GOAL_LABEL[p.goal]}</span>` : ''}
        ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>
      ${p.description ? `<h4>Descripción</h4><p>${multiline(p.description)}</p>` : ''}
      ${p.notes ? `<h4>Guion / notas</h4><p>${multiline(p.notes)}</p>` : ''}
      ${p.references ? `<h4>Referencias</h4><p class="refs">${linkify(p.references)}</p>` : ''}
      ${p.todos.length ? `<h4>Pendientes</h4>${todosHtml(p.todos)}` : ''}
    </article>`).join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--paper:#f6f1e9;--ink:#1a1a19;--muted:#6b665e;--ember:#e8590c;--line:#e3dcd0;--card:#fffdf9}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:'DM Sans',sans-serif;line-height:1.55}
.wrap{max-width:1040px;margin:0 auto;padding:48px 20px 80px}
.brand{font-family:'Space Grotesk';font-weight:700;font-size:20px}.brand b{color:var(--ember)}
header h1{font-family:'Space Grotesk';font-size:clamp(30px,5vw,48px);line-height:1.05;margin:28px 0 8px}
.meta{color:var(--muted);font-size:14px}.summary{font-size:17px;max-width:720px;margin:18px 0 0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:32px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}.stat b{display:block;font-family:'Space Grotesk';font-size:28px}.stat span{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
h2{font-family:'Space Grotesk';font-size:22px;margin:40px 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.piece{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.piece-head{display:flex;gap:12px;align-items:flex-start}.num{font-family:'Space Grotesk';font-weight:700;color:var(--ember);font-size:22px}
.piece h3{margin:0;font-family:'Space Grotesk';font-size:18px}.type{font-size:12px;color:var(--muted)}
.piece h4{margin:14px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.piece p{margin:0;font-size:14px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:#ede6da}
.usage-anuncio{background:#fde3d3;color:#b23f06}.usage-organico{background:#dcefe0;color:#1f6b35}.usage-ambos{background:#e7e0f5;color:#4b3592}
.goal-venta{background:#1a1a19;color:#fff}.goal-trafico{background:#d9e8f7;color:#1d4f80}
.refs a{color:var(--ember);word-break:break-all}
.todos{list-style:none;padding:0;margin:0}.todos li{display:flex;gap:8px;align-items:center;font-size:14px;padding:5px 0}
.box{width:16px;height:16px;border:1.5px solid var(--ink);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none}
.todos li.done{color:var(--muted);text-decoration:line-through}.todos li.done .box{background:var(--ink);color:#fff}
.panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
</style></head><body><div class="wrap">
<div class="brand">socialify<b>.</b></div>
<header><h1>${esc(title)}</h1><div class="meta">${esc(clientName || '')}${data.productionDate ? ` · Producción: ${esc(data.productionDate)}` : ''}</div>
${data.summary ? `<p class="summary">${multiline(data.summary)}</p>` : ''}</header>
<section class="stats">
<div class="stat"><b>${data.pieces.length}</b><span>Piezas</span></div>
<div class="stat"><b>${c.anuncio}</b><span>Anuncio</span></div>
<div class="stat"><b>${c.organico}</b><span>Orgánico</span></div>
<div class="stat"><b>${c.venta}</b><span>Venta</span></div>
<div class="stat"><b>${c.trafico}</b><span>Tráfico</span></div>
</section>
${data.pieces.length ? `<h2>Piezas</h2><div class="grid">${pieces}</div>` : ''}
${data.todos.length ? `<h2>Pendientes</h2><div class="panel">${todosHtml(data.todos)}</div>` : ''}
${data.extraHtml ? `<section style="margin-top:40px">${data.extraHtml}</section>` : ''}
</div><script type="application/json" id="${MARKER_ID}">${json}</script></body></html>`;
};
