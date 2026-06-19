import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Plus, Link2, FileText } from 'lucide-react';

interface Props {
  sheetId: string;
  sheetTitle: string;
  defaults?: {
    spaceId?: string | null;
    spaceName?: string | null;
    listId?: string | null;
    listName?: string | null;
  };
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

type Option = { id: string; name: string; folder_name?: string | null };
type Member = { id: number; username: string; email: string };
type Shot = {
  id: string;
  concept: string | null;
  description: string | null;
  content_type: string | null;
  platform: string | null;
  hook: string | null;
  script: string | null;
  cta: string | null;
  tech_notes: string | null;
  done: boolean;
  sort_order: number;
  clickup_task_id: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  reel: 'REEL', story: 'STORY', post: 'POST',
  tiktok: 'TIKTOK', short: 'SHORT', otro: 'CONTENIDO',
};
const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'IG', tiktok: 'TT', youtube: 'YT', linkedin: 'LI', multi: 'MULTI',
};

function buildTitle(s: Shot): string {
  const t = TYPE_LABEL[s.content_type || 'otro'] || 'CONTENIDO';
  const p = PLATFORM_LABEL[s.platform || ''] || '';
  const concept = s.concept || s.description || 'Pieza sin título';
  return `[${t}${p ? ' · ' + p : ''}] ${concept}`;
}

function buildPreviewDescription(s: Shot): string {
  const lines: string[] = [];
  if (s.hook) lines.push(`⚡ Hook: ${s.hook}`);
  if (s.script) lines.push(`📝 ${s.script}`);
  if (s.cta) lines.push(`🎯 CTA: ${s.cta}`);
  if (s.tech_notes) lines.push(`🎥 ${s.tech_notes}`);
  return lines.join(' · ');
}

async function callMeta(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('clickup-meta', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function SendToClickUpDialog({ sheetId, sheetTitle, defaults, open, onClose, onSent }: Props) {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>(defaults?.spaceId || '');
  const [listId, setListId] = useState<string>(defaults?.listId || '');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [newListName, setNewListName] = useState<string>('');
  const [creatingList, setCreatingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('none');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSpaceId(defaults?.spaceId || '');
      setListId(defaults?.listId || '');
      setMode('existing');
      setNewListName(sheetTitle || '');
      setAssigneeId('none');
    }
  }, [open, defaults?.spaceId, defaults?.listId, sheetTitle]);

  // Load shots for preview
  const shotsQ = useQuery<Shot[]>({
    queryKey: ['cu-preview-shots', sheetId],
    enabled: open && !!sheetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_sheet_shots')
        .select('id, concept, description, content_type, platform, hook, script, cta, tech_notes, done, sort_order, clickup_task_id')
        .eq('sheet_id', sheetId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Shot[];
    },
  });

  // Preselect: prefer shots marked done; if none done, preselect all
  useEffect(() => {
    if (!shotsQ.data) return;
    const done = shotsQ.data.filter(s => s.done);
    const initial = done.length > 0 ? done : shotsQ.data;
    setSelectedIds(new Set(initial.map(s => s.id)));
  }, [shotsQ.data]);

  const workspaces = useQuery<Option[]>({
    queryKey: ['cu-workspaces'],
    enabled: open,
    queryFn: async () => {
      const d = await callMeta('workspaces');
      const all = (d.teams || []).map((t: any) => ({ id: t.id, name: t.name }));
      const socialify = all.filter((t: Option) => /socialify/i.test(t.name));
      return socialify.length ? socialify : all;
    },
  });

  useEffect(() => {
    if (!workspaceId && workspaces.data && workspaces.data.length > 0) {
      const sf = workspaces.data.find(w => /socialify/i.test(w.name)) || workspaces.data[0];
      setWorkspaceId(sf.id);
    }
  }, [workspaces.data, workspaceId]);

  const spaces = useQuery<Option[]>({
    queryKey: ['cu-spaces', workspaceId],
    enabled: open && !!workspaceId,
    queryFn: async () => {
      const d = await callMeta('spaces', { team_id: workspaceId });
      return (d.spaces || []).map((s: any) => ({ id: s.id, name: s.name }));
    },
  });

  const lists = useQuery<Option[]>({
    queryKey: ['cu-all-lists', spaceId],
    enabled: open && !!spaceId,
    queryFn: async () => {
      const d = await callMeta('all_space_lists', { space_id: spaceId });
      return (d.lists || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        folder_name: l.folder_name || null,
      }));
    },
  });

  useEffect(() => {
    if (!open || !listId || !lists.data) return;
    const exists = lists.data.some((l) => l.id === listId);
    if (!exists) {
      setListId('');
      toast.error('La lista guardada ya no existe en ClickUp. Selecciona o crea otra lista.');
    }
  }, [open, listId, lists.data]);

  // Load assignable members of the chosen list
  const members = useQuery<Member[]>({
    queryKey: ['cu-list-members', listId],
    enabled: open && !!listId,
    queryFn: async () => {
      const d = await callMeta('list_members', { list_id: listId });
      return (d.members || []).map((m: any) => ({
        id: m.id,
        username: m.username || m.email || `User ${m.id}`,
        email: m.email || '',
      }));
    },
  });

  const selectedSpaceName = useMemo(
    () => spaces.data?.find(s => s.id === spaceId)?.name || null,
    [spaces.data, spaceId]
  );
  const selectedListName = useMemo(
    () => lists.data?.find(l => l.id === listId)?.name || null,
    [lists.data, listId]
  );

  const handleCreateList = async () => {
    if (!spaceId) { toast.error('Selecciona primero un Space'); return; }
    if (!newListName.trim()) { toast.error('Pon un nombre a la lista'); return; }
    setCreatingList(true);
    try {
      const d = await callMeta('create_list', { space_id: spaceId, name: newListName.trim() });
      toast.success(`Lista "${d.name}" creada`);
      setListId(d.id);
      setMode('existing');
      lists.refetch();
    } catch (e: any) {
      toast.error(e.message || 'No pude crear la lista');
    } finally {
      setCreatingList(false);
    }
  };

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (!shotsQ.data) return;
    if (selectedIds.size === shotsQ.data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(shotsQ.data.map(s => s.id)));
  };

  const handleSend = async () => {
    if (!listId) { toast.error('Selecciona o crea una lista'); return; }
    if (selectedIds.size === 0) { toast.error('Selecciona al menos una pieza'); return; }
    setSending(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('clickup-create-tasks', {
        body: {
          sheet_id: sheetId,
          list_id: listId,
          list_name: selectedListName,
          space_id: spaceId,
          space_name: selectedSpaceName,
          shot_ids: Array.from(selectedIds),
          assignee_id: assigneeId !== 'none' ? Number(assigneeId) : null,
        },
      });
      if (error) throw new Error(error.message);
      if (resp?.error) throw new Error(resp.error);
      const c = resp?.tasks_created || 0;
      const u = resp?.tasks_updated || 0;
      const f = resp?.tasks_failed || 0;
      if (f > 0) {
        const firstErr = resp?.failed?.[0]?.error || 'error desconocido';
        toast.error(`${f} fallaron · ${c} creadas · ${u} actualizadas. Detalle: ${firstErr}`, { duration: 12000 });
      } else if (c === 0 && u === 0) {
        toast.error('No se creó ninguna task. Revisá que las piezas seleccionadas no hayan sido enviadas antes.');
      } else {
        toast.success(`${c} creada(s) · ${u} actualizada(s)`);
      }
      onSent?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error enviando a ClickUp');
    } finally {
      setSending(false);
    }
  };

  const shots = shotsQ.data || [];
  const allSelected = shots.length > 0 && selectedIds.size === shots.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Enviar a ClickUp
          </DialogTitle>
          <DialogDescription>
            Elegí destino, asignado y revisá las tasks antes de crearlas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Workspace" loading={workspaces.isLoading}>
              <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center text-sm">
                <span className="truncate">{workspaces.data?.find(w => w.id === workspaceId)?.name || 'SOCIALIFY'}</span>
              </div>
            </Field>

            <Field label="Space" loading={spaces.isFetching} disabled={!workspaceId}>
              <Select value={spaceId} onValueChange={(v) => { setSpaceId(v); setListId(''); }} disabled={!workspaceId}>
                <SelectTrigger><SelectValue placeholder="Selecciona space" /></SelectTrigger>
                <SelectContent>
                  {(spaces.data || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`px-2.5 py-1 rounded-md border ${mode === 'existing' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
            >
              Usar lista existente
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`px-2.5 py-1 rounded-md border ${mode === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}
            >
              <Plus className="h-3 w-3 inline -mt-0.5 mr-0.5" /> Crear nueva
            </button>
          </div>

          {mode === 'existing' ? (
            <Field label="List" loading={lists.isFetching} disabled={!spaceId}>
              <Select value={listId} onValueChange={setListId} disabled={!spaceId}>
                <SelectTrigger><SelectValue placeholder="Selecciona list" /></SelectTrigger>
                <SelectContent>
                  {(lists.data || []).map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.folder_name ? `${o.folder_name} / ${o.name}` : o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Nombre de la nueva lista</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej: Grabación 18 de junio"
                />
                <Button onClick={handleCreateList} disabled={creatingList || !spaceId}>
                  {creatingList ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear'}
                </Button>
              </div>
            </div>
          )}

          <Field label="Asignar a" loading={members.isFetching} disabled={!listId}>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!listId}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sin asignar —</SelectItem>
                {(members.data || []).map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.username}{m.email ? ` · ${m.email}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Preview */}
          <div className="border rounded-md">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium">
                <FileText className="h-3.5 w-3.5" />
                Vista previa de tasks
                <span className="text-muted-foreground">({selectedIds.size}/{shots.length})</span>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] underline text-muted-foreground hover:text-foreground"
              >
                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
            <ScrollArea className="max-h-[260px]">
              <ul className="divide-y">
                {shotsQ.isLoading && (
                  <li className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando piezas…
                  </li>
                )}
                {!shotsQ.isLoading && shots.length === 0 && (
                  <li className="p-3 text-xs text-muted-foreground">No hay piezas en esta hoja.</li>
                )}
                {shots.map((s) => {
                  const checked = selectedIds.has(s.id);
                  const preview = buildPreviewDescription(s);
                  return (
                    <li key={s.id} className="p-2.5 flex gap-2.5 items-start hover:bg-muted/20">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(s.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate flex items-center gap-1.5">
                          {buildTitle(s)}
                          {s.clickup_task_id && (
                            <span className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              update
                            </span>
                          )}
                        </div>
                        {preview && (
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {preview}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || !listId || selectedIds.size === 0}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Enviar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, loading, disabled, children }: { label: string; loading?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <Label className="text-xs text-muted-foreground flex items-center gap-2">
        {label}
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
