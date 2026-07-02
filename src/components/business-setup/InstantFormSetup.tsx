import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Loader2, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstantFormLeadSources,
  useSaveInstantFormLeadSource,
  useDeleteInstantFormLeadSource,
  useSyncInstantFormLeads,
  type InstantFormLeadSource,
} from '@/hooks/use-instant-form-leads';

interface Props {
  clientId: string;
}

const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
};

interface RowFormState {
  id?: string;
  label: string;
  spreadsheetInput: string;
  sheetName: string;
}

const SourceForm = ({
  clientId,
  initial,
  onDone,
}: {
  clientId: string;
  initial?: InstantFormLeadSource;
  onDone: () => void;
}) => {
  const save = useSaveInstantFormLeadSource(clientId);
  const [state, setState] = useState<RowFormState>({
    id: initial?.id,
    label: initial?.label || '',
    spreadsheetInput: initial?.spreadsheet_id || '',
    sheetName: initial?.sheet_name || 'Sheet1',
  });

  const handleSave = async () => {
    const id = extractSpreadsheetId(state.spreadsheetInput);
    if (!id) {
      toast.error('Pegá el link o el ID del Google Sheet');
      return;
    }
    if (!state.label.trim()) {
      toast.error('Ponele un nombre al formulario (ej. "Camisas", "Uniformes")');
      return;
    }
    try {
      await save.mutateAsync({
        id: state.id,
        spreadsheet_id: id,
        sheet_name: state.sheetName,
        label: state.label,
      });
      toast.success(state.id ? 'Formulario actualizado' : 'Formulario agregado');
      onDone();
    } catch (e: any) {
      toast.error('Error al guardar', { description: e.message });
    }
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{state.id ? 'Editar formulario' : 'Nuevo formulario'}</p>
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nombre del formulario</Label>
          <Input
            value={state.label}
            onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
            placeholder="Ej. Uniformes empresariales"
          />
        </div>
        <div className="space-y-1">
          <Label>Nombre de la pestaña</Label>
          <Input
            value={state.sheetName}
            onChange={(e) => setState((s) => ({ ...s, sheetName: e.target.value }))}
            placeholder="Sheet1"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Link o ID del Google Sheet</Label>
        <Input
          value={state.spreadsheetInput}
          onChange={(e) => setState((s) => ({ ...s, spreadsheetInput: e.target.value }))}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </div>
      <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {state.id ? 'Guardar cambios' : 'Agregar formulario'}
      </Button>
    </div>
  );
};

export const InstantFormSetup = ({ clientId }: Props) => {
  const { data: sources = [] } = useInstantFormLeadSources(clientId);
  const sync = useSyncInstantFormLeads(clientId);
  const remove = useDeleteInstantFormLeadSource(clientId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      toast.success(`${res.synced ?? 0} leads sincronizados`, {
        description: `${res.total ?? 0} filas · ${res.skipped ?? 0} omitidas`,
      });
    } catch (e: any) {
      toast.error('Error al sincronizar', { description: e.message });
    }
  };

  const handleDelete = async (id: string, label: string | null) => {
    if (!confirm(`¿Eliminar el formulario "${label || 'sin nombre'}"? Los leads ya sincronizados se mantienen.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Formulario eliminado');
    } catch (e: any) {
      toast.error('Error al eliminar', { description: e.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Instant Form (Google Sheets)</CardTitle>
        <CardDescription>
          Conectá uno o más Google Sheets donde caen los leads del Instant Form de Meta. Cada Sheet debe estar
          compartido con la cuenta de Google conectada a Lovable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground">Todavía no hay formularios conectados.</p>
        )}

        {sources.map((s) =>
          editingId === s.id ? (
            <SourceForm key={s.id} clientId={clientId} initial={s} onDone={() => setEditingId(null)} />
          ) : (
            <div key={s.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{s.label || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">Pestaña: {s.sheet_name}</p>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${s.spreadsheet_id}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Abrir Sheet <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(s.id)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, s.label)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {s.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Última sync: {new Date(s.last_synced_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}
                  {s.last_row_count != null && ` · ${s.last_row_count} filas`}
                </p>
              )}
              {s.last_error && <p className="text-xs text-destructive">Último error: {s.last_error}</p>}
            </div>
          ),
        )}

        {creating && (
          <SourceForm clientId={clientId} onDone={() => setCreating(false)} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!creating && (
            <Button onClick={() => setCreating(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar formulario
            </Button>
          )}
          <Button
            onClick={handleSync}
            disabled={sync.isPending || sources.length === 0}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} />
            Sincronizar todos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
