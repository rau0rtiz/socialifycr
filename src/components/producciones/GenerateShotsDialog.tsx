import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const MIN_PROMPT = 120;

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
  sheetId: string;
  existingCount: number;
  onInsert: (shots: GeneratedShot[], replace: boolean) => Promise<void>;
}

export function GenerateShotsDialog({ open, onOpenChange, sheetId, existingCount, onInsert }: Props) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'claude-opus-4-20250514' | 'claude-sonnet-4-20250514'>('claude-opus-4-20250514');
  const [count, setCount] = useState(8);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedShot[] | null>(null);
  const [keep, setKeep] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPrompt(''); setResult(null); setKeep([]); setLoading(false); setSaving(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < MIN_PROMPT) {
      toast.error(`El prompt necesita al menos ${MIN_PROMPT} caracteres para dar buen contexto a Claude.`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-production-shots', {
        body: { sheet_id: sheetId, prompt: prompt.trim(), model, shot_count: count },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const shots = (data as any)?.shots as GeneratedShot[];
      if (!Array.isArray(shots) || shots.length === 0) throw new Error('Claude no devolvió piezas.');
      setResult(shots);
      setKeep(shots.map(() => true));
      toast.success(`Claude generó ${shots.length} pieza${shots.length !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'No se pudo generar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const selected = result.filter((_, i) => keep[i]);
    if (selected.length === 0) {
      toast.error('Marcá al menos una pieza.');
      return;
    }
    setSaving(true);
    try {
      await onInsert(selected, replace);
      toast.success(`${selected.length} pieza${selected.length !== 1 ? 's' : ''} agregada${selected.length !== 1 ? 's' : ''} a la hoja.`);
      handleClose(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'No se pudieron guardar las piezas.');
    } finally {
      setSaving(false);
    }
  };

  const promptLen = prompt.trim().length;
  const canGenerate = promptLen >= MIN_PROMPT && !loading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generar piezas con Claude
          </DialogTitle>
          <DialogDescription>
            Escribí un brief denso. Cuanto más contexto, mejor las ideas. Claude Opus va a poblar la lista de piezas a grabar.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt">Brief del contenido</Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                placeholder={`Ejemplo: Estamos grabando contenido para una marca de joyería minimalista dirigida a mujeres 25-40 en Costa Rica. Tono: elegante, cálido, cercano. Necesito mezcla de reels educativos (cómo cuidar la pieza, materiales), reels emocionales (regalá, ocasiones especiales), y stories de detrás de cámaras. La locación es un estudio con luz natural. Tenemos modelo, props minimalistas y 4 piezas nuevas a destacar. Evitar clichés. Cada reel < 20s.`}
                className="resize-none font-mono text-sm"
              />
              <div className="flex justify-between text-xs">
                <span className={promptLen < MIN_PROMPT ? 'text-destructive' : 'text-muted-foreground'}>
                  {promptLen} / {MIN_PROMPT} caracteres mínimos
                </span>
                <span className="text-muted-foreground">Más contexto = mejores ideas</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={model} onValueChange={(v) => setModel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-opus-4-20250514">Claude Opus 4 (mejor)</SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (más barato)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-count">Cantidad de piezas</Label>
                <Input
                  id="ai-count"
                  type="number"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.max(3, Math.min(20, parseInt(e.target.value || '8', 10))))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Reemplazar existentes</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={replace} onCheckedChange={setReplace} disabled={existingCount === 0} />
                  <span className="text-xs text-muted-foreground">
                    {replace ? 'Borrará las actuales' : `Agrega al final (${existingCount} ya)`}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Claude está pensando…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generar {count} piezas</>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Revisá las piezas. Desmarcá las que no querés guardar.
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
