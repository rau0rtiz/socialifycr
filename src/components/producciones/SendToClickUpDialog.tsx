import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Plus, Link2 } from 'lucide-react';

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

  useEffect(() => {
    if (open) {
      setSpaceId(defaults?.spaceId || '');
      setListId(defaults?.listId || '');
      setMode('existing');
      setNewListName(sheetTitle || '');
    }
  }, [open, defaults?.spaceId, defaults?.listId, sheetTitle]);

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

  const handleSend = async () => {
    if (!listId) { toast.error('Selecciona o crea una lista'); return; }
    setSending(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('clickup-create-tasks', {
        body: {
          sheet_id: sheetId,
          list_id: listId,
          list_name: selectedListName,
          space_id: spaceId,
          space_name: selectedSpaceName,
        },
      });
      if (error) throw new Error(error.message);
      if (resp?.error) throw new Error(resp.error);
      toast.success(`${resp.tasks_created || 0} pieza(s) enviada(s) a ClickUp`);
      onSent?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error enviando a ClickUp');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Enviar a ClickUp
          </DialogTitle>
          <DialogDescription>
            Elegí el Space y la List donde se van a crear las tasks. Podés crear una nueva lista para esta hoja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Workspace" loading={workspaces.isLoading}>
            <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center text-sm">
              {workspaces.data?.find(w => w.id === workspaceId)?.name || 'SOCIALIFY'}
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Fijo</span>
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
              <p className="text-[11px] text-muted-foreground mt-1">
                Se crea sin carpeta dentro del Space seleccionado.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || !listId}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Enviar a ClickUp
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
