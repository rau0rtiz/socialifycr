import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Loader2, PencilLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CalendarMonth, CalendarThumb, StatusPill, type CalendarItem } from '@/components/calendario/CalendarMonth';
import { VideoPlayer } from '@/components/calendario/VideoPlayer';
import { dayLabel } from '@/lib/calendar-media';

interface Comment { id: string; item_id: string; author_name: string; author_type: string; kind: string; body: string; created_at: string }
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
  const { data, isLoading, error } = useQuery<Payload>({ queryKey: key, queryFn: () => call({ action: 'get', token }), retry: false });
  const [ym, setYm] = useState<{ y: number; m: number } | null>(null);
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

  if (isLoading) return <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center text-muted-foreground">Este enlace no es válido o ya no está disponible.</div>;

  const open = data.items.find((i) => i.id === openId) ?? null;
  const pending = data.items.filter((i) => i.status !== 'aprobado').length;
  const unscheduled = data.items.filter((i) => !i.publish_date);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          {data.client?.logo_url && <img src={data.client.logo_url} alt="" className="h-10 w-10 rounded-lg bg-card object-contain p-1" />}
          <div className="mr-auto">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Calendario de publicación</div>
            <h1 className="text-xl font-semibold sm:text-2xl">{data.client?.name}</h1>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {data.items.length} piezas<br />{pending} por revisar
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <p className="mb-4 text-sm text-muted-foreground">Tocá cada pieza para ver el video y el texto. Podés aprobarla o pedir cambios.</p>
        {ym && (
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <CalendarMonth year={ym.y} month={ym.m} onMonthChange={(y, m) => setYm({ y, m })} items={data.items} onOpen={(i) => setOpenId(i.id)} />
          </div>
        )}
        {unscheduled.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Por programar ({unscheduled.length})</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {unscheduled.map((it) => (
                <button key={it.id} onClick={() => setOpenId(it.id)} className="overflow-hidden rounded-xl border border-border/60 bg-card text-left">
                  <CalendarThumb item={it} className="aspect-[4/5] w-full" />
                  <div className="space-y-1 p-2">
                    <div className="line-clamp-2 text-xs font-medium">{it.title}</div>
                    <StatusPill status={it.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
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
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (action: 'approve' | 'request_changes') => {
    if (!name.trim()) return toast.error('Escribí tu nombre primero');
    if (action === 'request_changes' && !body.trim()) return toast.error('Contanos qué cambios necesitás');
    setBusy(true);
    try {
      localStorage.setItem('cal-public-name', name.trim());
      await call({ action, token, item_id: item.id, name: name.trim(), body: body.trim() });
      toast.success(action === 'approve' ? '¡Pieza aprobada!' : 'Cambios enviados al equipo');
      setBody(''); setMode('idle'); onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <DialogTitle className="pr-6 text-base sm:text-lg">{item.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-5">
            <div className="order-1 md:col-start-1 md:row-start-1">
              <VideoPlayer item={item} />
            </div>
            <div className="order-2 flex flex-wrap items-center gap-2 text-sm md:col-start-2">
              <StatusPill status={item.status} />
              {item.publish_date && <span className="text-muted-foreground first-letter:uppercase">{dayLabel(item.publish_date)}</span>}
            </div>
            <div className="order-3 space-y-2 rounded-xl border border-border bg-card p-3 md:col-start-2">
              <Input value={name} placeholder="Tu nombre" onChange={(e) => setName(e.target.value)} />
              {mode === 'changes' && <Textarea rows={4} autoFocus value={body} placeholder="¿Qué te gustaría cambiar?" onChange={(e) => setBody(e.target.value)} />}
              <div className="grid grid-cols-2 gap-2">
                {mode === 'changes' ? (
                  <>
                    <Button variant="outline" onClick={() => setMode('idle')} disabled={busy}>Cancelar</Button>
                    <Button onClick={() => act('request_changes')} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar cambios'}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setMode('changes')} disabled={busy}><PencilLine className="mr-2 h-4 w-4" />Pedir cambios</Button>
                    <Button onClick={() => act('approve')} disabled={busy || item.status === 'aprobado'}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />{item.status === 'aprobado' ? 'Aprobada' : 'Aprobar'}</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {item.explanation && <p className="order-4 whitespace-pre-wrap text-sm text-muted-foreground md:col-start-2">{item.explanation}</p>}
            {item.copy && (
              <div className="order-5 rounded-xl bg-muted p-3 md:col-start-2">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                  Copy
                  <button onClick={() => { navigator.clipboard.writeText(item.copy!); toast.success('Copiado'); }} aria-label="Copiar"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <p className="whitespace-pre-wrap text-sm">{item.copy}</p>
              </div>
            )}
            {comments.length > 0 && (
              <div className="order-6 space-y-2 md:col-start-2">
                {comments.map((c) => (
                  <div key={c.id} className={c.author_type === 'cliente' ? 'rounded-lg bg-primary/10 p-2 text-sm' : 'rounded-lg bg-muted p-2 text-sm'}>
                    <div className="text-[11px] text-muted-foreground"><b>{c.author_name}</b> · {c.kind === 'cambio' ? 'pidió cambios' : c.kind === 'aprobacion' ? 'aprobó' : 'nota'}</div>
                    <div className="whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
