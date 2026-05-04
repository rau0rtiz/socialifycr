import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhotoCapture } from '@/components/common/PhotoCapture';
import { useProductBrands, useProductCategoriesCatalog } from '@/hooks/use-product-catalogs';
import { useClientProducts, ClientProduct } from '@/hooks/use-client-products';
import { VariantEditor } from './VariantEditor';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editing?: ClientProduct | null;
  onSaved?: (product: ClientProduct) => void;
}

export const TissueProductDialog = ({ open, onOpenChange, clientId, editing, onSaved }: Props) => {
  const { items: brands, add: addBrand } = useProductBrands(clientId);
  const { items: categories, add: addCategory } = useProductCategoriesCatalog(clientId);
  const { addProduct, updateProduct } = useClientProducts(clientId);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline new brand / category
  const [newBrand, setNewBrand] = useState('');
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setBrand((editing as any).brand || '');
      setCategory(editing.category || '');
      setPrice(editing.price != null ? String(editing.price) : '');
      setDescription(editing.description || '');
      setPhotoUrl(editing.photo_url || null);
      setProductId(editing.id);
    } else {
      setName(''); setBrand(''); setCategory(''); setPrice(''); setDescription(''); setPhotoUrl(null); setProductId(null);
    }
  }, [open, editing]);

  const handleSaveBase = async () => {
    if (!name.trim()) { toast.error('Falta nombre'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        brand: brand || null,
        category: category || null,
        price: price ? Number(price) : null,
        description: description || null,
        photo_url: photoUrl,
        currency: 'CRC',
        track_stock: true,
      };
      let saved: any;
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, ...payload });
        // direct update for `brand` since hook may not handle it
        await supabase.from('client_products').update({ brand: payload.brand }).eq('id', productId);
      } else {
        saved = await addProduct.mutateAsync(payload);
        if (saved?.id) {
          await supabase.from('client_products').update({ brand: payload.brand }).eq('id', saved.id);
          setProductId(saved.id);
        }
      }
      onSaved?.(saved);
      toast.success(productId ? 'Producto actualizado' : 'Producto creado');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInlineBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      await addBrand.mutateAsync({ name: newBrand.trim() });
      setBrand(newBrand.trim());
      setNewBrand('');
    } catch (e: any) { toast.error(e.message || 'No se pudo'); }
  };
  const handleAddInlineCat = async () => {
    if (!newCat.trim()) return;
    try {
      await addCategory.mutateAsync({ name: newCat.trim() });
      setCategory(newCat.trim());
      setNewCat('');
    } catch (e: any) { toast.error(e.message || 'No se pudo'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        {/* Step 1: base info */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <PhotoCapture
              value={photoUrl}
              onChange={setPhotoUrl}
              folder={`tissue/products/${productId || 'new'}`}
              size="lg"
            />
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camisa oversize" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Precio base (CRC)</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="h-9" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Marca</Label>
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
                <option value="">— Sin marca —</option>
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <div className="flex gap-1">
                <Input placeholder="+ Nueva marca" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInlineBrand(); } }} />
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddInlineBrand}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de prenda</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
                <option value="">— Sin categoría —</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="flex gap-1">
                <Input placeholder="+ Nuevo tipo" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInlineCat(); } }} />
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddInlineCat}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Descripción (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {!productId && (
            <Button onClick={handleSaveBase} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Guardar y agregar variantes
            </Button>
          )}

          {productId && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Variantes (talla / color)</h3>
                <p className="text-xs text-muted-foreground mb-3">Si no agregas variantes, el producto se vende como pieza única con el precio base.</p>
                <VariantEditor clientId={clientId} productId={productId} defaultPrice={price ? Number(price) : null} />
              </div>
              <Button onClick={handleSaveBase} variant="outline" disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Guardar cambios de producto
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
