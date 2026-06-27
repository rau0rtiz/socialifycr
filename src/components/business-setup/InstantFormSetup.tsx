import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstantFormLeadSource,
  useSaveInstantFormLeadSource,
  useSyncInstantFormLeads,
} from '@/hooks/use-instant-form-leads';

interface Props {
  clientId: string;
}

// Extract spreadsheet ID from a full URL or accept the bare ID.
const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
};

export const InstantFormSetup = ({ clientId }: Props) => {
  const { data: source } = useInstantFormLeadSource(clientId);
  const save = useSaveInstantFormLeadSource(clientId);
  const sync = useSyncInstantFormLeads(clientId);

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');

  useEffect(() => {
    if (source) {
      setSpreadsheetId(source.spreadsheet_id);
      setSheetName(source.sheet_name);
    }
  }, [source]);

  const handleSave = async () => {
    const id = extractSpreadsheetId(spreadsheetId);
    if (!id) {
      toast.error('Pegá el link o el ID del Google Sheet');
      return;
    }
    try {
      await save.mutateAsync({ spreadsheet_id: id, sheet_name: sheetName });
      toast.success('Configuración guardada');
    } catch (e: any) {
      toast.error('Error al guardar', { description: e.message });
    }
  };

  const handleSync = async () => {
    try {
      const res = await sync.mutateAsync();
      toast.success(`${res.synced} leads sincronizados`, {
        description: `${res.total} filas · ${res.skipped} omitidas`,
      });
    } catch (e: any) {
      toast.error('Error al sincronizar', { description: e.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Instant Form (Google Sheets)</CardTitle>
        <CardDescription>
          Conectá el Google Sheet donde caen los leads del Instant Form de Meta. El Sheet debe estar
          compartido con la cuenta de Google conectada a Lovable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Link o ID del Google Sheet</Label>
          <Input
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          {source?.spreadsheet_id && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${source.spreadsheet_id}/edit`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              Abrir Sheet <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="space-y-2">
          <Label>Nombre de la pestaña</Label>
          <Input
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
          <Button onClick={handleSync} disabled={sync.isPending || !source} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} />
            Sincronizar ahora
          </Button>
        </div>

        {source?.last_synced_at && (
          <p className="text-xs text-muted-foreground">
            Última sincronización: {new Date(source.last_synced_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}
            {source.last_row_count != null && ` · ${source.last_row_count} filas`}
          </p>
        )}
        {source?.last_error && (
          <p className="text-xs text-destructive">Último error: {source.last_error}</p>
        )}
      </CardContent>
    </Card>
  );
};
