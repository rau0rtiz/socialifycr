import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Loader2, Link2 } from 'lucide-react';

interface Props {
  clientId: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
}

type Option = { id: string; name: string };

async function callMeta(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('clickup-meta', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function ClickUpConfigDialog({ clientId, clientName, open, onClose }: Props) {
  const qc = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>(''); // '' = sin carpeta
  const [listId, setListId] = useState<string>('');
  const [emails, setEmails] = useState<string>('');

  // Existing config
  const { data: existing } = useQuery({
    queryKey: ['clickup-config', clientId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_clickup_config')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setWorkspaceId(existing.workspace_id || '');
      setSpaceId(existing.space_id || '');
      setListId(existing.list_id || '');
      setEmails((existing.default_assignee_emails || []).join(', '));
    }
  }, [existing]);

  const workspaces = useQuery<Option[]>({
    queryKey: ['cu-workspaces'],
    enabled: open,
    queryFn: async () => {
      const d = await callMeta('workspaces');
      const all = (d.teams || []).map((t: any) => ({ id: t.id, name: t.name }));
      // Solo SOCIALIFY como workspace por defecto
      const socialify = all.filter((t: Option) => /socialify/i.test(t.name));
      return socialify.length ? socialify : all;
    },
  });

  // Auto-seleccionar SOCIALIFY al cargar
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

  const folders = useQuery<Option[]>({
    queryKey: ['cu-folders', spaceId],
    enabled: open && !!spaceId,
    queryFn: async () => {
      const d = await callMeta('folders', { space_id: spaceId });
      return (d.folders || []).map((f: any) => ({ id: f.id, name: f.name }));
    },
  });

  const lists = useQuery<Option[]>({
    queryKey: ['cu-lists', spaceId, folderId],
    enabled: open && !!spaceId,
    queryFn: async () => {
      if (folderId) {
        const d = await callMeta('folder_lists', { folder_id: folderId });
        return (d.lists || []).map((l: any) => ({ id: l.id, name: l.name }));
      }
      const d = await callMeta('folderless_lists', { space_id: spaceId });
      return (d.lists || []).map((l: any) => ({ id: l.id, name: l.name }));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !spaceId || !listId) {
        throw new Error('Selecciona workspace, space y list');
      }
      const workspaceName = workspaces.data?.find(w => w.id === workspaceId)?.name || null;
      const spaceName = spaces.data?.find(s => s.id === spaceId)?.name || null;
      const listName = lists.data?.find(l => l.id === listId)?.name || null;
      const parsedEmails = emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

      const { error } = await supabase.from('client_clickup_config').upsert({
        client_id: clientId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        space_id: spaceId,
        space_name: spaceName,
        list_id: listId,
        list_name: listName,
        default_assignee_emails: parsedEmails,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clickup-config', clientId] });
      toast.success('Configuración guardada');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> ClickUp — {clientName}
          </DialogTitle>
          <DialogDescription>
            Mapea esta cuenta a un Workspace → Space → List de ClickUp donde se crearán las tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Workspace" loading={workspaces.isLoading}>
            <Select value={workspaceId} onValueChange={(v) => { setWorkspaceId(v); setSpaceId(''); setFolderId(''); setListId(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona workspace" /></SelectTrigger>
              <SelectContent>
                {(workspaces.data || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Space" loading={spaces.isFetching} disabled={!workspaceId}>
            <Select value={spaceId} onValueChange={(v) => { setSpaceId(v); setFolderId(''); setListId(''); }} disabled={!workspaceId}>
              <SelectTrigger><SelectValue placeholder="Selecciona space" /></SelectTrigger>
              <SelectContent>
                {(spaces.data || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Carpeta (opcional)" loading={folders.isFetching} disabled={!spaceId}>
            <Select value={folderId || '__none__'} onValueChange={(v) => { setFolderId(v === '__none__' ? '' : v); setListId(''); }} disabled={!spaceId}>
              <SelectTrigger><SelectValue placeholder="Sin carpeta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin carpeta —</SelectItem>
                {(folders.data || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="List" loading={lists.isFetching} disabled={!spaceId}>
            <Select value={listId} onValueChange={setListId} disabled={!spaceId}>
              <SelectTrigger><SelectValue placeholder="Selecciona list" /></SelectTrigger>
              <SelectContent>
                {(lists.data || []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div>
            <Label className="text-xs text-muted-foreground">Emails asignados por defecto (separados por coma)</Label>
            <Input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="raul@empresa.com, productor@empresa.com"
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Deben coincidir con los emails de los miembros del List en ClickUp.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Guardar
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
