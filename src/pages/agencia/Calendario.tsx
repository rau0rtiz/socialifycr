import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Building2, CalendarDays, ChevronLeft, ChevronRight, Copy, ExternalLink, ImagePlus, Inbox, Loader2, MessageCircle, Send, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
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
import { monthLabel, STATUS_LABEL } from '@/lib/calendar-media';
import { DeliveryTargets } from '@/components/calendario/DeliveryTargets';
import { deliveryProgress, DELIVERY_TYPES, type TargetRow } from '@/lib/calendar-targets';
import { calendarToday } from '@/lib/calendar-progress';
import { isLegacyToken, prettyCalendarToken } from '@/lib/calendar-share';


interface Comment { id: string; item_id: string; author_name: string; author_type: string; kind: string; body: string; created_at: string }
type Item = CalendarItem & { client_id: string };

const nowCR = () => new Date(Date.now() - 6 * 3600000);

export default function Calendario() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [ym, setYm] = useState(() => ({ y: nowCR().getUTCFullYear(), m: nowCR().getUTCMonth() }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickDayFor, setPickDayFor] = useState<string | null>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['calendar-clients'],
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('production_sheets').select('client_id, clients(id, name, logo_url)');
      if (error) throw error;
      const map = new Map<string, { id: string; name: string; logo_url: string | null }>();
      for (const r of (data ?? []) as any[]) if (r.clients) map.set(r.clients.id, r.clients);
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const month = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`;
  const clientIds = clients.map((c) => c.id);
  const overviewKey = ['calendar-overview', clientIds];
  const { data: overview = [], isLoading: overviewLoading } = useQuery({
    queryKey: overviewKey,
    enabled: clientIds.length > 0,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('content_calendar_items')
        .select('id, client_id, publish_date, status, content_type').in('client_id', clientIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const targetsKey = ['calendar-targets', clientIds];
  const { data: targets = [] } = useQuery({
    queryKey: targetsKey, enabled: clientIds.length > 0, staleTime: 5 * 60_000, refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_delivery_targets').select('client_id, content_type, monthly_target')
        .in('client_id', clientIds);
      if (error) throw error;
      return (data ?? []) as TargetRow[];
    },
  });
  const saveTargets = async (id: string, rows: { content_type: string; monthly_target: number }[]) => {
    const keep = rows.map((r) => r.content_type);
    const { error: delError } = await supabase.from('client_delivery_targets').delete().eq('client_id', id)
      .not('content_type', 'in', `(${keep.length ? keep.join(',') : '__none__'})`);
    if (delError) { toast.error('No se pudieron guardar las entregas'); throw delError; }
    if (rows.length) {
      const { error } = await supabase.from('client_delivery_targets')
        .upsert(rows.map((r) => ({ client_id: id, ...r, updated_at: new Date().toISOString() })), { onConflict: 'client_id,content_type' });
      if (error) { toast.error('No se pudieron guardar las entregas'); throw error; }
    }
    await qc.invalidateQueries({ queryKey: ['calendar-targets'] });
    toast.success('Entregas mensuales guardadas');
  };
  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(ym.y, ym.m + delta, 1));
    setYm({ y: date.getUTCFullYear(), m: date.getUTCMonth() });
  };
  const activeClient = clients.find((c) => c.id === clientId);

  const itemsKey = ['calendar-items', clientId];
  const { data: items = [], isLoading } = useQuery({
    queryKey: itemsKey,
    enabled: !!clientId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('content_calendar_items').select('*')
        .eq('client_id', clientId).order('publish_date', { nullsFirst: true }).order('sort');
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
    const ch = supabase.channel(`calendar-overview-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_calendar_items' }, () => qc.invalidateQueries({ queryKey: ['calendar-overview'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_delivery_targets' }, () => qc.invalidateQueries({ queryKey: ['calendar-targets'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
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
    if (!clientId) return;
    qc.setQueryData<Item[]>(itemsKey, (old) => old?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from('content_calendar_items').update(patch as any).eq('id', id).eq('client_id', clientId);
    if (error) { toast.error('No se pudo guardar'); qc.invalidateQueries({ queryKey: itemsKey }); }
    qc.invalidateQueries({ queryKey: ['calendar-overview'] });
  };

  const unscheduled = items.filter((i) => !i.publish_date);
  const open = items.find((i) => i.id === openId) ?? null;
  const counts = useMemo(() => {
    const inMonth = items.filter((i) => i.publish_date?.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`));
    return { total: inMonth.length, ok: inMonth.filter((i) => i.status === 'aprobado').length, ch: inMonth.filter((i) => i.status === 'cambios').length };
  }, [items, ym]);

  const [shareLink, setShareLink] = useState<string | null>(null);

  const prettyLink = (token: string) => {
    const origin = location.hostname.includes('lovable') || location.hostname === 'localhost' ? 'https://app.socialifycr.com' : location.origin;
    return `${origin}/calendario/${token}`;
  };
  const slugToken = () => prettyCalendarToken(activeClient?.name ?? 'cliente');

  const ensureShare = async (): Promise<{ token: string; renewed: boolean } | null> => {
    if (!clientId) return null;
    let { data } = await supabase.from('content_calendar_shares').select('token').eq('client_id', clientId).maybeSingle();
    let renewed = false;
    if (data && isLegacyToken(data.token)) {
      const { error } = await supabase.from('content_calendar_shares').update({ token: slugToken() }).eq('client_id', clientId);
      if (!error) { renewed = true; data = null; }
    }
    if (!data) {
      for (let i = 0; i < 4; i++) {
        const { data: ins, error } = await supabase.from('content_calendar_shares').insert({ client_id: clientId, token: slugToken() }).select('token').single();
        if (!error) { data = ins; break; }
        if ((error as any).code !== '23505') { toast.error('No se pudo crear el enlace'); return null; }
      }
    }
    if (!data?.token) { toast.error('No se pudo crear el enlace'); return null; }
    return { token: data.token, renewed };
  };

  const share = async () => {
    const s = await ensureShare();
    if (!s) return;
    const link = prettyLink(s.token);
    setShareLink(link);
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success(s.renewed ? 'Enlace renovado y copiado. El anterior dejó de funcionar' : 'Enlace copiado');
  };

  const regenerate = async () => {
    if (!clientId || !confirm('El enlace anterior dejará de funcionar. ¿Continuar?')) return;
    await supabase.from('content_calendar_shares').delete().eq('client_id', clientId);
    await share();
  };

  if (!clientId) {
    const scheduled = overview.filter((i) => i.publish_date?.startsWith(month.slice(0, 7))).length;
    const behind = clients.filter((c) => deliveryProgress(overview.filter((i) => i.client_id === c.id), month, targets.filter((t) => t.client_id === c.id), calendarToday()).pace === 'behind').length;
    const withTargets = new Set(targets.map((t) => t.client_id)).size;
    return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-xs font-semibold uppercase text-primary">Publicación · {clients.length} clientes</p><h1 className="text-2xl font-semibold sm:text-3xl">Calendarios de clientes</h1></div>
        <div className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel(ym.y, ym.m)}</span><Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button></div>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-4 text-sm"><span><b className="text-xl tabular-nums">{scheduled}</b> piezas programadas</span><span><b className="text-xl tabular-nums text-warning">{behind}</b> calendarios atrasados</span><span><b className="text-xl tabular-nums">{withTargets}</b> con entregas definidas</span></div>
      {clientsLoading || overviewLoading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : clients.length === 0 ? <p className="py-12 text-center text-muted-foreground">Todavía no hay clientes con hojas de producción.</p> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clients.map((client) => <article key={client.id} className="agency-card group flex min-h-[300px] min-w-0 flex-col overflow-hidden sm:aspect-[2/3]">
          <Button type="button" variant="ghost" className="h-auto flex-1 flex-col items-start gap-3 rounded-none p-4 text-left" onClick={() => setClientId(client.id)} aria-label={`Abrir calendario de ${client.name}`}>
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">{client.logo_url ? <img src={client.logo_url} alt="" className="h-full w-full object-contain p-1.5" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}</div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <h2 className="line-clamp-2 text-lg font-semibold leading-tight">{client.name}</h2>
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground"><CalendarDays className="h-3 w-3" />Calendario de publicación</span>
            <span className="mt-auto text-xs font-medium text-primary">Ver calendario</span>
          </Button>
          <div className="border-t border-border bg-muted/30 p-4"><DeliveryTargets dense items={overview.filter((i) => i.client_id === client.id)} month={month} targets={targets.filter((t) => t.client_id === client.id)} onSave={(rows) => saveTargets(client.id, rows)} /></div>
        </article>)}
      </div>}
    </div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => { setClientId(null); setOpenId(null); setPickDayFor(null); qc.invalidateQueries({ queryKey: ['calendar-overview'] }); }}><ArrowLeft className="mr-2 h-4 w-4" />Todos los clientes</Button>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="flex items-center gap-3">{activeClient?.logo_url && <img src={activeClient.logo_url} alt="" className="h-12 w-12 rounded-lg border border-border bg-card object-contain p-1" />}<h1 className="text-2xl font-semibold">{activeClient?.name ?? 'Calendario de publicación'}</h1></div>
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
      </div>

      <div className="border-y border-border py-4"><DeliveryTargets items={items} month={month} targets={targets.filter((t) => t.client_id === clientId)} onSave={(rows) => saveTargets(clientId, rows)} /></div>

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
            qc.invalidateQueries({ queryKey: ['calendar-overview'] });
            setOpenId(null); qc.invalidateQueries({ queryKey: itemsKey });
          }}
          onComment={async (body) => {
            const name = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Socialify';
            await supabase.from('content_calendar_comments').insert({ item_id: open.id, author_name: name, author_type: 'agencia', kind: 'nota', body });
            qc.invalidateQueries({ queryKey: commentsKey });
          }}
        />
      )}

      <Dialog open={!!shareLink} onOpenChange={(o) => !o && setShareLink(null)}>
        <DialogContent className="max-w-lg gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeClient?.logo_url ? <img src={activeClient.logo_url} alt="" className="h-7 w-7 rounded-md border border-border bg-background object-contain p-0.5" /> : <Share2 className="h-4 w-4 text-primary" />}
              Compartir calendario
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cualquiera con este enlace ve el calendario de {activeClient?.name ?? 'este cliente'} sin entrar a la app.</p>
          <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-xs" title={shareLink ?? ''}>{shareLink}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copiar enlace" onClick={() => { if (shareLink) { navigator.clipboard.writeText(shareLink); toast.success('Enlace copiado'); } }}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid w-full grid-cols-3 gap-2">
            <Button asChild variant="outline" size="sm"><a href={shareLink ?? '#'} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Abrir</a></Button>
            <Button asChild variant="outline" size="sm"><a href={`https://wa.me/?text=${encodeURIComponent(`Calendario de ${activeClient?.name ?? 'publicación'}: ${shareLink ?? ''}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</a></Button>
            <Button variant="outline" size="sm" onClick={regenerate}>Nuevo enlace</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}

function ItemDialog({ item, comments, onClose, onUpdate, onDelete, onComment }: {
  item: Item; comments: Comment[]; onClose: () => void;
  onUpdate: (p: Partial<Item>) => void; onDelete: () => void; onComment: (b: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: item.title, copy: item.copy ?? '', explanation: item.explanation ?? '', video_url: item.video_url ?? '' });
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const save = (k: keyof typeof form) => { if (((item as any)[k] ?? '') !== form[k]) onUpdate({ [k]: form[k] || null } as any); };

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
              <Select value={item.content_type ?? 'otro'} onValueChange={(v) => onUpdate({ content_type: v })}>
                <SelectTrigger className="h-8 w-[130px]" aria-label="Tipo de pieza"><SelectValue /></SelectTrigger>
                <SelectContent>{DELIVERY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
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

