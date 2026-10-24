import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Copy, ExternalLink, ImagePlus, Inbox, Loader2, Send, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarMonth, CalendarThumb, StatusPill, type CalendarItem } from '@/components/calendario/CalendarMonth';
import { VideoPlayer } from '@/components/calendario/VideoPlayer';
import { STATUS_LABEL } from '@/lib/calendar-media';

interface Comment { id: string; item_id: string; author_name: string; author_type: string; kind: string; body: string; created_at: string }
type Item = CalendarItem & { client_id: string };

const nowCR = () => new Date(Date.now() - 6 * 3600000);

export default function Calendario() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(() => localStorage.getItem('cal-client'));
  const [ym, setYm] = useState(() => ({ y: nowCR().getUTCFullYear(), m: nowCR().getUTCMonth() }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickDayFor, setPickDayFor] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['calendar-clients'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('production_sheets').select('client_id, clients(id, name, logo_url)');
      const map = new Map<string, { id: string; name: string; logo_url: string | null }>();
      for (const r of (data ?? []) as any[]) if (r.clients) map.set(r.clients.id, r.clients);
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  useEffect(() => {
    if (!clientId && clients[0]) setClientId(clients[0].id);
  }, [clients, clientId]);
  useEffect(() => { if (clientId) localStorage.setItem('cal-client', clientId); }, [clientId]);

  const itemsKey = ['calendar-items', clientId];
  const { data: items = [], isLoading } = useQuery({
    queryKey: itemsKey,
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from('content_calendar_items').select('*')
        .eq('client_id', clientId!).order('publish_date', { nullsFirst: true }).order('sort');
      if (error) throw error;
      return data as Item[];
    },
  });

  const commentsKey = ['calendar-comments', clientId];
  const { data: comments = [] } = useQuery({
    queryKey: commentsKey,
    enabled: !!clientId && items.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('content_calendar_comments').select('*')
        .in('item_id', items.map((i) => i.id)).order('created_at');
      return (data ?? []) as Comment[];
    },
  });

  // Live updates when the client approves or asks for changes.
  useEffect(() => {
    if (!clientId) return;
    const ch = supabase
      .channel(`cal-${clientId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_calendar_items', filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: itemsKey }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_calendar_comments' },
        () => qc.invalidateQueries({ queryKey: commentsKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const update = async (id: string, patch: Partial<Item>) => {
    qc.setQueryData<Item[]>(itemsKey, (old) => old?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from('content_calendar_items').update(patch as any).eq('id', id);
    if (error) { toast.error('No se pudo guardar'); qc.invalidateQueries({ queryKey: itemsKey }); }
  };

  const unscheduled = items.filter((i) => !i.publish_date);
  const open = items.find((i) => i.id === openId) ?? null;
  const counts = useMemo(() => {
    const inMonth = items.filter((i) => i.publish_date?.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`));
    return { total: inMonth.length, ok: inMonth.filter((i) => i.status === 'aprobado').length, ch: inMonth.filter((i) => i.status === 'cambios').length };
  }, [items, ym]);

  const share = async () => {
    if (!clientId) return;
    let { data } = await supabase.from('content_calendar_shares').select('token').eq('client_id', clientId).maybeSingle();
    if (!data) ({ data } = await supabase.from('content_calendar_shares').insert({ client_id: clientId }).select('token').single());
    if (!data) return toast.error('No se pudo crear el enlace');
    const origin = location.hostname.includes('lovable') || location.hostname === 'localhost' ? 'https://app.socialifycr.com' : location.origin;
    await navigator.clipboard.writeText(`${origin}/calendario/${data.token}`).catch(() => {});
    toast.success('Enlace del calendario copiado', { description: `${origin}/calendario/${data.token}` });
  };
  const regenerate = async () => {
    if (!clientId || !confirm('El enlace anterior dejará de funcionar. ¿Continuar?')) return;
    await supabase.from('content_calendar_shares').delete().eq('client_id', clientId);
    await share();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">Calendario de publicación</h1>
          <p className="text-sm text-muted-foreground">
            {counts.total} piezas este mes · {counts.ok} aprobadas · {counts.ch} con cambios
          </p>
        </div>
        <Select value={clientId ?? ''} onValueChange={setClientId}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Elegí un cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={share} disabled={!clientId}><Share2 className="mr-2 h-4 w-4" />Compartir</Button>
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={!clientId}>Nuevo enlace</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="agency-card h-fit space-y-3 p-3 lg:sticky lg:top-0">
          <div className="flex items-center gap-2 text-sm font-semibold"><Inbox className="h-4 w-4 text-primary" />Por programar ({unscheduled.length})</div>
          <p className="text-xs text-muted-foreground">Arrastrá cada pieza a su día, o tocála y elegí la fecha.</p>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {unscheduled.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Todo programado. Las piezas llegan al enviar una hoja a ClickUp.</p>}
            {unscheduled.map((it) => (
              <button
                key={it.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                onClick={() => setPickDayFor(it.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background p-1.5 text-left hover:border-primary/60"
              >
                <CalendarThumb item={it} className="h-12 w-12 shrink-0 rounded-md" />
                <span className="line-clamp-2 text-xs">{it.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="agency-card p-3 sm:p-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <CalendarMonth
              year={ym.y} month={ym.m}
              onMonthChange={(y, m) => setYm({ y, m })}
              items={items}
              onOpen={(i) => setOpenId(i.id)}
              onDropItem={(id, iso) => update(id, { publish_date: iso })}
            />
          )}
        </section>
      </div>

      <Dialog open={!!pickDayFor} onOpenChange={(o) => !o && setPickDayFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Qué día se publica?</DialogTitle></DialogHeader>
          <Input type="date" autoFocus onChange={(e) => { if (pickDayFor && e.target.value) { update(pickDayFor, { publish_date: e.target.value }); setPickDayFor(null); } }} />
          <Button variant="outline" onClick={() => { setOpenId(pickDayFor); setPickDayFor(null); }}>Ver detalle de la pieza</Button>
        </DialogContent>
      </Dialog>

      {open && (
        <ItemDialog
          item={open}
          comments={comments.filter((c) => c.item_id === open.id)}
          onClose={() => setOpenId(null)}
          onUpdate={(p) => update(open.id, p)}
          onDelete={async () => {
            if (!confirm('¿Quitar esta pieza del calendario?')) return;
            await supabase.from('content_calendar_items').delete().eq('id', open.id);
            setOpenId(null); qc.invalidateQueries({ queryKey: itemsKey });
          }}
          onComment={async (body) => {
            const name = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Socialify';
            await supabase.from('content_calendar_comments').insert({ item_id: open.id, author_name: name, author_type: 'agencia', kind: 'nota', body });
            qc.invalidateQueries({ queryKey: commentsKey });
          }}
        />
      )}
    </div>
  );
}

function ItemDialog({ item, comments, onClose, onUpdate, onDelete, onComment }: {
  item: Item; comments: Comment[]; onClose: () => void;
  onUpdate: (p: Partial<Item>) => void; onDelete: () => void; onComment: (b: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: item.title, copy: item.copy ?? '', explanation: item.explanation ?? '', video_url: item.video_url ?? '' });
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const save = (k: keyof typeof form) => { if ((item as any)[k] ?? '' !== form[k]) onUpdate({ [k]: form[k] || null } as any); };

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen debe pesar menos de 5 MB');
    setUploading(true);
    const path = `calendar/${item.client_id}/${item.id}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('content-images').upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error('No se pudo subir la miniatura'); }
    onUpdate({ thumbnail_url: supabase.storage.from('content-images').getPublicUrl(path).data.publicUrl });
    setUploading(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle className="pr-6">{item.title}</DialogTitle></DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <VideoPlayer item={{ ...item, video_url: form.video_url || null }} />
            <div className="space-y-1.5">
              <Label>Enlace del video (Google Drive o Milanote)</Label>
              <Input value={form.video_url} placeholder="https://drive.google.com/file/d/…" onChange={(e) => setForm({ ...form, video_url: e.target.value })} onBlur={() => save('video_url')} />
              <p className="text-[11px] text-muted-foreground">En Drive, compartilo como "Cualquier persona con el enlace".</p>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground hover:border-primary/60">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {item.thumbnail_url ? 'Cambiar miniatura' : 'Subir miniatura'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={item.status} />
              <Input type="date" className="h-8 w-auto" value={item.publish_date ?? ''} onChange={(e) => onUpdate({ publish_date: e.target.value || null })} />
              <Select value={item.status} onValueChange={(v) => onUpdate({ status: v })}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              {item.clickup_url && (
                <Button asChild variant="ghost" size="sm"><a href={item.clickup_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />ClickUp</a></Button>
              )}
            </div>
            {item.clickup_sync_error && <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">{item.clickup_sync_error}</p>}
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onBlur={() => save('title')} /></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><Label>Copy para publicar</Label>
                <Button variant="ghost" size="sm" className="h-6" onClick={() => { navigator.clipboard.writeText(form.copy); toast.success('Copy copiado'); }}><Copy className="h-3 w-3" /></Button></div>
              <Textarea rows={6} value={form.copy} onChange={(e) => setForm({ ...form, copy: e.target.value })} onBlur={() => save('copy')} />
            </div>
            <div className="space-y-1.5"><Label>Explicación para el cliente</Label><Textarea rows={3} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} onBlur={() => save('explanation')} /></div>

            <div className="space-y-2 border-t border-border pt-3">
              <Label>Notas y correcciones</Label>
              {comments.length === 0 && <p className="text-xs text-muted-foreground">Sin comentarios todavía.</p>}
              {comments.map((c) => (
                <div key={c.id} className={c.author_type === 'cliente' ? 'rounded-lg bg-primary/10 p-2 text-sm' : 'rounded-lg bg-muted p-2 text-sm'}>
                  <div className="mb-0.5 text-[11px] text-muted-foreground">
                    <b>{c.author_name}</b> · {c.kind === 'cambio' ? 'pidió cambios' : c.kind === 'aprobacion' ? 'aprobó' : 'nota'} · {new Date(c.created_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea rows={2} value={note} placeholder="Agregar una nota (el cliente la ve)" onChange={(e) => setNote(e.target.value)} />
                <Button size="icon" disabled={!note.trim()} onClick={async () => { await onComment(note.trim()); setNote(''); }}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}><Trash2 className="mr-1 h-3.5 w-3.5" />Quitar del calendario</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { CalendarDays };
