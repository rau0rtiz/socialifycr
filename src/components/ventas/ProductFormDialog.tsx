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
import { ProductTagSelector } from './ProductTagSelector';
import { supabase } from '@/integrations/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import { Package, Camera, Loader2, X, Boxes, Wrench, Clock, Plus, Tag as TagIcon, Check } from 'lucide-react';
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

  const [name, setName] = useState('');
  const [productType, setProductType] = useState<ProductType>('product');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setProductType(editing.product_type || 'product');
      setDuration(editing.estimated_duration_min != null ? String(editing.estimated_duration_min) : '');
      setPrice(editing.price != null ? String(editing.price) : '');
      setCost(editing.cost != null ? String(editing.cost) : '');
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
      setProductType('product');
      setDuration('');
      setPrice('');
      setCost('');
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
    const isService = productType === 'service';
    const input: ProductInput = {
      name: name.trim(),
      product_type: productType,
      estimated_duration_min: duration ? parseInt(duration) : null,
      price: price ? parseFloat(price) : null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      description: description.trim(),
      photo_url: photoUrl,
      category: category.trim() || null,
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
        toast.success(isService ? 'Servicio actualizado' : 'Producto actualizado');
      } else {
        saved = await addProduct.mutateAsync(input);
        savedId = saved.id;
        toast.success(isService ? 'Servicio creado' : 'Producto creado');
      }
      // Persist tags
      try {
        await setProductTags.mutateAsync({ productId: savedId, tagIds: selectedTagIds });
      } catch (e) {
        console.warn('Error guardando etiquetas', e);
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const isPending = addProduct.isPending || updateProduct.isPending;
  const isService = productType === 'service';

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
          {/* Type selector */}
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

          {/* Photo upload */}
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

          {/* Category */}
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              Categoría
            </Label>
            {categories.length > 0 ? (
              <Select value={category || '__none__'} onValueChange={(v) => setCategory(v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
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
            ) : (
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Sin categorías creadas" className="mt-1.5" />
            )}
          </div>

          {/* Tags */}
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

          {/* Duration */}
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

          <Separator />

          {/* Stock tracking — only for products */}
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
