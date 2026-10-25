import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Loader2, PencilLine, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CalendarMonth, CalendarThumb, StatusPill, type CalendarItem } from '@/components/calendario/CalendarMonth';
import { VideoPlayer } from '@/components/calendario/VideoPlayer';
import { dayLabel, monthLabel, COVER_STATUS_LABEL } from '@/lib/calendar-media';
import { CalendarHistory } from '@/components/calendario/CalendarHistory';
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
  const { data, isLoading, error } = useQuery<Payload>({ queryKey: key, queryFn: () => call({ action: 'get', token }), retry: false, refetchInterval: 30_000 });
  const [ym, setYm] = useState<{ y: number; m: number } | null>(null);
  const [view, setView] = useState<'pieces' | 'calendar'>('calendar');
  const [openId, setOpenId] = useState<string | null>(null);

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
  const pending = data.items.filter((i) => i.status !== 'aprobado').length;
  const unscheduled = data.items.filter((i) => !i.publish_date);

  const monthItems = data.items.filter(i => i.publish_date?.startsWith(`${ym?.y}-${String((ym?.m ?? 0) + 1).padStart(2, '0')}`));
  const shown = [...monthItems, ...unscheduled];
  const shift = (delta: number) => { if (!ym) return; const d = new Date(Date.UTC(ym.y, ym.m + delta, 1)); setYm({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); };
  return (
    <div className="shared-calendar shared-calendar-page bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          {data.client?.logo_url && <img src={data.client.logo_url} alt="" className="h-12 w-12 rounded-lg object-contain" />}
          <div className="mr-auto">
            <div className="text-[11px] uppercase tracking-normal text-primary">Calendario de publicación</div>
            <h1 className="text-xl font-semibold sm:text-2xl">{data.client?.name}</h1>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {data.items.length} piezas<br />{pending} por revisar
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold first-letter:uppercase">{ym && monthLabel(ym.y, ym.m)}</h2>
            <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-1" aria-label="Vista">
            <Button size="sm" variant={view === 'pieces' ? 'default' : 'ghost'} onClick={() => setView('pieces')}><LayoutGrid className="mr-2 h-4 w-4" />Piezas</Button>
            <Button size="sm" variant={view === 'calendar' ? 'default' : 'ghost'} onClick={() => setView('calendar')}><CalendarDays className="mr-2 h-4 w-4" />Calendario</Button>
          </div>
        </div>
        {view === 'calendar' && ym && <CalendarMonth mobileMonthGrid year={ym.y} month={ym.m} onMonthChange={(y, m) => setYm({ y, m })} items={data.items} onOpen={(i) => setOpenId(i.id)} />}
        {(view === 'pieces' || unscheduled.length > 0) && (
          <section className={view === 'calendar' ? 'mt-8' : ''}>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">{view === 'calendar' ? 'Por programar' : `${shown.length} piezas · ${pending} por revisar`}</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(view === 'calendar' ? unscheduled : shown).map(it => (
                <Button key={it.id} variant="ghost" onClick={() => setOpenId(it.id)} className="group block h-auto min-w-0 overflow-hidden rounded-lg border border-border bg-card p-0 text-left whitespace-normal hover:bg-card">
                  <CalendarThumb item={it} className="aspect-[3/4] w-full" />
                  <div className="space-y-2 p-3">
                    <StatusPill status={it.status} />
                    <div className="line-clamp-2 min-h-10 text-sm font-semibold">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{it.publish_date ? dayLabel(it.publish_date) : 'Por programar'}</div>
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">Socialify</p>
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
      <DialogContent className="shared-calendar shared-calendar-dialog max-h-[92dvh] w-[calc(100%-24px)] max-w-5xl gap-0 overflow-y-auto rounded-lg border-border bg-background p-0 text-foreground">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4 text-left sm:px-6">
          <div className="mb-2 text-[10px] font-semibold uppercase text-primary">Socialify · Revisión de contenido</div>
          <DialogTitle className="pr-6 text-base sm:text-lg">{item.title}</DialogTitle>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
            <div className="min-w-0 md:sticky md:top-28">
              {hasCoverReview && <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1" aria-label="Contenido a revisar">
                <Button size="sm" variant={media === 'video' ? 'secondary' : 'ghost'} aria-pressed={media === 'video'} onClick={() => setMedia('video')}>Video <StatusPill status={item.status} /></Button>
                <Button size="sm" variant={media === 'cover' ? 'secondary' : 'ghost'} aria-pressed={media === 'cover'} onClick={() => setMedia('cover')}>Portada <StatusPill status={item.cover_status ?? 'pendiente'} /></Button>
              </div>}
              {media === 'cover' && item.thumbnail_url ? <img src={item.thumbnail_url} alt="Portada del reel" className="mx-auto block max-h-[58dvh] max-w-full rounded-lg object-contain" /> : <VideoPlayer item={item} />}
            </div>
            <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{media === 'cover' ? 'Portada' : hasCoverReview ? 'Video' : 'Pieza'}</span>
              <StatusPill status={media === 'cover' ? item.cover_status ?? 'pendiente' : item.status} />
              {item.publish_date && <span className="text-muted-foreground first-letter:uppercase">{dayLabel(item.publish_date)}</span>}
            </div>
            <div className="space-y-3 border-b border-border pb-4">
              <label htmlFor="calendar-review-name" className="block text-xs font-medium text-muted-foreground">Revisado por</label>
              <Input ref={nameRef} id="calendar-review-name" maxLength={80} value={name} placeholder="Tu nombre" aria-invalid={!!validation} onChange={(e) => { setName(e.target.value); setValidation(''); }} />
              {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
              {media === 'video' && mode === 'changes' && <Textarea rows={4} autoFocus value={body} placeholder="¿Qué te gustaría cambiar?" onChange={(e) => setBody(e.target.value)} />}
              {media === 'video' && <div className="grid grid-cols-2 gap-2">
                {mode === 'changes' ? (
                  <>
                    <Button variant="outline" onClick={() => setMode('idle')} disabled={busy}>Cancelar</Button>
                    <Button onClick={() => act('request_changes')} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar cambios'}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setMode('changes')} disabled={busy}><PencilLine className="mr-2 h-4 w-4" />Pedir cambios</Button>
                    <Button onClick={() => item.status === 'aprobado' ? historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : act('approve')} disabled={busy}>
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
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  {coverMode === 'changes' ? (
                    <>
                      <Button variant="outline" onClick={() => setCoverMode('idle')} disabled={busy}>Cancelar</Button>
                      <Button onClick={() => act('request_cover_changes')} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar cambios'}</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setCoverMode('changes')} disabled={busy}><PencilLine className="mr-2 h-4 w-4" />Cambios en portada</Button>
                      <Button variant={item.cover_status === 'aprobada' ? 'outline' : 'default'} onClick={() => act('approve_cover')} disabled={busy}>
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
