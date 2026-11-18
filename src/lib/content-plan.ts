// Plan de contenido estructurado: se guarda como HTML autocontenido con los datos
// embebidos en un <script type="application/json"> para poder re-editarlo.
import { parseReferenceUrl } from './embed-url';

export type PlanUsage = 'anuncio' | 'organico' | 'ambos';
export type PlanGoal = 'venta' | 'trafico' | '';

export interface PlanTodo { id: string; text: string; done: boolean }
export interface PlanPiece {
  id: string;
  title: string;
  type: string;
  hook: string;
  description: string;
  visual: string;
  cta: string;
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
  /** Link original → URL final (links cortos resueltos) para poder incrustar el reproductor. */
  resolvedRefs: Record<string, string>;
}

export const PIECE_TYPES = ['Reel', 'Foto', 'Carrusel', 'Story', 'TikTok', 'Diseño', 'Otro'];
export const USAGE_LABEL: Record<PlanUsage, string> = { anuncio: 'Anuncio', organico: 'Orgánico', ambos: 'Anuncio + Orgánico' };
export const GOAL_LABEL: Record<Exclude<PlanGoal, ''>, string> = { venta: 'Venta', trafico: 'Tráfico' };

const MARKER_ID = 'socialify-content-plan';
export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyPiece = (n: number): PlanPiece => ({
  id: uid(), title: `Pieza ${n}`, type: 'Reel', hook: '', description: '', visual: '', cta: '',
  usage: 'organico', goal: '', tags: [], notes: '', references: '', todos: [],
});

export const emptyPlan = (): ContentPlanData => ({
  version: 1, productionDate: '', summary: '', pieces: [], todos: [], extraHtml: '', resolvedRefs: {},
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

export const splitRefs = (s: string) => s.split(/\s+/).map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x));

/** URL del reproductor incrustable para una referencia, o null si solo se puede abrir el link. */
export const referenceEmbed = (url: string, resolved: Record<string, string> = {}): { src: string; vertical: boolean; platform: string } | null => {
  const final = resolved[url] || url;
  const p = parseReferenceUrl(final);
  const tt = final.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (tt) return { src: `https://www.tiktok.com/player/v1/${tt[1]}?description=0&music_info=0`, vertical: true, platform: 'TikTok' };
  if (!p.embedUrl || p.platform === 'other') return null;
  const label = p.platform.startsWith('instagram') ? 'Instagram' : p.platform.startsWith('youtube') ? 'YouTube' : p.platform[0].toUpperCase() + p.platform.slice(1);
  return { src: p.embedUrl, vertical: p.aspect !== 'video', platform: label };
};

export const referencePlatform = (url: string, resolved: Record<string, string> = {}) => {
  const h = (() => { try { return new URL(resolved[url] || url).hostname; } catch { return ''; } })();
  if (h.includes('tiktok')) return 'TikTok';
  if (h.includes('instagram')) return 'Instagram';
  if (h.includes('youtu')) return 'YouTube';
  if (h.includes('facebook') || h.includes('fb.watch')) return 'Facebook';
  return 'el link';
};

export const parseContentPlan = (html: string): ContentPlanData | null => {
  const m = html.match(new RegExp(`<script type="application/json" id="${MARKER_ID}">([\\s\\S]*?)</script>`));
  if (!m) return null;
  try {
    const data = JSON.parse(m[1].replace(/\\u003c/g, '<'));
    const base = { ...emptyPlan(), ...data } as ContentPlanData;
    base.pieces = (base.pieces || []).map((p, i) => ({ ...emptyPiece(i + 1), ...p }));
    base.resolvedRefs = base.resolvedRefs || {};
    return base;
  } catch { return null; }
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const multiline = (s: string) => esc(s).replace(/\n/g, '<br>');

const check = (id: string, text: string, done: boolean) =>
  `<label class="task"><input type="checkbox" data-id="${esc(id)}"${done ? ' checked data-default="1"' : ''}><span></span><em>${esc(text)}</em></label>`;

const playIcon = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4.5v9l7.5-4.5L6 4.5z" fill="currentColor"/></svg>';
const chevron = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export const buildContentPlanHtml = (data: ContentPlanData, title: string, clientName: string): string => {
  const c = countByTag(data.pieces);
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const resolved = data.resolvedRefs || {};
  const pieces = data.pieces.map((p, i) => {
    const refs = splitRefs(p.references);
    const refsHtml = refs.length ? refs.map((r, j) => {
      const e = referenceEmbed(r, resolved);
      return `${e ? `<div class="player${e.vertical ? ' v' : ''}"><iframe src="${esc(e.src)}" title="Referencia ${j + 1}" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : ''}<a class="ref" href="${esc(r)}" target="_blank" rel="noopener noreferrer"><span class="ref-icon">${playIcon}</span><span><b>Referencia ${j + 1}</b><small>Abrir en ${referencePlatform(r, resolved)}</small></span></a>`;
    }).join('') : '<p class="no-ref">Sin referencia por ahora.</p>';
    const rows = [
      p.description && `<div><dt>Contenido</dt><dd>${multiline(p.description)}</dd></div>`,
      p.notes && `<div><dt>Guion / notas</dt><dd>${multiline(p.notes)}</dd></div>`,
      p.visual && `<div class="visual"><dt>Propuesta visual</dt><dd>${multiline(p.visual)}</dd></div>`,
      p.cta && `<div><dt>Llamado a la acción</dt><dd>${multiline(p.cta)}</dd></div>`,
    ].filter(Boolean).join('');
    const extraTags = [p.goal ? `<span class="tag goal">${GOAL_LABEL[p.goal]}</span>` : '', ...p.tags.map((t) => `<span class="tag soft">${esc(t)}</span>`)].join('');
    return `
  <article class="video u-${p.usage}" data-usage="${p.usage}" data-goal="${p.goal}" data-n="${i}">
    <div class="video-head" role="button" tabindex="0" aria-expanded="false">
      <span class="num">${i + 1}</span>
      <div class="video-title">
        <div class="tags"><span class="tag main">${USAGE_LABEL[p.usage]}</span><span class="tag soft">${esc(p.type)}</span>${extraTags}</div>
        <h3>${esc(p.title || `Pieza ${i + 1}`)}</h3>
        ${p.hook ? `<p class="hook">${esc(p.hook)}</p>` : ''}
      </div>
      ${p.todos.length ? `<span class="mini" data-mini="${i}"></span>` : ''}
      <span class="toggle">${chevron}</span>
    </div>
    <div class="video-body">
      <div class="refs"><p class="col-label">Referencias</p>${refsHtml}</div>
      <div class="details">
        ${rows ? `<dl>${rows}</dl>` : ''}
        ${p.todos.length ? `<div class="tasks"><p class="col-label">Lo que necesitamos</p>${p.todos.map((t) => check(`${p.id}:${t.id}`, t.text, t.done)).join('')}</div>` : ''}
      </div>
    </div>
  </article>`;
  }).join('');

  const hasAllTodos = data.pieces.some((p) => p.todos.length) || data.todos.length;
  const filters = [
    ['todos', 'Todos', true],
    ['anuncio', 'Anuncios', c.anuncio > 0],
    ['organico', 'Orgánicos', c.organico > 0],
    ['venta', 'Venta', c.venta > 0],
    ['trafico', 'Tráfico', c.trafico > 0],
  ].filter((f) => f[2]).map(([k, l], i) => `<button aria-pressed="${i === 0}" data-f="${k}">${l}</button>`).join('');

  const stats = [
    [data.pieces.length, data.pieces.length === 1 ? 'pieza' : 'piezas'],
    [c.anuncio, 'para anuncio'], [c.organico, 'orgánicas'], [c.venta, 'de venta'], [c.trafico, 'de tráfico'],
  ].filter(([n], i) => i === 0 || Number(n) > 0).map(([n, l]) => `<div><b>${n}</b>${l}</div>`).join('');

  const prodDate = data.productionDate
    ? new Date(`${data.productionDate}T12:00:00`).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase())
    : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#F6F1E9;--surface:#FFFDF9;--ink:#1A1A19;--muted:#6B665E;--line:#E5DDD0;
--accent:#E8590C;--accent-soft:#FCE8DA;--main:#1A1A19;--main-soft:#EDE6DA;--org:#4E7A3A;--org-soft:#E4EEDB;--done:#2F8A5B;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1A1A19;--surface:#232321;--ink:#F3EEE6;--muted:#A39C91;--line:#34332F;
--accent:#FF7A2E;--accent-soft:#3A2518;--main:#F3EEE6;--main-soft:#2E2D2A;--org:#9CCB7E;--org-soft:#24301E;--done:#5CC59C;color-scheme:dark}}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"DM Sans",system-ui,sans-serif;font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
h1,h2,h3,.num,.meta b,.agency{font-family:"Space Grotesk",system-ui,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:56px 24px 80px}
header{padding-bottom:36px;border-bottom:1px solid var(--line);margin-bottom:36px}
.agency{display:block;text-align:center;margin:0 0 32px;font-size:1.05rem;font-weight:700;letter-spacing:-.01em}
.agency i{color:var(--accent);font-style:normal}
.brand{color:var(--accent);font-weight:600;font-size:.95rem;margin-bottom:16px}
h1{font-size:clamp(2rem,5vw,2.8rem);line-height:1.08;letter-spacing:-.02em;margin:0 0 14px;font-weight:700}
.lede{color:var(--muted);max-width:62ch;margin:0}
.meta{display:flex;flex-wrap:wrap;gap:28px;margin-top:28px;font-size:.9rem;color:var(--muted)}
.meta b{display:block;color:var(--ink);font-size:1.6rem;font-weight:600;line-height:1.2}
.date{margin-top:18px;font-size:.9rem;color:var(--muted)}.date b{color:var(--ink);font-weight:600}
.progress{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin-bottom:40px}
.progress-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;font-size:.95rem}
.progress-top strong{font-size:1.1rem}
.bar{height:6px;background:var(--line);border-radius:99px;overflow:hidden}
.bar span{display:block;height:100%;width:0;background:var(--done);border-radius:99px;transition:width .4s ease}
h2{font-size:1.35rem;letter-spacing:-.01em;margin:48px 0 16px;font-weight:600}
.filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
.filters button{font:inherit;font-size:.9rem;padding:8px 16px;border-radius:99px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.filters button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.filters .expand{margin-left:auto;background:none;border:0;color:var(--accent);padding:8px 4px}
.video{background:var(--surface);border:1px solid var(--line);border-radius:14px;margin-bottom:16px;overflow:hidden}
.video{--c:var(--accent);--cs:var(--accent-soft)}
.video.u-organico{--c:var(--org);--cs:var(--org-soft)}
.video.u-ambos{--c:var(--main);--cs:var(--main-soft)}
.video{border-top:4px solid var(--c)}
.video-head{display:flex;gap:16px;align-items:flex-start;padding:22px 24px;cursor:pointer}
.video.open .video-head{border-bottom:1px solid var(--line)}
.num{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:.95rem;background:var(--cs);color:var(--c)}
.video-title{flex:1;min-width:0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.tag{display:inline-block;font-size:.76rem;font-weight:600;padding:2px 10px;border-radius:99px}
.tag.main{background:var(--cs);color:var(--c)}
.tag.soft{background:var(--main-soft);color:var(--muted)}
.tag.goal{background:var(--ink);color:var(--bg)}
.video h3{margin:0;font-size:1.15rem;line-height:1.3;font-weight:600}
.hook{color:var(--muted);margin:4px 0 0;font-size:.95rem}
.mini{font-size:.82rem;color:var(--muted);white-space:nowrap;margin-top:4px}
.mini.complete{color:var(--done);font-weight:600}
.toggle{flex:none;color:var(--muted);padding:6px;display:grid}
.toggle svg{transition:transform .2s}.video.open .toggle svg{transform:rotate(180deg)}
.video-body{display:none;grid-template-columns:minmax(220px,34%) 1fr}
.video.open .video-body{display:grid}
.refs{padding:22px 24px;background:var(--bg);border-right:1px solid var(--line)}
.col-label{font-size:.82rem;font-weight:600;color:var(--muted);margin:0 0 10px}
.player{margin-bottom:10px}
.player iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:12px;background:#000}
.player.v iframe{aspect-ratio:9/16;max-height:600px}
.ref{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:14px;transition:border-color .15s}
.ref:hover{border-color:var(--accent)}
.ref-icon{flex:none;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}
.ref b{display:block;font-size:.95rem;font-weight:600}.ref small{color:var(--muted);font-size:.82rem}
.no-ref{font-size:.9rem;color:var(--muted);border:1px dashed var(--line);border-radius:12px;padding:14px;margin:0}
.details{padding:22px 24px}
dl{margin:0 0 18px;display:grid;gap:14px}
dt{font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:2px}
dd{margin:0;max-width:62ch}
.visual{background:var(--bg);border:1px dashed var(--line);border-radius:10px;padding:14px 16px}
.visual dt{color:var(--accent)}
.tasks{border-top:1px solid var(--line);padding-top:14px}
.task{display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer;font-size:.95rem;position:relative}
.task input{position:absolute;opacity:0;width:1px;height:1px}
.task span{width:20px;height:20px;border:1.5px solid var(--line);border-radius:6px;display:grid;place-items:center;flex:none;background:var(--surface);transition:background .15s,border-color .15s}
.task input:checked+span{background:var(--done);border-color:var(--done)}
.task input:checked+span::after{content:"";width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}
.task input:checked~em{color:var(--muted);text-decoration:line-through}
.task em{font-style:normal}
.task input:focus-visible+span,.video-head:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.recs{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:8px 22px}
.recs .task{border-top:1px solid var(--line);padding:12px 0}.recs .task:first-child{border-top:0}
.extra{margin-top:40px}
footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:.85rem}
footer button{font:inherit;background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0}
[hidden]{display:none!important}
@media (max-width:720px){.wrap{padding:36px 16px 60px}.video-body{grid-template-columns:1fr}.refs{border-right:0;border-bottom:1px solid var(--line);padding:18px}.details{padding:18px}.video-head{padding:18px;gap:12px}.num{width:34px;height:34px;font-size:.88rem}.mini{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
@media print{.filters,footer button,.toggle{display:none}.video-body{display:grid!important}}
</style></head><body><div class="wrap">
<header>
  <p class="agency">socialify<i>.</i></p>
  ${clientName ? `<div class="brand">${esc(clientName)}</div>` : ''}
  <h1>${esc(title)}</h1>
  ${data.summary ? `<p class="lede">${multiline(data.summary)}</p>` : ''}
  <div class="meta">${stats}</div>
  ${prodDate ? `<p class="date">Producción: <b>${esc(prodDate)}</b></p>` : ''}
</header>
${hasAllTodos ? `<section class="progress" aria-live="polite"><div class="progress-top"><span>Preparación para grabar</span><strong id="pct">0%</strong></div><div class="bar"><span id="bar"></span></div></section>` : ''}
${data.pieces.length ? `<h2>Piezas</h2>
<div class="filters" role="group" aria-label="Filtrar piezas">${filters}<button class="expand" id="expand">Abrir todos</button></div>
<div id="videos">${pieces}</div>` : ''}
${data.todos.length ? `<h2>Recomendaciones generales</h2><div class="recs">${data.todos.map((t) => check(`plan:${t.id}`, t.text, t.done)).join('')}</div>` : ''}
${data.extraHtml ? `<section class="extra">${data.extraHtml}</section>` : ''}
<footer><span>Plan preparado por Socialify</span>${hasAllTodos ? '<button id="reset">Reiniciar checklist</button>' : ''}</footer>
</div>
<script type="application/json" id="${MARKER_ID}">${json}</script>
<script>
(function(){
  var KEY='socialify-plan:'+location.pathname+':'+document.title;
  var state={};try{state=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
  var save=function(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
  var boxes=[].slice.call(document.querySelectorAll('.task input'));
  boxes.forEach(function(b){var id=b.dataset.id;if(id in state)b.checked=!!state[id];
    b.addEventListener('change',function(){state[id]=b.checked;save();update()})});
  function update(){
    var done=boxes.filter(function(b){return b.checked}).length;
    var pct=boxes.length?Math.round(done*100/boxes.length):0;
    var p=document.getElementById('pct'),bar=document.getElementById('bar');
    if(p)p.textContent=pct+'%';if(bar)bar.style.width=pct+'%';
    document.querySelectorAll('[data-mini]').forEach(function(m){
      var bs=m.closest('.video').querySelectorAll('.task input');var d=[].filter.call(bs,function(b){return b.checked}).length;
      m.textContent=d===bs.length?'Listo':d+' de '+bs.length+' listos';m.classList.toggle('complete',d===bs.length)});
  }
  var cards=[].slice.call(document.querySelectorAll('.video'));
  function setOpen(c,o){c.classList.toggle('open',o);c.querySelector('.video-head').setAttribute('aria-expanded',o)}
  var ex=document.getElementById('expand');
  function syncExpand(){if(!ex)return;var vis=cards.filter(function(c){return !c.hidden});ex.textContent=vis.length&&vis.every(function(c){return c.classList.contains('open')})?'Cerrar todos':'Abrir todos'}
  cards.forEach(function(c){var h=c.querySelector('.video-head');
    var t=function(){setOpen(c,!c.classList.contains('open'));syncExpand()};
    h.addEventListener('click',t);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}})});
  if(ex)ex.addEventListener('click',function(){var o=ex.textContent==='Abrir todos';cards.forEach(function(c){if(!c.hidden)setOpen(c,o)});syncExpand()});
  document.querySelectorAll('.filters [data-f]').forEach(function(btn){btn.addEventListener('click',function(){
    document.querySelectorAll('.filters [data-f]').forEach(function(b){b.setAttribute('aria-pressed',b===btn)});
    var f=btn.dataset.f;cards.forEach(function(c){var u=c.dataset.usage,g=c.dataset.goal;
      c.hidden=!(f==='todos'||(f==='anuncio'&&u!=='organico')||(f==='organico'&&u!=='anuncio')||f===g)});syncExpand()})});
  var r=document.getElementById('reset');
  if(r)r.addEventListener('click',function(){state={};save();boxes.forEach(function(b){b.checked=b.dataset.default==='1'});update()});
  if(cards[0])setOpen(cards[0],true);
  update();syncExpand();
})();
</script></body></html>`;
};
