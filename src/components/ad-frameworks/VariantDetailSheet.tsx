import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, X, ExternalLink, Save, Image as ImageIcon, Film, GalleryHorizontal, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useUpdateAdVariant, type AdVariant, type VariantStatus, type AdVariantAsset, type CreativeType, type CarouselSlide } from '@/hooks/use-ad-variants';
import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { VariantReferences } from './VariantReferences';

interface Props {
  variant: AdVariant;
  framework: AdFrameworkWithDimensions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUSES: { value: VariantStatus; label: string }[] = [
  { value: 'draft', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'ready', label: 'Listo para subir' },
  { value: 'published', label: 'Subido / Publicado' },
];

const CREATIVE_TYPES: { value: CreativeType; label: string; icon: typeof ImageIcon; hint: string }[] = [
  { value: 'photo', label: 'Foto / Estático', icon: ImageIcon, hint: 'Una sola imagen + copy' },
  { value: 'reel', label: 'Reel / Video', icon: Film, hint: 'Hook visual + guion + caption' },
  { value: 'carousel', label: 'Carrusel', icon: GalleryHorizontal, hint: 'Varios slides con título y texto' },
];

export const VariantDetailSheet = ({ variant, framework, open, onOpenChange }: Props) => {
  const update = useUpdateAdVariant();
  const [creativeType, setCreativeType] = useState<CreativeType | null>(variant.creative_type);
  const [hookText, setHookText] = useState(variant.hook_text ?? '');
  const [script, setScript] = useState(variant.script ?? '');
  const [copy, setCopy] = useState(variant.copy ?? '');
  const [cta, setCta] = useState(variant.cta ?? '');
  const [notes, setNotes] = useState(variant.notes ?? '');
  const [assets, setAssets] = useState<AdVariantAsset[]>(variant.assets ?? []);
  const [slides, setSlides] = useState<CarouselSlide[]>(variant.slides ?? []);
  const [status, setStatus] = useState<VariantStatus>(variant.status);
  const [dueDate, setDueDate] = useState<string>(variant.due_date ?? '');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setCreativeType(variant.creative_type);
    setHookText(variant.hook_text ?? '');
    setScript(variant.script ?? '');
    setCopy(variant.copy ?? '');
    setCta(variant.cta ?? '');
    setNotes(variant.notes ?? '');
    setAssets(variant.assets ?? []);
    setSlides(variant.slides ?? []);
    setStatus(variant.status);
    setDueDate(variant.due_date ?? '');
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
        slides,
        creative_type: creativeType,
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

  const handleCreativeTypeChange = (t: CreativeType) => {
    setCreativeType(t);
    update.mutate({ id: variant.id, creative_type: t });
  };

  // Slides handlers
  const updateSlide = (idx: number, patch: Partial<CarouselSlide>) => {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setSlides(next);
    triggerSave({ slides: next });
  };
  const addSlide = () => {
    const next = [...slides, { title: '', text: '' }];
    setSlides(next);
    update.mutate({ id: variant.id, slides: next });
  };
  const removeSlide = (idx: number) => {
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    update.mutate({ id: variant.id, slides: next });
  };
  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSlides(next);
    update.mutate({ id: variant.id, slides: next });
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
          {/* Tipo de creativo */}
          <div className="space-y-2">
            <Label>Tipo de creativo</Label>
            <div className="grid grid-cols-3 gap-2">
              {CREATIVE_TYPES.map(({ value, label, icon: Icon, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleCreativeTypeChange(value)}
                  className={cn(
                    'border rounded-md p-2.5 text-left transition-all hover:border-primary/50',
                    creativeType === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                  )}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Estado + Fecha de entrega — flujo de tarea */}
          <Card className="p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado de la tarea</Label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as VariantStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de entrega</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    update.mutate({ id: variant.id, due_date: e.target.value || null } as any);
                  }}
                />
              </div>
            </div>
          </Card>

          {!creativeType && (
            <Card className="p-4 text-center text-xs text-muted-foreground bg-muted/40 border-dashed">
              Selecciona un tipo de creativo arriba para empezar a editar.
            </Card>
          )}

          {/* === FOTO / ESTÁTICO === */}
          {creativeType === 'photo' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="v-hook">Texto sobre la imagen (hook visual)</Label>
                <Textarea
                  id="v-hook"
                  value={hookText}
                  onChange={(e) => { setHookText(e.target.value); triggerSave({ hook_text: e.target.value || null }); }}
                  placeholder={`Texto principal del estático tipo "${hook?.label ?? ''}"...`}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-copy">Copy del anuncio</Label>
                <Textarea
                  id="v-copy"
                  value={copy}
                  onChange={(e) => { setCopy(e.target.value); triggerSave({ copy: e.target.value || null }); }}
                  rows={4}
                  placeholder="Texto que acompaña al estático en el feed..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-cta">CTA</Label>
                <Input
                  id="v-cta"
                  value={cta}
                  onChange={(e) => { setCta(e.target.value); triggerSave({ cta: e.target.value || null }); }}
                  placeholder="Ej: Más información"
                />
              </div>
            </>
          )}

          {/* === REEL === */}
          {creativeType === 'reel' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="v-hook">Hook (3 primeros segundos)</Label>
                <Textarea
                  id="v-hook"
                  value={hookText}
                  onChange={(e) => { setHookText(e.target.value); triggerSave({ hook_text: e.target.value || null }); }}
                  placeholder={`Línea de apertura tipo "${hook?.label ?? ''}"...`}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-script">Guion completo (escenas / shots)</Label>
                <Textarea
                  id="v-script"
                  value={script}
                  onChange={(e) => { setScript(e.target.value); triggerSave({ script: e.target.value || null }); }}
                  rows={8}
                  placeholder={`Escena 1 (0-3s): Hook visual...\nEscena 2 (3-10s): Desarrollo...\nEscena 3 (10-25s): Beneficio...\nEscena 4 (25-30s): CTA hablado`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-copy">Caption del Reel</Label>
                <Textarea
                  id="v-copy"
                  value={copy}
                  onChange={(e) => { setCopy(e.target.value); triggerSave({ copy: e.target.value || null }); }}
                  rows={3}
                  placeholder="Texto debajo del Reel + hashtags..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-cta">CTA del botón</Label>
                <Input
                  id="v-cta"
                  value={cta}
                  onChange={(e) => { setCta(e.target.value); triggerSave({ cta: e.target.value || null }); }}
                  placeholder="Ej: Reservar ahora"
                />
              </div>
            </>
          )}

          {/* === CARRUSEL === */}
          {creativeType === 'carousel' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="v-hook">Hook del primer slide</Label>
                <Textarea
                  id="v-hook"
                  value={hookText}
                  onChange={(e) => { setHookText(e.target.value); triggerSave({ hook_text: e.target.value || null }); }}
                  placeholder="El gancho del slide 1 (es lo que decide si hacen swipe)..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Slides ({slides.length})</Label>
                  <Button size="sm" variant="outline" onClick={addSlide} className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" /> Añadir slide
                  </Button>
                </div>
                {slides.length === 0 && (
                  <Card className="p-3 text-center text-xs text-muted-foreground border-dashed">
                    Aún no hay slides. Agrega el primero.
                  </Card>
                )}
                {slides.map((slide, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" /> Slide {i + 1}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlide(i, -1)} disabled={i === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSlide(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={slide.title ?? ''}
                      onChange={(e) => updateSlide(i, { title: e.target.value })}
                      placeholder="Título del slide"
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={slide.text ?? ''}
                      onChange={(e) => updateSlide(i, { text: e.target.value })}
                      placeholder="Texto / descripción del slide"
                      rows={2}
                      className="text-sm"
                    />
                  </Card>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-copy">Caption del carrusel</Label>
                <Textarea
                  id="v-copy"
                  value={copy}
                  onChange={(e) => { setCopy(e.target.value); triggerSave({ copy: e.target.value || null }); }}
                  rows={3}
                  placeholder="Texto general que acompaña al carrusel..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-cta">CTA</Label>
                <Input
                  id="v-cta"
                  value={cta}
                  onChange={(e) => { setCta(e.target.value); triggerSave({ cta: e.target.value || null }); }}
                  placeholder="Ej: Más información"
                />
              </div>
            </>
          )}

          {/* Assets / referencias siempre disponibles */}
          {creativeType && (
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
          )}

          {creativeType && (
            <VariantReferences variantId={variant.id} />
          )}

          {creativeType && (
            <div className="space-y-1.5">
              <Label htmlFor="v-notes">Notas internas</Label>
              <Textarea
                id="v-notes"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); triggerSave({ notes: e.target.value || null }); }}
                rows={3}
              />
            </div>
          )}

          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 border-t">
            <Save className="h-3 w-3" /> Los cambios se guardan automáticamente
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
