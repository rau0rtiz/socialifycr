import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, X, ExternalLink, Save } from 'lucide-react';
import { useUpdateAdVariant, type AdVariant, type VariantStatus, type AdVariantAsset } from '@/hooks/use-ad-variants';
import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  variant: AdVariant;
  framework: AdFrameworkWithDimensions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUSES: { value: VariantStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'ready', label: 'Listo' },
  { value: 'published', label: 'Publicado' },
];

export const VariantDetailSheet = ({ variant, framework, open, onOpenChange }: Props) => {
  const update = useUpdateAdVariant();
  const [hookText, setHookText] = useState(variant.hook_text ?? '');
  const [script, setScript] = useState(variant.script ?? '');
  const [copy, setCopy] = useState(variant.copy ?? '');
  const [cta, setCta] = useState(variant.cta ?? '');
  const [notes, setNotes] = useState(variant.notes ?? '');
  const [assets, setAssets] = useState<AdVariantAsset[]>(variant.assets ?? []);
  const [status, setStatus] = useState<VariantStatus>(variant.status);
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const debounceRef = useRef<number | null>(null);

  // Reset when switching variant
  useEffect(() => {
    setHookText(variant.hook_text ?? '');
    setScript(variant.script ?? '');
    setCopy(variant.copy ?? '');
    setCta(variant.cta ?? '');
    setNotes(variant.notes ?? '');
    setAssets(variant.assets ?? []);
    setStatus(variant.status);
  }, [variant.id]);

  const angle = framework.dimensions.find((d) => d.id === variant.angle_id);
  const format = framework.dimensions.find((d) => d.id === variant.format_id);
  const hook = framework.dimensions.find((d) => d.id === variant.hook_id);

  const triggerSave = (overrides: Partial<AdVariant> = {}) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      update.mutate({
        id: variant.id,
        hook_text: hookText || null,
        script: script || null,
        copy: copy || null,
        cta: cta || null,
        notes: notes || null,
        assets,
        status,
        ...overrides,
      });
    }, 600);
  };

  const handleAddAsset = () => {
    if (!newAssetUrl.trim()) return;
    const next = [...assets, { url: newAssetUrl.trim(), type: 'link' as const }];
    setAssets(next);
    setNewAssetUrl('');
    update.mutate({ id: variant.id, assets: next });
  };

  const handleRemoveAsset = (idx: number) => {
    const next = assets.filter((_, i) => i !== idx);
    setAssets(next);
    update.mutate({ id: variant.id, assets: next });
  };

  const handleStatusChange = (s: VariantStatus) => {
    setStatus(s);
    update.mutate({ id: variant.id, status: s });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Variante</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-1.5 pt-1">
            {angle && (
              <Badge variant="outline" style={angle.color ? { borderColor: angle.color, color: angle.color } : {}}>
                {angle.label}
              </Badge>
            )}
            {format && <Badge variant="outline">{format.label}</Badge>}
            {hook && <Badge variant="outline">{hook.label}</Badge>}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => handleStatusChange(v as VariantStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-hook">Hook (línea de apertura)</Label>
            <Textarea
              id="v-hook"
              value={hookText}
              onChange={(e) => { setHookText(e.target.value); triggerSave({ hook_text: e.target.value || null }); }}
              placeholder={`Escribe el hook tipo "${hook?.label ?? ''}"...`}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-script">Guion / Script</Label>
            <Textarea
              id="v-script"
              value={script}
              onChange={(e) => { setScript(e.target.value); triggerSave({ script: e.target.value || null }); }}
              rows={6}
              placeholder="Escribe el guion completo del video..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-copy">Copy del anuncio</Label>
            <Textarea
              id="v-copy"
              value={copy}
              onChange={(e) => { setCopy(e.target.value); triggerSave({ copy: e.target.value || null }); }}
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-cta">CTA</Label>
            <Input
              id="v-cta"
              value={cta}
              onChange={(e) => { setCta(e.target.value); triggerSave({ cta: e.target.value || null }); }}
              placeholder="Ej: Agenda tu llamada gratis"
            />
          </div>

          <div className="space-y-2">
            <Label>Assets / Referencias</Label>
            <div className="space-y-1.5">
              {assets.map((a, i) => (
                <Card key={i} className="p-2 flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-xs truncate flex-1 hover:underline">
                    {a.label || a.url}
                  </a>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAsset(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Card>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newAssetUrl}
                  onChange={(e) => setNewAssetUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAsset(); }}
                  placeholder="Pega una URL (Figma, Drive, imagen…)"
                  className="h-8"
                />
                <Button size="sm" onClick={handleAddAsset} disabled={!newAssetUrl.trim()} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Añadir
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-notes">Notas</Label>
            <Textarea
              id="v-notes"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); triggerSave({ notes: e.target.value || null }); }}
              rows={3}
            />
          </div>

          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 border-t">
            <Save className="h-3 w-3" /> Los cambios se guardan automáticamente
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
