import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, Check, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchProposalHtml } from '@/hooks/use-agency-proposals';
import {
  useProductionSheets,
  useCreateSheet,
  useUpsertChild,
  useDeleteChild,
} from '@/hooks/use-production-sheets';

type GeneratedShot = {
  content_type: string;
  platform: string;
  concept: string;
  description: string;
  hook: string;
  script: string;
  cta: string;
  tech_notes: string;
  duration_estimate: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string | null;
  planTitle: string;
  defaultClientName?: string | null;
}

export function AddPlanToSheetDialog({ open, onOpenChange, planId, planTitle, defaultClientName }: Props) {
  const [clientId, setClientId] = useState<string>('');
  const [sheetMode, setSheetMode] = useState<'new' | 'existing'>('new');
  const [existingSheetId, setExistingSheetId] = useState<string>('');
  const [newSheetTitle, setNewSheetTitle] = useState<string>('');
  const [model, setModel] = useState<'claude-opus-4-5' | 'claude-sonnet-4-5'>('claude-opus-4-5');
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedShot[] | null>(null);
  const [keep, setKeep] = useState<boolean[]>([]);

  const { data: clients = [] } = useQuery({
    queryKey: ['plan-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: allSheets = [] } = useProductionSheets();
  const clientSheets = useMemo(
    () => allSheets.filter((s) => s.client_id === clientId),
    [allSheets, clientId],
  );

  const createSheet = useCreateSheet();
  const upsertShot = useUpsertChild('production_sheet_shots');
  const delShot = useDeleteChild('production_sheet_shots');

  const reset = () => {
    setClientId('');
    setSheetMode('new');
    setExistingSheetId('');
    setNewSheetTitle('');
    setResult(null);
    setKeep([]);
    setLoading(false);
    setSaving(false);
    setReplace(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const canGenerate =
    !!planId && !!clientId && !loading &&
    (sheetMode === 'new' ? !!newSheetTitle.trim() : !!existingSheetId);

  const handleGenerate = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      // 1) Load plan HTML
      const plan_html = await fetchProposalHtml(planId);
      if (!plan_html || plan_html.trim().length < 50) {
        throw new Error('El plan no tiene HTML suficiente para generar piezas.');
      }

      // 2) Ensure we have a sheet_id (create if needed)
      let sheet_id = existingSheetId;
      if (sheetMode === 'new') {
        const created = await createSheet.mutateAsync({
          client_id: clientId,
          title: newSheetTitle.trim() || `Plan: ${planTitle}`,
        });
        sheet_id = created.id;
        setExistingSheetId(sheet_id);
      }

      // 3) Call edge function
      const { data, error } = await supabase.functions.invoke('generate-shots-from-plan', {
        body: { sheet_id, plan_html, model },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const shots = (data as any)?.shots as GeneratedShot[];
      if (!Array.isArray(shots) || shots.length === 0) {
        throw new Error('Claude no devolvió piezas.');
      }
      setResult(shots);
      setKeep(shots.map(() => true));
      // In new-sheet mode we already created the sheet; keep it selected as existing
      if (sheetMode === 'new') setSheetMode('existing');
      toast.success(`Claude leyó el plan y propuso ${shots.length} pieza${shots.length !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'No se pudo generar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !existingSheetId) return;
    const selected = result.filter((_, i) => keep[i]);
    if (selected.length === 0) {
      toast.error('Marcá al menos una pieza.');
      return;
    }
    setSaving(true);
    try {
      const sheet_id = existingSheetId;
      let base = 0;
      if (replace) {
        const existing = clientSheets.find((s) => s.id === sheet_id);
        if (existing) {
          // Nothing to load here – we just wipe existing shots for the sheet
        }
        const { data: existingShots } = await supabase
          .from('production_sheet_shots')
          .select('id')
          .eq('sheet_id', sheet_id);
        for (const s of existingShots ?? []) {
          await delShot.mutateAsync({ id: (s as any).id, sheet_id });
        }
      } else {
        const { count } = await supabase
          .from('production_sheet_shots')
          .select('id', { head: true, count: 'exact' })
          .eq('sheet_id', sheet_id);
        base = count ?? 0;
      }
      for (let i = 0; i < selected.length; i++) {
        const s = selected[i];
        await upsertShot.mutateAsync({
          sheet_id,
          concept: s.concept,
          description: s.description,
          hook: s.hook,
          script: s.script,
          cta: s.cta,
          tech_notes: s.tech_notes,
          duration_estimate: s.duration_estimate,
          content_type: s.content_type,
          platform: s.platform,
          done: false,
          is_draft: false,
          sort_order: base + i,
        });
      }
      toast.success(`${selected.length} pieza${selected.length !== 1 ? 's' : ''} agregada${selected.length !== 1 ? 's' : ''} a la hoja.`);
      handleClose(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'No se pudieron guardar las piezas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Agregar plan a hoja de producción
          </DialogTitle>
          <DialogDescription>
            Claude lee el plan de contenido y crea las piezas dentro de una hoja.
            {defaultClientName ? ` Cliente sugerido: ${defaultClientName}.` : ''}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Hoja de producción</Label>
              <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setSheetMode('new')}
                  className={`px-3 py-1 text-xs rounded ${sheetMode === 'new' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                >
                  Crear nueva
                </button>
                <button
                  type="button"
                  onClick={() => setSheetMode('existing')}
                  disabled={!clientId || clientSheets.length === 0}
                  className={`px-3 py-1 text-xs rounded disabled:opacity-40 ${sheetMode === 'existing' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                >
                  Usar existente ({clientSheets.length})
                </button>
              </div>

              {sheetMode === 'new' ? (
                <Input
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder={`Ej: ${planTitle}`}
                />
              ) : (
                <Select value={existingSheetId} onValueChange={setExistingSheetId}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná una hoja" /></SelectTrigger>
                  <SelectContent>
                    {clientSheets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title || '(sin título)'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={model} onValueChange={(v) => setModel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-opus-4-5">Claude Opus 4.5 (mejor)</SelectItem>
                    <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5 (más barato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sheetMode === 'existing' && (
                <div className="space-y-1.5">
                  <Label className="block">Reemplazar existentes</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={replace} onCheckedChange={setReplace} />
                    <span className="text-xs text-muted-foreground">
                      {replace ? 'Borra las piezas actuales' : 'Agrega al final'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Claude está leyendo el plan…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generar piezas del plan</>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Claude extrajo <b>{result.length}</b> pieza{result.length !== 1 ? 's' : ''} del plan. Desmarcá las que no querés guardar.
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {result.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setKeep((k) => k.map((v, j) => (j === i ? !v : v)))}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    keep[i] ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                      keep[i] ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                    }`}>
                      {keep[i] && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold bg-foreground/10 rounded px-1.5 py-0.5">
                          {s.content_type}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s.platform} · {s.duration_estimate || '—'}
                        </span>
                      </div>
                      <div className="font-medium text-sm">{s.concept}</div>
                      {s.hook && <div className="text-xs text-muted-foreground mt-1"><b>Hook:</b> {s.hook}</div>}
                      {s.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setResult(null); setKeep([]); }} disabled={saving}>
                Regenerar
              </Button>
              <Button onClick={handleSave} disabled={saving || keep.every((k) => !k)}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
                ) : (
                  <>Guardar {keep.filter(Boolean).length} en la hoja</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
