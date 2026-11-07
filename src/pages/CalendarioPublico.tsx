import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Loader2, PencilLine, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, X, RefreshCw, Layers, Clock, BarChart3, ArrowUpRight } from 'lucide-react';
import { PieceCard, PublicMonthGrid, needsReview, StatusChip, typeMeta } from '@/components/calendario-publico/PublicPieces';
import { supabase } from '@/integrations/supabase/client';
import socialifyLogo from '@/assets/socialify-wordmark.png.asset.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { StatusPill, type CalendarItem } from '@/components/calendario/CalendarMonth';
import { VideoPlayer } from '@/components/calendario/VideoPlayer';
import { dayLabel, monthLabel, COVER_STATUS_LABEL, isStaticArtwork } from '@/lib/calendar-media';
import { CalendarHistory } from '@/components/calendario/CalendarHistory';
import { CalendarInstall } from '@/components/calendario/CalendarInstall';
import { ResultsDashboard } from '@/components/client-dashboard/ResultsDashboard';
import type { CalendarComment as Comment } from '@/lib/calendar-history';

interface Payload { client: { name: string; logo_url: string | null } | null; items: CalendarItem[]; comments: Comment[] }

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('calendar-public', { body });
  if (error) {
    let msg = 'No se pudo completar';
    try { const j = await (error as any).context?.json(); if (typeof j?.error === 'string') msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
};

export default function CalendarioPublico() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  const key = ['public-calendar', token];
  const { data, isLoading, error, refetch, isFetching } = useQuery<Payload>({ queryKey: key, queryFn: () => call({ action: 'get', token }), retry: false, refetchInterval: 30_000 });
  const refresh = async () => {
    const res = await refetch();
    if (res.isError) toast.error('No se pudo actualizar. Probá de nuevo.');
    else toast.success('Calendario actualizado');
  };
  const { data: dashCfg } = useQuery<{ tabs: { campaigns: boolean; accounts: boolean; leads: boolean } }>({
    queryKey: ['public-dashboard-config', token], retry: false, staleTime: 5 * 60_000,
    queryFn: async () => { const { data, error } = await supabase.functions.invoke('client-dashboard', { body: { action: 'public_config', token } }); if (error) throw error; return data; },
  });
  const hasDashboard = !!(dashCfg?.tabs.accounts || dashCfg?.tabs.campaigns || dashCfg?.tabs.leads);
  const [pageView, setPageView] = useState<'home' | 'calendar' | 'campaigns'>(() => new URLSearchParams(window.location.search).get('tab') === 'calendario' ? 'calendar' : 'home');
  const pageRef = useRef<HTMLDivElement>(null);
  const navigateSection = (next: 'home' | 'calendar' | 'campaigns') => {
    setPageView(next);
    pageRef.current?.scrollTo({ top: 0 });
  };
  const [ym, setYm] = useState<{ y: number; m: number } | null>(null);
  const [view, setView] = useState<'pieces' | 'calendar' | 'review'>('calendar');
  const [openId, setOpenId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let m = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
    m.content = 'noindex, nofollow, noarchive, nosnippet';
  }, []);
  useEffect(() => {
    if (data?.client?.name) document.title = `Calendario · ${data.client.name}`;
    if (data && !ym) {
      const today = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
      const next = data.items.find((i) => (i.publish_date ?? '') >= today) ?? data.items[data.items.length - 1];
      const d = next?.publish_date ?? today;
      setYm({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 });
    }
  }, [data, ym]);

  if (isLoading) return <div className="shared-calendar shared-calendar-page flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="shared-calendar shared-calendar-page flex items-center justify-center bg-background p-6 text-center text-muted-foreground">Este enlace no es válido o ya no está disponible.</div>;

  const open = data.items.find((i) => i.id === openId) ?? null;
  const pendingItems = data.items.filter(needsReview);
  const pending = pendingItems.length;
  const unscheduled = data.items.filter((i) => !i.publish_date);

  const monthItems = data.items.filter(i => i.publish_date?.startsWith(`${ym?.y}-${String((ym?.m ?? 0) + 1).padStart(2, '0')}`));
  const shown = [...monthItems, ...unscheduled];
  const shift = (delta: number) => { if (!ym) return; const d = new Date(Date.UTC(ym.y, ym.m + delta, 1)); setYm({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); setDay(null); };
  const dayItems = day ? data.items.filter((i) => i.publish_date === day) : [];
  const segBtn = (active: boolean) => `flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`;
  return (
    <div ref={pageRef} className="shared-calendar shared-calendar-page bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-4 pt-5">
        <div className="flex items-center justify-center"><img src={socialifyLogo.url} alt="Socialify" className="h-5 w-auto" /></div>
        <div className="mt-4 flex items-center gap-3">
          {data.client?.logo_url && <img src={data.client.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-contain sm:h-16 sm:w-16" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{data.client?.name}</h1>
            <p className="text-sm text-muted-foreground">{hasDashboard ? 'Resultados y publicaciones' : 'Calendario de publicación'}</p>
          </div>
          <Button variant="outline" size="icon" aria-label="Actualizar calendario" onClick={refresh} disabled={isFetching} className="h-11 w-11 shrink-0 rounded-xl">
            <RefreshCw className={isFetching ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-4">
        {hasDashboard && pageView !== 'home' && <div className="mb-4 flex items-center gap-3"><Button variant="outline" className="min-h-11" onClick={() => navigateSection('home')}><ChevronLeft />Atrás</Button><h2 className="text-lg font-semibold">{pageView === 'calendar' ? 'Calendario' : 'Campañas'}</h2></div>}
        {hasDashboard && pageView === 'home' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3" aria-label="Secciones del dashboard">
              <Button variant="outline" onClick={() => { navigateSection('calendar'); setView('calendar'); }} className="flex h-auto min-h-36 flex-col items-start justify-between rounded-lg bg-card p-4 text-left sm:min-h-44 sm:p-6">
                <CalendarDays className="h-7 w-7 text-primary" />
                <span className="flex w-full items-center justify-between gap-2 text-base font-semibold">Calendario<ArrowUpRight className="h-4 w-4" /></span>
              </Button>
              <Button variant="outline" onClick={() => navigateSection('campaigns')} disabled={!dashCfg?.tabs.campaigns} className="flex h-auto min-h-36 flex-col items-start justify-between rounded-lg bg-card p-4 text-left sm:min-h-44 sm:p-6">
                <BarChart3 className="h-7 w-7 text-primary" />
                <span className="flex w-full items-center justify-between gap-2 text-base font-semibold">Campañas<ArrowUpRight className="h-4 w-4" /></span>
              </Button>
            </div>
            {dashCfg?.tabs.accounts && <ResultsDashboard section="cuentas" hideRange compact cacheKey={['public-dashboard', token]} dialogClassName="shared-calendar shared-calendar-dialog"
              fetcher={async (r) => { const { data, error } = await supabase.functions.invoke('client-dashboard', { body: { action: 'public', token, ...r } }); if (error) throw error; return data; }} />}
          </div>
        ) : hasDashboard && pageView === 'campaigns' ? (
          <ResultsDashboard section="campanas" compact cacheKey={['public-dashboard', token]} dialogClassName="shared-calendar shared-calendar-dialog"
            fetcher={async (r) => { const { data, error } = await supabase.functions.invoke('client-dashboard', { body: { action: 'public', token, ...r } }); if (error) throw error; return data; }} />
        ) : view === 'review' ? (
          <section>
            <button type="button" onClick={() => setView('calendar')} aria-label="Volver al calendario" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl"><ChevronLeft className="h-6 w-6" /></button>
            <h2 className="mt-1 text-2xl font-bold">Por revisar</h2>
            <p className="mb-4 text-sm text-muted-foreground">{pending} {pending === 1 ? 'pieza pendiente' : 'piezas pendientes'}</p>
            {pending === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-lg font-semibold">¡Todo al día!</p>
                <p className="mt-1 text-sm text-muted-foreground">No tenés publicaciones pendientes de revisión.</p>
                <Button className="mt-4" onClick={() => setView('calendar')}>Volver al calendario</Button>
              </div>
            ) : <div className="grid gap-3 md:grid-cols-2">{pendingItems.map((it) => <PieceCard key={it.id} item={it} onOpen={() => setOpenId(it.id)} />)}</div>}
          </section>
        ) : <>
          <div className="mx-auto grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1" aria-label="Vista">
            <button type="button" className={segBtn(view === 'calendar')} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><CalendarDays className="h-4 w-4" />Calendario</button>
            <button type="button" className={segBtn(view === 'pieces')} aria-pressed={view === 'pieces'} onClick={() => setView('pieces')}><LayoutGrid className="h-4 w-4" />Piezas</button>
          </div>
          <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2">
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm"><Layers className="h-4 w-4 text-muted-foreground" /><b>{data.items.length}</b> piezas</div>
            <button type="button" onClick={() => setView('review')} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/15 px-3 text-sm font-semibold text-primary">
              <Clock className="h-4 w-4" />{pending} por revisar<ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" aria-label="Mes anterior" className="h-11 w-11 rounded-xl" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold first-letter:uppercase">{ym && monthLabel(ym.y, ym.m)}</h2>
            <Button variant="outline" size="icon" aria-label="Mes siguiente" className="h-11 w-11 rounded-xl" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="mt-4">
            {view === 'calendar' && ym && <>
              <PublicMonthGrid year={ym.y} month={ym.m} items={data.items} selected={day} onSelect={setDay} onOpen={(i) => setOpenId(i.id)} />
              {day && dayItems.length > 0 && (
                <section className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold first-letter:uppercase">Publicaciones del {dayLabel(day)}</h3>
                  <div className="grid gap-3 md:grid-cols-2">{dayItems.map((it) => <PieceCard key={it.id} item={it} onOpen={() => setOpenId(it.id)} />)}</div>
                </section>
              )}
            </>}
            {(view === 'pieces' || unscheduled.length > 0) && (
              <section className={view === 'calendar' ? 'mt-8' : ''}>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">{view === 'calendar' ? 'Por programar' : `${shown.length} piezas este mes`}</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(view === 'calendar' ? unscheduled : shown).map(it => <PieceCard key={it.id} item={it} onOpen={() => setOpenId(it.id)} />)}
                </div>
              </section>
            )}
          </div>
          <div className="mt-8 flex justify-center"><CalendarInstall token={token} /></div>
        </>}
      </main>
      {open && (
        <PieceDialog
          item={open}
          token={token}
          comments={data.comments.filter((c) => c.item_id === open.id)}
          onClose={() => setOpenId(null)}
          onDone={() => qc.invalidateQueries({ queryKey: key })}
        />
      )}
    </div>
  );
}

function PieceDialog({ item, token, comments, onClose, onDone }: { item: CalendarItem; token: string; comments: Comment[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(() => localStorage.getItem('cal-public-name') ?? '');
  const [mode, setMode] = useState<'idle' | 'changes'>('idle');
  const [coverMode, setCoverMode] = useState<'idle' | 'changes'>('idle');
  const [body, setBody] = useState('');
  const [coverBody, setCoverBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState('');
  const [media, setMedia] = useState<'video' | 'cover'>('video');
  const nameRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const hasCoverReview = !!item.thumbnail_url && ['reel', 'tiktok', 'short'].includes(item.content_type ?? '');

  const act = async (action: 'approve' | 'request_changes' | 'approve_cover' | 'request_cover_changes') => {
    if (!name.trim()) { setValidation('Escribí tu nombre para registrar tu aprobación o cambios.'); nameRef.current?.focus(); return; }
    setValidation('');
    const isCover = action === 'approve_cover' || action === 'request_cover_changes';
    const text = isCover ? coverBody.trim() : body.trim();
    if ((action === 'request_changes' || action === 'request_cover_changes') && !text)
      return toast.error(isCover ? 'Contanos qué cambios necesitás en la portada' : 'Contanos qué cambios necesitás');
    setBusy(true);
    try {
      localStorage.setItem('cal-public-name', name.trim());
      await call({ action, token, item_id: item.id, name: name.trim(), body: text });
      toast.success(action === 'approve' ? '¡Pieza aprobada!' : action === 'approve_cover' ? '¡Portada aprobada!' : 'Cambios enviados al equipo');
      if (isCover) { setCoverBody(''); setCoverMode('idle'); } else { setBody(''); setMode('idle'); }
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="shared-calendar shared-calendar-dialog h-[100dvh] max-h-[100dvh] w-full max-w-5xl gap-0 overflow-y-auto rounded-none border-border bg-background p-0 text-foreground sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100%-24px)] sm:rounded-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 text-left sm:px-6 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                {(() => { const Icon = typeMeta(item.content_type).icon; return <Icon className="h-3.5 w-3.5" />; })()}
                {typeMeta(item.content_type).label}{item.publish_date && <span className="text-muted-foreground"> · {dayLabel(item.publish_date)}</span>}
              </div>
              <DialogTitle className="text-lg font-bold sm:text-xl">{item.title}</DialogTitle>
            </div>
            <DialogClose asChild>
              <Button variant="outline" size="icon" aria-label="Cerrar" className="ml-auto h-11 w-11 shrink-0 rounded-full border-border bg-secondary text-foreground hover:bg-accent sm:h-9 sm:w-9">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
            <div className="min-w-0 md:sticky md:top-28">
              {hasCoverReview ? <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1" aria-label="Contenido a revisar">
                {([['video', 'Video', item.status], ['cover', 'Portada', item.cover_status ?? 'pendiente']] as const).map(([k, l, s]) => (
                  <button key={k} type="button" aria-pressed={media === k} onClick={() => setMedia(k)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-sm font-semibold ${media === k ? 'bg-secondary ring-1 ring-primary' : ''}`}>
                    {l}<StatusChip status={s} label={k === 'cover' ? COVER_STATUS_LABEL[s] : item.clickup_status} color={k === 'cover' ? undefined : item.clickup_status_color} />
                  </button>
                ))}
              </div> : <div className="mb-4"><StatusChip status={item.status} label={item.clickup_status} color={item.clickup_status_color} /></div>}
              {media === 'cover' && item.thumbnail_url ? <img src={item.thumbnail_url} alt="Portada del reel" className="mx-auto block max-h-[58dvh] max-w-full rounded-lg object-contain" /> : (isStaticArtwork(item.content_type, item.thumbnail_url) || (item.carousel_urls?.length ?? 0) > 1 || item.video_url ? <VideoPlayer item={item} /> : <div className="flex aspect-[9/16] max-h-[50dvh] w-full items-center justify-center rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">El video todavía está en preparación. Cuando esté listo, podrás verlo aquí.</div>)}
            </div>
            <div className="min-w-0 space-y-4">
            <div className="space-y-3 border-b border-border pb-4">
              <label htmlFor="calendar-review-name" className="block text-xs font-medium text-muted-foreground">Revisado por</label>
              <Input ref={nameRef} id="calendar-review-name" maxLength={80} value={name} placeholder="Tu nombre" aria-invalid={!!validation} onChange={(e) => { setName(e.target.value); setValidation(''); }} />
              {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
              {media === 'video' && mode === 'changes' && <Textarea rows={4} autoFocus value={body} placeholder="¿Qué te gustaría cambiar?" onChange={(e) => setBody(e.target.value)} />}
              {media === 'video' && <div className="sticky bottom-0 z-20 -mx-4 grid grid-cols-2 gap-2 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
                {mode === 'changes' ? (
                  <>
                    <Button variant="outline" onClick={() => setMode('idle')} disabled={busy}>Cancelar</Button>
                    <Button onClick={() => act('request_changes')} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar cambios'}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setMode('changes')} disabled={busy}><PencilLine className="mr-2 h-4 w-4" />Pedir cambios</Button>
                    <Button variant={item.status === 'aprobado' ? 'secondary' : 'default'} className={item.status === 'aprobado' ? 'text-muted-foreground' : ''} onClick={() => item.status === 'aprobado' ? historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : act('approve')} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />{item.status === 'aprobado' ? 'Aprobada' : 'Aprobar'}</>}
                    </Button>
                  </>
                )}
              </div>}
            </div>
            {hasCoverReview && media === 'cover' && (
              <div className="space-y-3 border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="block text-xs font-medium text-muted-foreground">Portada del reel</span>
                  <StatusPill status={item.cover_status ?? 'pendiente'} labels={COVER_STATUS_LABEL} />
                </div>
                {coverMode === 'changes' && <Textarea rows={3} autoFocus value={coverBody} placeholder="¿Qué te gustaría cambiar de la portada?" onChange={(e) => setCoverBody(e.target.value)} />}
                <div className="sticky bottom-0 z-20 -mx-4 grid grid-cols-2 gap-2 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
                  {coverMode === 'changes' ? (
                    <>
                      <Button variant="outline" onClick={() => setCoverMode('idle')} disabled={busy}>Cancelar</Button>
                      <Button onClick={() => act('request_cover_changes')} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar cambios'}</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setCoverMode('changes')} disabled={busy}><PencilLine className="mr-2 h-4 w-4" />Cambios en portada</Button>
                      <Button variant={item.cover_status === 'aprobada' ? 'secondary' : 'default'} className={item.cover_status === 'aprobada' ? 'text-muted-foreground' : ''} onClick={() => act('approve_cover')} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />{item.cover_status === 'aprobada' ? 'Portada aprobada' : 'Aprobar portada'}</>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={historyRef} className="border-b border-border pb-4"><CalendarHistory comments={comments} /></div>
            {item.explanation && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.explanation}</p>}
            {item.copy && (
              <div className="rounded-md bg-muted p-3">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                  Copy
                  <Button variant="ghost" size="icon" onClick={() => { if (item.copy) navigator.clipboard.writeText(item.copy); toast.success('Copiado'); }} aria-label="Copiar"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
                <p className="whitespace-pre-wrap text-sm">{item.copy}</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
