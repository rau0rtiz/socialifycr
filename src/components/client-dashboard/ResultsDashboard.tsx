import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, CalendarRange, Instagram, Facebook, Loader2, Medal, PlayCircle, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { presetRange, RANGE_LABEL, type RangePreset } from '@/lib/dashboard-range';

export type DashSection = 'campanas' | 'cuentas' | 'leads';
type Metrics = { spend: number; reach: number; impressions: number; frequency: number; results: number; cost_per_result: number | null; purchase_value: number; roas: number | null; link_clicks: number; video: null | { plays: number; p25: number; p50: number; p75: number; p100: number; thruplays: number; avg_seconds: number } };
type Ad = { id: string; name: string; campaign_id: string; result_type: string; metrics: Metrics; thumbnail?: string | null; video_url?: string | null; preview_url?: string | null; body?: string | null; title?: string | null; is_video?: boolean };
export interface DashboardData {
  configured: boolean; currency?: string; fetched_at?: string; stale?: boolean; errors?: string[];
  totals?: { result_type: string; label: { many: string; cost: string }; spend: number; reach: number; results: number; cost_per_result: number | null; roas: number | null; purchase_value: number; previous: { spend: number; reach: number; results: number } | null; goal: { target: number | null; max_cost: number | null; min_roas: number | null } | null }[];
  campaigns?: { id: string; name: string; active: boolean; result_type: string; metrics: Metrics }[];
  ads?: Ad[]; daily?: Record<string, number | string>[];
  accounts?: { platform: string; name: string; handle: string | null; picture: string | null; followers: number | null; gained: number | null; series: { date: string; value: number }[] }[];
  leads?: { total: number; by_source: { name: string; count: number }[]; recent: { name: string | null; date: string; source: string | null }[] } | null;
  delivery?: { scheduled: number; approved: number };
}

const LABEL: Record<string, { many: string; cost: string; color: string }> = {
  purchase: { many: 'Compras', cost: 'Costo por compra', color: 'hsl(var(--primary))' },
  messages: { many: 'Conversaciones', cost: 'Costo por conversación', color: 'hsl(var(--chart-2, 160 60% 45%))' },
  leads: { many: 'Leads', cost: 'Costo por lead', color: 'hsl(var(--chart-3, 200 70% 55%))' },
  traffic: { many: 'Visitas', cost: 'Costo por visita', color: 'hsl(var(--chart-4, 45 90% 55%))' },
  reach: { many: 'Personas alcanzadas', cost: 'Costo por mil', color: 'hsl(var(--chart-5, 280 60% 65%))' },
};
const int = (n: number) => Math.round(n).toLocaleString('es-CR');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Delta({ now, prev }: { now: number; prev?: number | null }) {
  if (!prev) return null;
  const d = ((now - prev) / prev) * 100;
  if (!Number.isFinite(d) || Math.abs(d) < 0.5) return <span className="text-xs text-muted-foreground">igual que antes</span>;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center text-xs font-semibold ${d > 0 ? 'text-success' : 'dashboard-delta-down'}`}><Icon className="h-3.5 w-3.5" />{Math.abs(Math.round(d))}%</span>;
}

function Retention({ v }: { v: NonNullable<Metrics['video']> }) {
  const base = v.plays || v.p25 || 1;
  const rows = [['Empezó', v.plays || v.p25], ['25 %', v.p25], ['50 %', v.p50], ['75 %', v.p75], ['Completo', v.p100]] as const;
  return (
    <div className="space-y-1.5">
      {rows.map(([l, n]) => (
        <div key={l} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-muted-foreground">{l}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct(n, base))}%` }} /></div>
          <span className="w-10 text-right tabular-nums">{pct(n, base)}%</span>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">{int(v.thruplays)} ThruPlays · {v.avg_seconds ? `${Math.round(v.avg_seconds)} s promedio visto` : 'sin tiempo promedio'}</p>
    </div>
  );
}

export function ResultsDashboard({ section, fetcher, cacheKey, dialogClassName = '', calendar, enabledSections, hideRange = false, compact = false }: {
  hideRange?: boolean; compact?: boolean;
  section: DashSection | 'overview'; calendar?: ReactNode; enabledSections?: { accounts: boolean; campaigns: boolean; leads: boolean }; cacheKey: unknown[]; dialogClassName?: string;
  fetcher: (r: { since: string; until: string }) => Promise<DashboardData>;
}) {
  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [custom, setCustom] = useState<DateRange | undefined>();
  const range = useMemo(() => {
    if (preset === 'custom' && custom?.from) {
      const f = (d: Date) => format(d, 'yyyy-MM-dd');
      return { since: f(custom.from), until: f(custom.to ?? custom.from) };
    }
    return presetRange(preset === 'custom' ? 'this_month' : preset);
  }, [preset, custom]);
  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [adId, setAdId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: [...cacheKey, range.since, range.until], queryFn: () => fetcher(range), staleTime: 5 * 60_000, retry: 1 });

  const money = (n: number | null | undefined) => n == null ? '—' : data?.currency === 'CRC'
    ? `₡${Math.round(n).toLocaleString('es-CR')}` : `$${n.toLocaleString('en-US', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
  const costOf = (type: string, c: number | null) => c == null ? '—' : money(c);

  const chart = useMemo(() => {
    const rows = data?.daily ?? [];
    if (bucket === 'day') return rows;
    const out = new Map<string, Record<string, number | string>>();
    for (const r of rows) {
      const d = new Date(`${r.date}T00:00:00Z`);
      const k = bucket === 'month' ? String(r.date).slice(0, 7) : new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
      const acc = out.get(k) ?? { date: k };
      for (const [f, v] of Object.entries(r)) if (f !== 'date') acc[f] = Number(acc[f] ?? 0) + Number(v);
      out.set(k, acc);
    }
    return [...out.values()];
  }, [data?.daily, bucket]);

  const types = [...new Set((data?.totals ?? []).map((t) => t.result_type))];
  const camp = data?.campaigns?.find((c) => c.id === campaignId) ?? null;
  const campAds = (data?.ads ?? []).filter((a) => a.campaign_id === campaignId);
  const ad = data?.ads?.find((a) => a.id === adId) ?? null;
  const topAds = (() => {
    const out: Ad[] = []; const seen = new Set<string>();
    for (const a of data?.ads ?? []) if (a.metrics.results > 0 && !seen.has(a.result_type)) { out.push(a); seen.add(a.result_type); }
    for (const a of data?.ads ?? []) if (out.length < 3 && a.metrics.results > 0 && !out.includes(a)) out.push(a);
    return out.slice(0, 3);
  })();

  const card = compact ? 'rounded-lg border border-border bg-card p-3 sm:p-4' : 'rounded-2xl border border-border bg-card p-4';
  return (
    <div className={compact ? 'space-y-3 sm:space-y-5' : 'space-y-5'}>
      {!hideRange && <><div className={compact ? 'grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2' : 'flex flex-wrap items-center gap-2'}>
        {(['today', 'yesterday', 'last_7d', 'this_month', 'last_month'] as const).map((p) => (
          <Button key={p} variant="outline" type="button" onClick={() => setPreset(p)} className={`min-h-11 rounded-lg px-2 text-xs sm:px-3 sm:text-sm ${preset === p ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'border-border bg-card text-muted-foreground'}`}>{RANGE_LABEL[p]}</Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" type="button" className={`inline-flex h-auto min-h-11 items-center gap-1.5 whitespace-normal rounded-lg px-2 text-xs sm:px-3 sm:text-sm ${preset === 'custom' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>
              <CalendarRange className="h-4 w-4" />{preset === 'custom' && custom?.from ? `${format(custom.from, 'd MMM', { locale: es })} – ${format(custom.to ?? custom.from, 'd MMM yyyy', { locale: es })}` : 'Personalizado'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className={`w-auto p-0 ${dialogClassName}`} align="start">
            <Calendar mode="range" numberOfMonths={1} locale={es} selected={custom} disabled={{ after: new Date() }}
              onSelect={(r) => { setCustom(r); if (r?.from) setPreset('custom'); }} className="pointer-events-auto p-3" />
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">{range.since === range.until ? range.since : `${range.since} → ${range.until}`}{data?.fetched_at && ` · actualizado ${new Date(data.fetched_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`}{data?.stale && ' · mostrando los últimos datos guardados'}</p></>}

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : error || !data ? <div className={`${card} text-center text-sm text-muted-foreground`}>No se pudieron cargar los resultados. Probá de nuevo en un rato.</div>
        : !data.configured ? <div className={`${card} text-center text-sm text-muted-foreground`}>Este panel todavía no está configurado.</div>
        : <>
          {(section === 'cuentas' || (section === 'overview' && enabledSections?.accounts)) && <section className="space-y-4" aria-label="Seguidores"><h2 className="text-xl font-bold">Seguidores</h2>{(
            (data.accounts ?? []).length === 0 ? <div className={`${card} text-center text-sm text-muted-foreground`}>No hay cuentas de Instagram o Facebook conectadas.</div> :
            <div className="flex flex-wrap items-center gap-x-12 gap-y-6 py-4">
              {(data.accounts ?? []).map((a) => {
                const Icon = a.platform === 'instagram' ? Instagram : Facebook;
                return (
                  <div key={`${a.platform}-${a.name}`} className="flex items-center gap-4" aria-label={`${a.platform === 'instagram' ? 'Instagram' : 'Facebook'}: ${a.followers != null ? int(a.followers) : 'sin datos'} seguidores`}>
                    <Icon className="h-9 w-9 shrink-0 text-foreground" aria-hidden="true" />
                    <p className="text-3xl font-bold tabular-nums">{a.followers != null ? int(a.followers) : '—'}</p>
                  </div>
                );
              })}
            </div>
          )}</section>}


          {section === 'overview' && calendar}
          {(section === 'campanas' || (section === 'overview' && enabledSections?.campaigns)) && <>
            {section === 'overview' && <h2 className="border-t border-border pt-8 text-xl font-bold">Desempeño de campañas</h2>}
            {(data.totals ?? []).length === 0 ? <div className={`${card} text-center text-sm text-muted-foreground`}>No hubo campañas con inversión en este período.</div> : <>
              {(data.totals ?? []).map((t) => {
                const L = LABEL[t.result_type];
                const goalPct = t.goal?.target ? Math.min(100, pct(t.results, t.goal.target)) : null;
                return (
                  <section key={t.result_type} className={card}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Campañas de {L.many.toLowerCase()}</h3>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div><p className="text-xs text-muted-foreground">Inversión</p><p className="text-2xl font-bold tabular-nums">{money(t.spend)}</p><Delta now={t.spend} prev={t.previous?.spend} /></div>
                      <div><p className="text-xs text-muted-foreground">Personas alcanzadas</p><p className="text-2xl font-bold tabular-nums">{int(t.reach)}</p><Delta now={t.reach} prev={t.previous?.reach} /></div>
                      <div><p className="text-xs text-muted-foreground">{L.many}</p><p className="text-2xl font-bold tabular-nums">{int(t.results)}</p><Delta now={t.results} prev={t.previous?.results} /></div>
                      <div><p className="text-xs text-muted-foreground">{L.cost}</p><p className="text-2xl font-bold tabular-nums">{costOf(t.result_type, t.cost_per_result)}</p>
                        {t.roas != null && <p className="text-xs font-semibold text-primary">ROAS {t.roas.toFixed(1)}× · vendido {money(t.purchase_value)}</p>}</div>
                    </div>
                    {goalPct != null && <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Meta del mes</span><span className="font-semibold">{int(t.results)} / {int(t.goal?.target ?? 0)}</span></div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${goalPct}%` }} /></div>
                      {(t.goal?.max_cost || t.goal?.min_roas) && <p className="mt-1 text-xs text-muted-foreground">{t.goal.max_cost ? `Costo objetivo: máx. ${money(t.goal.max_cost)}` : ''}{t.goal.max_cost && t.goal.min_roas ? ' · ' : ''}{t.goal.min_roas ? `ROAS objetivo: ${t.goal.min_roas}×` : ''}</p>}
                    </div>}
                    {t.result_type !== 'reach' && t.results > 0 && <p className="mt-3 text-sm">En este período tus campañas generaron <b>{int(t.results)} {L.many.toLowerCase()}</b> a <b>{money(t.cost_per_result)}</b> cada una.</p>}
                  </section>
                );
              })}

              {chart.length > 1 && <section className={card}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Resultados en el tiempo</h3>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">{(['day', 'week', 'month'] as const).map((b) => <button key={b} type="button" onClick={() => setBucket(b)} className={`rounded-full px-2.5 py-1 text-xs ${bucket === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{b === 'day' ? 'Día' : b === 'week' ? 'Semana' : 'Mes'}</button>)}</div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} />
                      {types.filter((t) => t !== 'reach').map((t) => <Area key={t} type="monotone" dataKey={t} name={LABEL[t].many} stroke={LABEL[t].color} fill={LABEL[t].color} fillOpacity={0.15} strokeWidth={2} />)}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>}

              {topAds.length > 0 && <section>
                <h3 className="mb-3 text-sm font-semibold">Mejores anuncios</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">{topAds.map((a, i) => <AdTile key={a.id} ad={a} rank={i} money={money} onOpen={() => setAdId(a.id)} />)}</div>
              </section>}

              <section>
                <h3 className="mb-3 text-sm font-semibold">Campañas</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(data.campaigns ?? []).map((c) => {
                    const best = (data.ads ?? []).find((a) => a.campaign_id === c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => setCampaignId(c.id)} className={`${card} flex gap-3 text-left transition hover:border-primary/60`}>
                        {best?.thumbnail ? <img src={best.thumbnail} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-20 w-16 shrink-0 rounded-lg bg-secondary" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${c.active ? 'bg-primary' : 'bg-muted-foreground'}`} /><span className="text-xs text-muted-foreground">{c.active ? 'En circulación' : 'Pausada'} · {LABEL[c.result_type].many}</span></div>
                          <p className="mt-1 truncate font-semibold">{c.name}</p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div><p className="text-muted-foreground">Inversión</p><p className="font-semibold tabular-nums">{money(c.metrics.spend)}</p></div>
                            <div><p className="text-muted-foreground">{LABEL[c.result_type].many}</p><p className="font-semibold tabular-nums">{int(c.metrics.results)}</p></div>
                            <div><p className="text-muted-foreground">Costo</p><p className="font-semibold tabular-nums">{costOf(c.result_type, c.metrics.cost_per_result)}</p></div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>}
            {!!data.errors?.length && <p className="text-xs text-muted-foreground">Algunos datos de Meta no se pudieron leer en este momento.</p>}
          </>}

          {(section === 'leads' || (section === 'overview' && enabledSections?.leads)) && (() => {
            const L = data.leads;
            const reach = (data.totals ?? []).reduce((s, t) => s + t.reach, 0);
            const contacts = (data.totals ?? []).filter((t) => ['messages', 'leads'].includes(t.result_type)).reduce((s, t) => s + t.results, 0);
            const steps = [['Personas alcanzadas', reach], ['Mensajes y leads de campañas', contacts], ['Formularios recibidos', L?.total ?? 0]] as const;
            const max = Math.max(...steps.map((s) => s[1]), 1);
            return <div className="space-y-4">
              <section className={card}>
                <h3 className="mb-3 text-sm font-semibold">Embudo del período</h3>
                <div className="space-y-2">{steps.map(([l, n]) => (
                  <div key={l}><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{l}</span><b className="tabular-nums">{int(n)}</b></div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (n / max) * 100)}%` }} /></div></div>
                ))}</div>
              </section>
              {L && L.by_source.length > 0 && <section className={card}>
                <h3 className="mb-3 text-sm font-semibold">Leads por fuente</h3>
                <ul className="space-y-2 text-sm">{L.by_source.map((s) => <li key={s.name} className="flex justify-between gap-3"><span className="truncate">{s.name}</span><b className="tabular-nums">{s.count}</b></li>)}</ul>
              </section>}
              {L && L.recent.length > 0 && <section className={card}>
                <h3 className="mb-3 text-sm font-semibold">Últimos leads</h3>
                <ul className="divide-y divide-border text-sm">{L.recent.map((r, i) => <li key={i} className="flex justify-between gap-3 py-2"><span className="truncate">{r.name ?? `Lead ${i + 1}`}{r.source && <span className="text-muted-foreground"> · {r.source}</span>}</span><span className="shrink-0 text-muted-foreground">{new Date(r.date).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}</span></li>)}</ul>
              </section>}
            </div>;
          })()}
        </>}

      {camp && (
        <Dialog open onOpenChange={(o) => !o && setCampaignId(null)}>
          <DialogContent className={`${dialogClassName} h-[100dvh] max-h-[100dvh] w-full max-w-4xl gap-0 overflow-y-auto rounded-none border-border bg-background p-0 text-foreground sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl [&>button.absolute]:hidden`}>
            <DialogHeader className="sticky top-0 z-10 flex-row items-start gap-3 border-b border-border bg-background px-4 py-3 text-left sm:px-6">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{LABEL[camp.result_type].many}</p><DialogTitle className="truncate text-lg">{camp.name}</DialogTitle></div>
              <DialogClose asChild><Button variant="outline" size="icon" aria-label="Cerrar" className="ml-auto h-11 w-11 shrink-0 rounded-full sm:h-9 sm:w-9"><X className="h-5 w-5" /></Button></DialogClose>
            </DialogHeader>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['Inversión', money(camp.metrics.spend)], ['Alcance', int(camp.metrics.reach)], [LABEL[camp.result_type].many, int(camp.metrics.results)], [LABEL[camp.result_type].cost, costOf(camp.result_type, camp.metrics.cost_per_result)]].map(([l, v]) => <div key={l} className={card}><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-bold tabular-nums">{v}</p></div>)}
              </div>
              {camp.metrics.video && <section className={card}><h4 className="mb-2 text-sm font-semibold">Retención del video</h4><Retention v={camp.metrics.video} /></section>}
              <h4 className="text-sm font-semibold">Anuncios, del mejor al peor</h4>
              {campAds.length === 0 ? <p className="text-sm text-muted-foreground">Sin anuncios con datos en este período.</p>
                : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{campAds.map((a, i) => <AdTile key={a.id} ad={a} rank={i} money={money} onOpen={() => setAdId(a.id)} />)}</div>}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {ad && (
        <Dialog open onOpenChange={(o) => !o && setAdId(null)}>
          <DialogContent className={`${dialogClassName} h-[100dvh] max-h-[100dvh] w-full max-w-3xl gap-0 overflow-y-auto rounded-none border-border bg-background p-0 text-foreground sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl [&>button.absolute]:hidden`}>
            <DialogHeader className="sticky top-0 z-10 flex-row items-start gap-3 border-b border-border bg-background px-4 py-3 text-left sm:px-6">
              <DialogTitle className="min-w-0 truncate text-lg">{ad.name}</DialogTitle>
              <DialogClose asChild><Button variant="outline" size="icon" aria-label="Cerrar" className="ml-auto h-11 w-11 shrink-0 rounded-full sm:h-9 sm:w-9"><X className="h-5 w-5" /></Button></DialogClose>
            </DialogHeader>
            <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-2">
              <div><AdPlayback key={ad.id} ad={ad} />
                {ad.title && <p className="mt-3 font-semibold">{ad.title}</p>}{ad.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{ad.body}</p>}</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[['Inversión', money(ad.metrics.spend)], ['Alcance', int(ad.metrics.reach)], [LABEL[ad.result_type].many, int(ad.metrics.results)], [LABEL[ad.result_type].cost, costOf(ad.result_type, ad.metrics.cost_per_result)], ['Frecuencia', ad.metrics.frequency.toFixed(1)], ['Clics al enlace', int(ad.metrics.link_clicks)]].map(([l, v]) => <div key={l} className={card}><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-bold tabular-nums">{v}</p></div>)}
                </div>
                {ad.metrics.roas != null && <p className="text-sm font-semibold text-primary">ROAS {ad.metrics.roas.toFixed(1)}×</p>}
                {ad.metrics.video && <section className={card}><h4 className="mb-2 text-sm font-semibold">Retención</h4><Retention v={ad.metrics.video} /></section>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AdPlayback({ ad }: { ad: Ad }) {
  const [failed, setFailed] = useState(false);
  return <>
    {ad.video_url && !failed ? <video controls playsInline preload="metadata" poster={ad.thumbnail || undefined} src={ad.video_url} aria-label={`Video del anuncio: ${ad.name}`} onError={() => setFailed(true)} className="mx-auto max-h-[55dvh] w-full rounded-lg bg-secondary object-contain" />
      : ad.preview_url ? <iframe src={ad.preview_url} title={`Reproducir anuncio: ${ad.name}`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen className="h-[65dvh] min-h-96 w-full rounded-lg border-0 bg-secondary" />
        : ad.thumbnail ? <img src={ad.thumbnail} alt={ad.name} className="mx-auto max-h-[55dvh] w-full rounded-lg object-contain" />
        : <div className="flex aspect-square items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground">Sin vista previa</div>}
    {ad.is_video && (!ad.video_url || failed) && !ad.preview_url && <p className="mt-2 text-xs text-muted-foreground">Meta no permite reproducir este video en este momento.</p>}
  </>;
}

function AdTile({ ad, rank, money, onOpen }: { ad: Ad; rank: number; money: (n: number | null) => string; onOpen: () => void }) {
  return (
    <Button variant="ghost" type="button" onClick={onOpen} aria-label={`Ver anuncio: ${ad.name}`} className="group block h-auto w-full overflow-hidden rounded-lg border border-border bg-card p-0 text-left font-normal whitespace-normal transition hover:border-primary/60 hover:bg-card">
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-muted/30">
        {ad.thumbnail ? <img src={ad.thumbnail} alt={ad.title || ad.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <PlayCircle className="h-10 w-10 text-muted-foreground" />}
      </div>
      <div className="space-y-3 border-t border-border p-2.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary"><Medal className="h-4 w-4" />#{rank + 1}</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">{ad.is_video && <PlayCircle className="h-3.5 w-3.5" />}{ad.is_video ? 'Video' : 'Anuncio'}</span>
        </div>
        <p className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5">{ad.name}</p>
        <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2 sm:gap-3">
          <div><p className="text-lg font-bold tabular-nums">{int(ad.metrics.results)}</p><p className="text-xs text-muted-foreground">{LABEL[ad.result_type].many}</p></div>
          <div className="sm:text-right"><p className="text-lg font-bold tabular-nums">{money(ad.metrics.cost_per_result)}</p><p className="text-xs text-muted-foreground">{LABEL[ad.result_type].cost}</p></div>
        </div>
        {ad.metrics.video && <p className="text-xs text-muted-foreground"><Users className="mr-1 inline h-3 w-3" />{pct(ad.metrics.video.p100, ad.metrics.video.plays || ad.metrics.video.p25)}% lo vio completo</p>}
      </div>
    </Button>
  );
}
