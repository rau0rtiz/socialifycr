import { PLATFORM_LABEL, type Platform } from './report-data';

export interface ReportCreative { name: string; reason: string; metrics?: { label: string; value: string }[] }
export interface ReportPlatform {
  platform: Platform;
  summary_cards?: { label: string; value: string; hint?: string }[];
  analysis?: string;
  kpis?: { name: string; value: string; change?: string | null; status?: 'good' | 'bad' | 'neutral'; comment?: string }[];
  charts?: { title: string; type: 'line' | 'bar'; labels: string[]; series: { name: string; data: number[] }[] }[];
  best_creatives?: ReportCreative[];
  worst_creatives?: ReportCreative[];
  alerts?: string[];
  positives?: string[];
  improvements?: string[];
  actions?: string[];
}
export interface ReportContent {
  title?: string;
  intro?: string;
  platforms: ReportPlatform[];
  comparison?: string | null;
  closing?: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const list = (items: string[] | undefined, cls: string) =>
  items?.length ? `<ul class="${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';

export function buildReportHtml(opts: {
  content: ReportContent;
  clientName: string;
  periodLabel: string;
  invoices: Partial<Record<Platform, string>>;
  thumbnails: Record<string, string>; // key: `${platform}::${name}`
  data: unknown;
}) {
  const { content, clientName, periodLabel, invoices, thumbnails } = opts;
  let chartIdx = 0;
  const charts: { id: string; cfg: unknown }[] = [];
  const palette = ['#E9772C', '#1A1916', '#9C968B', '#F2B084', '#5B7A5A'];

  const creativeCard = (p: Platform, c: ReportCreative, tone: 'best' | 'worst') => {
    const img = thumbnails[`${p}::${c.name}`];
    return `<article class="creative ${tone} reveal">
      <div class="thumb">${img ? `<img src="${esc(img)}" alt="${esc(c.name)}" loading="lazy">` : '<span>Sin miniatura</span>'}</div>
      <div class="cbody"><div class="tag">${tone === 'best' ? 'Mejor' : 'A mejorar'}</div>
      <h4>${esc(c.name)}</h4><p>${esc(c.reason)}</p>
      ${c.metrics?.length ? `<div class="mets">${c.metrics.map((m) => `<span><b>${esc(m.value)}</b> ${esc(m.label)}</span>`).join('')}</div>` : ''}
      </div></article>`;
  };

  const sections = content.platforms.map((p, i) => {
    const chartHtml = (p.charts ?? []).map((ch) => {
      const id = `ch${chartIdx++}`;
      charts.push({
        id,
        cfg: {
          type: ch.type === 'bar' ? 'bar' : 'line',
          data: {
            labels: ch.labels,
            datasets: ch.series.map((s, k) => ({
              label: s.name, data: s.data, borderColor: palette[k % 5], backgroundColor: palette[k % 5] + (ch.type === 'bar' ? 'cc' : '22'),
              fill: ch.type !== 'bar', tension: 0.35, borderWidth: 2, pointRadius: 0, borderRadius: 6,
            })),
          },
        },
      });
      return `<div class="chart reveal"><h4>${esc(ch.title)}</h4><div class="cv"><canvas id="${id}"></canvas></div></div>`;
    }).join('');
    return `<section class="platform" id="p-${p.platform}">
      <div class="phead reveal"><span class="num">0${i + 1}</span><h2>${esc(PLATFORM_LABEL[p.platform] ?? p.platform)}</h2></div>
      ${p.summary_cards?.length ? `<div class="cards">${p.summary_cards.map((c) => `<div class="card reveal"><div class="lbl">${esc(c.label)}</div><div class="val">${esc(c.value)}</div>${c.hint ? `<div class="hint">${esc(c.hint)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${p.analysis ? `<div class="block reveal"><div class="eyebrow">Análisis vs meta</div><p class="lead">${esc(p.analysis)}</p></div>` : ''}
      ${p.kpis?.length ? `<div class="block"><div class="eyebrow reveal">KPIs clave</div><div class="kpis">${p.kpis.map((k) => `<div class="kpi ${k.status ?? 'neutral'} reveal"><div class="kn">${esc(k.name)}</div><div class="kv">${esc(k.value)}</div>${k.change ? `<div class="kc">${esc(k.change)}</div>` : ''}${k.comment ? `<p>${esc(k.comment)}</p>` : ''}</div>`).join('')}</div></div>` : ''}
      ${chartHtml ? `<div class="charts">${chartHtml}</div>` : ''}
      ${(p.best_creatives?.length || p.worst_creatives?.length) ? `<div class="block"><div class="eyebrow reveal">Creativos</div><div class="creatives">${(p.best_creatives ?? []).map((c) => creativeCard(p.platform, c, 'best')).join('')}${(p.worst_creatives ?? []).map((c) => creativeCard(p.platform, c, 'worst')).join('')}</div></div>` : ''}
      ${p.alerts?.length ? `<div class="block alert reveal"><div class="eyebrow">Señales de alerta</div>${list(p.alerts, 'dots')}</div>` : ''}
      <div class="two">
        ${p.positives?.length ? `<div class="block reveal"><div class="eyebrow">Lo positivo</div>${list(p.positives, 'check')}</div>` : ''}
        ${p.improvements?.length ? `<div class="block reveal"><div class="eyebrow">Puntos de mejora</div>${list(p.improvements, 'dots')}</div>` : ''}
      </div>
      ${p.actions?.length ? `<div class="block dark reveal"><div class="eyebrow">Acciones a tomar</div><ol class="actions">${p.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></div>` : ''}
    </section>`;
  }).join('');

  const invoiceLinks = (Object.entries(invoices) as [Platform, string][]).filter(([, u]) => u?.trim());
  const dataJson = JSON.stringify(opts.data ?? {}).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="color-scheme" content="light only">
<title>${esc(content.title ?? `${clientName} · ${periodLabel}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
:root{--cream:#F6F1E8;--paper:#FFFFFF;--ink:#1A1916;--muted:#6E6A62;--faint:#9C968B;--orange:#E9772C;--void:#121110;--line:rgba(26,25,22,.12);--card:#FBFAF8;--display:'Sora',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif;}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#fff;-webkit-text-size-adjust:100%}
body{background:var(--paper);color:var(--ink);font-family:var(--body);font-size:clamp(15px,.9vw + 8px,22px);line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wrap{max-width:min(1180px,92vw);margin:0 auto;padding:0 max(18px,env(safe-area-inset-left))}
.top{background:var(--void);color:var(--cream);font-size:.82em}
.top .wrap{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;padding-top:12px;padding-bottom:12px}
.top b{font-family:var(--display);letter-spacing:.1em;text-transform:uppercase;font-size:.8em;color:var(--orange)}
.top a{color:var(--cream);text-decoration:none;border:1px solid rgba(246,241,232,.25);border-radius:999px;padding:4px 12px;transition:.2s}
.top a:hover{background:var(--orange);border-color:var(--orange)}
header.hero{padding:clamp(48px,9vw,120px) 0 clamp(32px,5vw,64px);background:radial-gradient(ellipse at 80% 0%,#fde6d4 0,transparent 55%),var(--cream)}
.wm{font-family:var(--display);font-weight:800;font-size:1.1em}.wm i{color:var(--orange);font-style:normal}
h1{font-family:var(--display);font-weight:800;font-size:clamp(34px,6vw,84px);line-height:1.02;letter-spacing:-.03em;margin:.4em 0 .3em;max-width:16ch}
h1 em{font-style:normal;color:var(--orange)}
.intro{color:var(--muted);max-width:60ch;font-size:1.08em}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}
.chips a{font-family:var(--display);font-weight:600;font-size:.85em;padding:8px 16px;border-radius:999px;background:var(--ink);color:var(--cream);text-decoration:none}
.platform{padding:clamp(40px,6vw,90px) 0;border-top:1px solid var(--line)}
.phead{display:flex;align-items:baseline;gap:16px;margin-bottom:28px}
.num{font-family:var(--display);font-weight:800;color:var(--orange);font-size:1em}
h2{font-family:var(--display);font-weight:800;font-size:clamp(28px,4.5vw,60px);letter-spacing:-.03em;line-height:1}
.eyebrow{font-family:var(--display);font-weight:700;font-size:.72em;letter-spacing:.16em;text-transform:uppercase;color:var(--orange);margin-bottom:12px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px;margin-bottom:28px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.lbl{font-size:.8em;color:var(--muted)}.val{font-family:var(--display);font-weight:800;font-size:clamp(24px,2.6vw,44px);letter-spacing:-.02em;line-height:1.15}
.hint{font-size:.78em;color:var(--faint)}
.block{margin:28px 0}.lead{font-size:1.1em;max-width:70ch}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
.kpi{border:1px solid var(--line);border-radius:18px;padding:16px 18px;background:#fff;border-top:4px solid var(--faint)}
.kpi.good{border-top-color:#3f9b5c}.kpi.bad{border-top-color:#d2452f}
.kn{font-size:.82em;color:var(--muted)}.kv{font-family:var(--display);font-weight:800;font-size:1.6em}
.kc{display:inline-block;font-size:.75em;font-weight:600;padding:2px 10px;border-radius:999px;background:var(--cream);margin:2px 0 6px}
.kpi p{font-size:.86em;color:var(--muted)}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.chart{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px}
.chart h4{font-family:var(--display);font-size:.95em;margin-bottom:10px}.cv{position:relative;height:clamp(220px,26vw,380px)}
.creatives{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:14px}
.creative{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff;transition:transform .3s}
.creative:hover{transform:translateY(-4px)}
.thumb{aspect-ratio:4/5;background:var(--cream);display:grid;place-items:center;color:var(--faint);font-size:.8em}
.thumb img{width:100%;height:100%;object-fit:cover}
.cbody{padding:14px 16px}.cbody h4{font-family:var(--display);font-size:.95em;line-height:1.3;margin:4px 0 6px;word-break:break-word}.cbody p{font-size:.86em;color:var(--muted)}
.tag{display:inline-block;font-size:.68em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:999px;background:#e5f3e9;color:#2d6f42}
.worst .tag{background:#fbe4df;color:#a63524}
.mets{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.mets span{font-size:.75em;background:var(--cream);border-radius:8px;padding:3px 8px}
.alert{background:#fff6f0;border:1px solid #f4c9ab;border-radius:18px;padding:18px 20px}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:0 32px}
ul.check,ul.dots{list-style:none;display:grid;gap:10px}
ul li{position:relative;padding-left:26px}
ul.check li::before{content:"✓";position:absolute;left:0;color:var(--orange);font-weight:800}
ul.dots li::before{content:"";position:absolute;left:4px;top:.6em;width:8px;height:8px;border-radius:50%;background:var(--orange)}
.dark{background:var(--void);color:var(--cream);border-radius:24px;padding:clamp(22px,3vw,40px)}
ol.actions{list-style:none;counter-reset:a;display:grid;gap:14px}
ol.actions li{counter-increment:a;display:flex;gap:14px;align-items:flex-start;font-size:1.02em}
ol.actions li::before{content:counter(a);flex:none;width:30px;height:30px;border-radius:50%;background:var(--orange);color:#fff;font-family:var(--display);font-weight:800;display:grid;place-items:center;font-size:.85em}
.compare{background:var(--cream);border-radius:24px;padding:clamp(22px,3vw,40px);margin:40px 0}
footer{padding:60px 0 80px;text-align:center;color:var(--muted)}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}
@media print{.reveal{opacity:1;transform:none}}
</style></head><body>
${invoiceLinks.length ? `<div class="top"><div class="wrap"><b>Facturas de pauta</b>${invoiceLinks.map(([p, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(PLATFORM_LABEL[p])} ↗</a>`).join('')}</div></div>` : ''}
<header class="hero"><div class="wrap">
<div class="wm">social<i>ify</i></div>
<h1 class="reveal">${esc(clientName)} <em>·</em> ${esc(periodLabel)}</h1>
${content.intro ? `<p class="intro reveal">${esc(content.intro)}</p>` : ''}
<nav class="chips reveal">${content.platforms.map((p) => `<a href="#p-${p.platform}">${esc(PLATFORM_LABEL[p.platform] ?? p.platform)}</a>`).join('')}</nav>
</div></header>
<main class="wrap">
${sections}
${content.comparison ? `<div class="compare reveal"><div class="eyebrow">Evolución vs reporte anterior</div><p class="lead">${esc(content.comparison)}</p></div>` : ''}
</main>
<footer><div class="wrap">${content.closing ? `<p class="reveal">${esc(content.closing)}</p>` : ''}<p style="margin-top:14px" class="wm">social<i>ify</i></p></div></footer>
<script type="application/json" id="socialify-report-data">${dataJson}</script>
<script>
(function(){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  var charts=${JSON.stringify(charts).replace(/</g, '\\u003c')};
  function draw(){ if(!window.Chart) return setTimeout(draw,200);
    Chart.defaults.font.family="Inter, system-ui, sans-serif"; Chart.defaults.color="#6E6A62";
    charts.forEach(function(c){var el=document.getElementById(c.id); if(!el) return;
      var cfg=c.cfg; cfg.options={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:cfg.data.datasets.length>1,position:'bottom'}},
        scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'rgba(26,25,22,.06)'},beginAtZero:true}},
        animation:{duration:1200,easing:'easeOutQuart'}};
      var o=new IntersectionObserver(function(es){if(es[0].isIntersecting){new Chart(el,cfg);o.disconnect();}},{threshold:.2}); o.observe(el);
    });
  } draw();
})();
</script>
</body></html>`;
}
