import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useClientProducts, ClientProduct, ProductInput, ProductType } from '@/hooks/use-client-products';
import { useClientProductCategories } from '@/hooks/use-client-product-categories';
import { useClientProductTags } from '@/hooks/use-client-product-tags';
import { usePaymentSchemes, PaymentSchemeInput } from '@/hooks/use-payment-schemes';
import { ProductTagSelector } from './ProductTagSelector';
import { supabase } from '@/integrations/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import { Package, Camera, Loader2, X, Boxes, Wrench, Clock, Plus, Tag as TagIcon, Check, CreditCard, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editing?: ClientProduct | null;
  defaultName?: string;
  onSaved?: (product: ClientProduct) => void;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const SPEAK_UP_LINES = [
  { value: 'individual', label: 'Clase Personalizada' },
  { value: 'group', label: 'Clase Grupal' },
  { value: 'course', label: 'Curso' },
];

// ─────────── Inline Variants editor (used in Speak Up flow at create-time too) ───────────
const InlinePaymentSchemes = ({ productId, clientId, currency }: { productId: string; clientId: string; currency: string }) => {
  const { schemes, addScheme, updateScheme, deleteScheme } = usePaymentSchemes(productId, clientId);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [installments, setInstallments] = useState('1');

  const reset = () => { setAdding(false); setEditing(null); setName(''); setTotal(''); setInstallments('1'); };

  const installmentAmount = total && parseInt(installments) > 0 ? parseFloat(total) / parseInt(installments) : 0;

  const handleSave = async () => {
    if (!name.trim() || !total) { toast.error('Nombre y precio son obligatorios'); return; }
    const input: PaymentSchemeInput = {
      name: name.trim(),
      total_price: parseFloat(total),
      num_installments: parseInt(installments) || 1,
      installment_amount: Math.round(installmentAmount * 100) / 100,
      currency,
      sort_order: schemes.length,
    };
    try {
      if (editing) await updateScheme.mutateAsync({ id: editing, ...input });
      else await addScheme.mutateAsync(input);
      reset();
    } catch { toast.error('Error al guardar'); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
          <CreditCard className="h-3 w-3 text-muted-foreground" />
          Facilidades de pago
        </Label>
        {!adding && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        )}
      </div>

      {schemes.length > 0 && (
        <div className="space-y-1.5">
          {schemes.map(s => (
            <div key={s.id} className="group flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-border/40 text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground ml-1.5">{formatCurrency(s.total_price, s.currency)}</span>
                {s.num_installments > 1 && (
                  <span className="text-muted-foreground ml-1.5">· {s.num_installments}× {formatCurrency(s.installment_amount, s.currency)}</span>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => { setEditing(s.id); setName(s.name); setTotal(String(s.total_price)); setInstallments(String(s.num_installments)); setAdding(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={async () => { try { await deleteScheme.mutateAsync(s.id); } catch { toast.error('Error'); } }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-md border border-border/50 p-2 space-y-2 bg-muted/20">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Plan completo, 2 cuotas" className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="Precio total" className="h-8 text-xs" />
            <Input type="number" min={1} value={installments} onChange={e => setInstallments(e.target.value)} placeholder="Cuotas" className="h-8 text-xs" />
          </div>
          {parseInt(installments) > 1 && installmentAmount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Cuota: <span className="font-semibold text-foreground">{formatCurrency(Math.round(installmentAmount * 100) / 100, currency)}</span> × {installments}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={reset}>Cancelar</Button>
            <Button type="button" size="sm" className="h-7 text-[10px]" onClick={handleSave}>{editing ? 'Actualizar' : 'Agregar'}</Button>
          </div>
        </div>
      )}

      {schemes.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground py-2">Sin facilidades de pago todavía. Agregá variantes con diferentes esquemas.</p>
      )}
    </div>
  );
};

export const ProductFormDialog = ({
  open,
  onOpenChange,
  clientId,
  editing = null,
  defaultName = '',
  onSaved,
}: ProductFormDialogProps) => {
  const { addProduct, updateProduct } = useClientProducts(clientId);
  const { categories, addCategory } = useClientProductCategories(clientId);
  const { getTagsForProduct, setProductTags } = useClientProductTags(clientId);
  const { selectedClient } = useBrand();
  const isTissue = !!selectedClient?.name?.toLowerCase().includes('tissue');
  const isSpeakUp = !!selectedClient?.name?.toLowerCase().includes('speak up');
  const hideDuration = isTissue || isSpeakUp;

  const [name, setName] = useState('');
  const [productType, setProductType] = useState<ProductType>('product');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [taxRate, setTaxRate] = useState<string>('2');
  const [productLine, setProductLine] = useState<string>('individual');
  const [currency, setCurrency] = useState('CRC');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [trackStock, setTrackStock] = useState(false);
  const [stockQty, setStockQty] = useState('');
  const [lowThreshold, setLowThreshold] = useState('');
  const [stockUnit, setStockUnit] = useState('');
  const [category, setCategory] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('hsl(220, 70%, 50%)');
  const [savingCat, setSavingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setProductType(isTissue ? 'product' : isSpeakUp ? 'service' : (editing.product_type || 'product'));
      setDuration(editing.estimated_duration_min != null ? String(editing.estimated_duration_min) : '');
      setPrice(editing.price != null ? String(editing.price) : '');
      setCost(editing.cost != null ? String(editing.cost) : '');
      setTaxRate(editing.tax_rate != null ? String(editing.tax_rate) : (isSpeakUp ? '2' : '0'));
      setProductLine(editing.category || (isSpeakUp ? 'individual' : ''));
      setCurrency(editing.currency || 'CRC');
      setDescription(editing.description || '');
      setPhotoUrl(editing.photo_url || null);
      setTrackStock(!!editing.track_stock);
      setStockQty(editing.stock_quantity != null ? String(editing.stock_quantity) : '');
      setLowThreshold(editing.low_stock_threshold != null ? String(editing.low_stock_threshold) : '');
      setStockUnit(editing.stock_unit || '');
      setCategory(editing.category || '');
      setSelectedTagIds(getTagsForProduct(editing.id));
    } else {
      setName(defaultName);
      setProductType(isSpeakUp ? 'service' : 'product');
      setDuration('');
      setPrice('');
      setCost('');
      setTaxRate(isSpeakUp ? '2' : '0');
      setProductLine(isSpeakUp ? 'individual' : '');
      setCurrency('CRC');
      setDescription('');
      setPhotoUrl(null);
      setTrackStock(false);
      setStockQty('');
      setLowThreshold('');
      setStockUnit('');
      setCategory('');
      setSelectedTagIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultName]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/products/product-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('content-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path);
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Foto subida');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    const isService = productType === 'service' || isSpeakUp;
    const input: ProductInput = {
      name: name.trim(),
      product_type: isSpeakUp ? 'service' : productType,
      estimated_duration_min: duration ? parseInt(duration) : null,
      price: price ? parseFloat(price) : null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      description: description.trim(),
      photo_url: photoUrl,
      category: isSpeakUp ? productLine : (category.trim() || null),
      tax_rate: taxRate ? parseFloat(taxRate) : 0,
      tax_applicable: !!taxRate && parseFloat(taxRate) > 0,
      track_stock: isService ? false : trackStock,
      stock_quantity: !isService && trackStock && stockQty ? parseFloat(stockQty) : 0,
      low_stock_threshold: !isService && trackStock && lowThreshold ? parseFloat(lowThreshold) : 0,
      stock_unit: !isService && trackStock ? (stockUnit.trim() || null) : null,
    };
    try {
      let savedId: string;
      let saved: ClientProduct;
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...input });
        savedId = editing.id;
        saved = { ...editing, ...input } as ClientProduct;
        toast.success(isSpeakUp ? 'Servicio actualizado' : isService ? 'Servicio actualizado' : 'Producto actualizado');
      } else {
        saved = await addProduct.mutateAsync(input);
        savedId = saved.id;
        toast.success(isSpeakUp ? 'Servicio creado' : isService ? 'Servicio creado' : 'Producto creado');
      }
      // Persist tags (skip for Speak Up since we don't show them)
      if (!isSpeakUp) {
        try {
          await setProductTags.mutateAsync({ productId: savedId, tagIds: selectedTagIds });
        } catch (e) {
          console.warn('Error guardando etiquetas', e);
        }
      }
      onSaved?.(saved);
      // For Speak Up, keep the dialog open if creating so user can add payment schemes inline
      if (isSpeakUp && !editing) {
        // Convert to "edit mode" by passing the saved product
        // The simplest: close and rely on parent to reopen detail
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    } catch {
      toast.error('Error al guardar');
    }
  };

  const isPending = addProduct.isPending || updateProduct.isPending;
  const isService = productType === 'service' || isSpeakUp;

  // ════════════════════════════════════════════════════
  // SPEAK UP — Simple form
  // ════════════════════════════════════════════════════
  if (isSpeakUp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nombre del servicio <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Inglés Conversacional A2" className="mt-1.5" autoFocus />
            </div>

            <div>
              <Label className="text-xs">Línea de producto <span className="text-destructive">*</span></Label>
              <Select value={productLine} onValueChange={setProductLine}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEAK_UP_LINES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-xs">Costo base</Label>
                <Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" className="mt-1.5" />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Impuesto (%)</Label>
                <Input type="number" min={0} step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="2" className="mt-1.5" />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡ CRC</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editing && (
              <>
                <Separator />
                <InlinePaymentSchemes productId={editing.id} clientId={clientId} currency={currency} />
              </>
            )}

            {!editing && (
              <p className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                Después de guardar, podrás agregar facilidades de pago (variantes con esquemas de cuotas).
              </p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending || uploading} size="sm">
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ════════════════════════════════════════════════════
  // Default form (other clients)
  // ════════════════════════════════════════════════════
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className={cn('p-1.5 rounded-lg', isService ? 'bg-purple-500/10' : 'bg-blue-500/10')}>
              {isService ? <Wrench className="h-4 w-4 text-purple-500" /> : <Package className="h-4 w-4 text-blue-500" />}
            </div>
            {editing ? `Editar ${isService ? 'Servicio' : 'Producto'}` : `Nuevo ${isService ? 'Servicio' : 'Producto'}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!isTissue && (
          <div>
            <Label className="text-xs">Tipo <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProductType('product')}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all',
                  productType === 'product'
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-border/50 hover:border-border bg-background'
                )}
              >
                <div className="flex items-center gap-2">
                  <Package className={cn('h-4 w-4', productType === 'product' ? 'text-blue-500' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-semibold', productType === 'product' ? 'text-foreground' : 'text-muted-foreground')}>
                    Producto
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Físico, con inventario</p>
              </button>
              <button
                type="button"
                onClick={() => setProductType('service')}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all',
                  productType === 'service'
                    ? 'border-purple-500 bg-purple-500/5'
                    : 'border-border/50 hover:border-border bg-background'
                )}
              >
                <div className="flex items-center gap-2">
                  <Wrench className={cn('h-4 w-4', productType === 'service' ? 'text-purple-500' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-semibold', productType === 'service' ? 'text-foreground' : 'text-muted-foreground')}>
                    Servicio
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Sin inventario</p>
              </button>
            </div>
          </div>
          )}

          <div>
            <Label className="text-xs">Foto</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {photoUrl ? (
                <div className="relative">
                  <img src={photoUrl} alt="Producto" className="w-20 h-20 rounded-lg object-cover border border-border/50" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => setPhotoUrl(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground mt-1">Subir</span>
                    </>
                  )}
                </div>
              )}
              {photoUrl && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                  Cambiar
                </Button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isService ? 'Ej: Consulta general, Limpieza facial' : 'Ej: Toxina botulínica 100u'}
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción..."
              className="mt-1.5 min-h-[70px] text-sm"
            />
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              Categoría
            </Label>
            <div className="mt-1.5 space-y-2">
              {categories.length > 0 && (
                <Select value={category || '__none__'} onValueChange={(v) => setCategory(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {showNewCat ? (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Nombre de la categoría"
                      className="h-8 text-xs flex-1"
                    />
                    <input
                      type="color"
                      value={(() => {
                        const m = newCatColor.match(/^#([0-9a-f]{6})$/i);
                        return m ? newCatColor : '#3b82f6';
                      })()}
                      onChange={e => setNewCatColor(e.target.value)}
                      className="h-8 w-10 rounded border border-border/50 cursor-pointer bg-transparent p-0"
                      aria-label="Color"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]"
                      onClick={() => { setShowNewCat(false); setNewCatName(''); }}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" className="h-7 text-[11px] gap-1"
                      disabled={!newCatName.trim() || savingCat}
                      onClick={async () => {
                        if (!newCatName.trim()) return;
                        setSavingCat(true);
                        try {
                          const created = await addCategory.mutateAsync({
                            name: newCatName.trim(),
                            color: newCatColor,
                            sort_order: categories.length,
                          });
                          setCategory(created.name);
                          setShowNewCat(false);
                          setNewCatName('');
                          toast.success('Categoría creada');
                        } catch (err: any) {
                          toast.error(err?.message || 'Error al crear categoría');
                        } finally {
                          setSavingCat(false);
                        }
                      }}
                    >
                      <Check className="h-3 w-3" /> Crear
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowNewCat(true)}>
                  <Plus className="h-3 w-3" /> Nueva categoría
                </Button>
              )}
            </div>
          </div>

          <ProductTagSelector
            clientId={clientId}
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Precio venta</Label>
              <Input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Costo</Label>
              <Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">₡ CRC</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {price && cost && parseFloat(cost) > 0 && parseFloat(price) > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
              Margen: <span className="font-semibold text-foreground">
                {Math.round(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100)}%
              </span>
              {' '}· Profit: <span className="font-semibold text-emerald-600">
                {formatCurrency(parseFloat(price) - parseFloat(cost), currency)}
              </span>
            </div>
          )}

          {!hideDuration && (
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Duración aproximada (minutos)
            </Label>
            <Input
              type="number"
              min={0}
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder={isService ? '30' : '15'}
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {isService
                ? 'Tiempo que toma realizar el servicio. Útil para planificar agenda.'
                : 'Tiempo aproximado de uso/aplicación. Opcional para productos.'}
            </p>
          </div>
          )}

          <Separator />

          {isService ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center">
              <Wrench className="h-5 w-5 text-purple-500/60 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">
                Los servicios no llevan inventario.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs font-medium cursor-pointer" onClick={() => setTrackStock(v => !v)}>
                    Llevar control de inventario
                  </Label>
                </div>
                <Switch checked={trackStock} onCheckedChange={setTrackStock} />
              </div>
              {trackStock && (
                <div className="grid grid-cols-3 gap-3 pl-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Stock actual</Label>
                    <Input type="number" min={0} step="any" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Alerta mínima</Label>
                    <Input type="number" min={0} step="any" value={lowThreshold} onChange={e => setLowThreshold(e.target.value)} placeholder="0" className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Unidad</Label>
                    <Input value={stockUnit} onChange={e => setStockUnit(e.target.value)} placeholder="vial, caja, ud" className="mt-1 h-9 text-sm" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || uploading} size="sm">
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
