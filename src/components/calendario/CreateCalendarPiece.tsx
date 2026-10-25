import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PIECE_TYPES } from '@/lib/calendar-targets';
import { toast } from 'sonner';

export function CreateCalendarPiece({ clientId, spaceId, spaceName, defaultListId, onClose, onCreated }: { clientId: string; spaceId: string; spaceName: string; defaultListId: string | null; onClose: () => void; onCreated: () => void }) {
  const [itemId] = useState(() => crypto.randomUUID());
  const [listId, setListId] = useState(defaultListId ?? '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('reel');
  const [platform, setPlatform] = useState('instagram');
  const [date, setDate] = useState('');
  const [copy, setCopy] = useState('');
  const [explanation, setExplanation] = useState('');
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const lists = useQuery<{ id: string; name: string; folder_name?: string }[]>({
    queryKey: ['cu-all-lists', spaceId], staleTime: 5 * 60_000, refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('clickup-meta', { body: { action: 'all_space_lists', space_id: spaceId } });
      if (error || data?.error) throw new Error(data?.error ?? 'No se pudieron cargar las listas de ClickUp.');
      return data.lists ?? [];
    },
  });
  useEffect(() => { if (lists.data && !lists.data.some(l => l.id === listId)) setListId(''); }, [lists.data, listId]);
  const create = async () => {
    if (!title.trim() || !listId) return toast.error('Escribí un título y elegí una lista.');
    if (video && !/^https?:\/\/\S+$/i.test(video)) return toast.error('Revisá el enlace del video.');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-clickup', { body: { action: 'create', client_id: clientId, item_id: itemId, list_id: listId, title: title.trim(), content_type: type, platform, publish_date: date || null, copy, explanation, video_url: video } });
      if (error) { const detail = await (error as any).context?.json().catch(() => null); throw new Error(detail?.error ?? error.message); }
      if (data?.error && !data.saved) throw new Error(data.error);
      if (data.saved) toast.warning(data.error); else toast.success('Pieza creada y enviada a ClickUp');
      onCreated(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={o => !o && !busy && onClose()}><DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
    <DialogHeader className="border-b border-border px-5 py-4">
      <DialogTitle>Nueva pieza</DialogTitle>
      <p className="text-sm text-muted-foreground">Se crea en el calendario y se envía a ClickUp · {spaceName}</p>
    </DialogHeader>
    <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2"><Label>Título</Label><Input value={title} maxLength={255} placeholder="Ej: Reel | Antes y después" onChange={e => setTitle(e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Lista de ClickUp</Label><Select value={listId} onValueChange={setListId} disabled={lists.isLoading}><SelectTrigger><SelectValue placeholder="Seleccioná una lista" /></SelectTrigger><SelectContent>{lists.data?.map(l => <SelectItem key={l.id} value={l.id}>{l.folder_name ? `${l.folder_name} / ` : ''}{l.name}</SelectItem>)}</SelectContent></Select>{lists.isLoading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando listas…</p>}{lists.error && <p className="text-sm text-destructive">{lists.error.message}</p>}</div>
      <div className="space-y-1.5"><Label>Tipo</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PIECE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Plataforma</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['instagram','tiktok','youtube','facebook','linkedin','google','multi'].map(p => <SelectItem key={p} value={p}>{p === 'multi' ? 'Varias' : p}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Fecha de publicación</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="[color-scheme:dark]" /></div>
      <div className="space-y-1.5"><Label>Enlace del video</Label><Input type="url" maxLength={2000} placeholder="https://…" value={video} onChange={e => setVideo(e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Copy / guion</Label><Textarea rows={4} maxLength={30000} value={copy} onChange={e => setCopy(e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Explicación / notas</Label><Textarea rows={2} maxLength={10000} value={explanation} onChange={e => setExplanation(e.target.value)} /></div>
    </div>
    <div className="border-t border-border px-5 py-4">
      <Button className="w-full sm:w-auto" disabled={busy || !title.trim() || !listId || !lists.data?.some(l => l.id === listId)} onClick={create}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Crear y enviar a ClickUp</Button>
    </div>
  </DialogContent></Dialog>;
}