import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PhotoCapture } from '@/components/common/PhotoCapture';
import { useProductBrands, useProductCategoriesCatalog } from '@/hooks/use-product-catalogs';
import { useClientProducts, ClientProduct } from '@/hooks/use-client-products';
import { useProductSizes, useProductColors } from '@/hooks/use-product-catalogs';
import { useProductVariants } from '@/hooks/use-product-variants';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editing?: ClientProduct | null;
  defaultName?: string;
  onSaved?: (product: ClientProduct) => void;
}

interface DraftVariant {
  /** Local key */
  key: string;
  /** Real DB id when editing */
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  photo_url: string | null;
}

const newKey = () => `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const TissueProductDialog = ({ open, onOpenChange, clientId, editing, defaultName, onSaved }: Props) => {
  const { items: brands, add: addBrand } = useProductBrands(clientId);
  const { items: categories, add: addCategory } = useProductCategoriesCatalog(clientId);
  const { items: sizes, add: addSize } = useProductSizes(clientId);
  const { items: colors, add: addColor } = useProductColors(clientId);
  const { addProduct, updateProduct } = useClientProducts(clientId);
  const { variants: existingVariants, upsert, remove } = useProductVariants(clientId, editing?.id ?? null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftVariant[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [newBrand, setNewBrand] = useState('');
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (!open) return;
    setRemovedIds([]);
    if (editing) {
      setName(editing.name);
      setBrand((editing as any).brand || '');
      setCategory(editing.category || '');
      setPrice(editing.price != null ? String(editing.price) : '');
      setDescription(editing.description || '');
      setPhotoUrl(editing.photo_url || null);
    } else {
      setName(defaultName || '');
      setBrand(''); setCategory(''); setPrice(''); setDescription(''); setPhotoUrl(null);
      setDrafts([]);
    }
  }, [open, editing, defaultName]);

  // Hydrate drafts from existing variants when editing
  useEffect(() => {
    if (!open || !editing) return;
    setDrafts(
      existingVariants.map(v => ({
        key: v.id,
        id: v.id,
        size: v.size || '',
        color: v.color || '',
        price: v.price != null ? String(v.price) : '',
        stock: String(v.stock_quantity ?? 0),
        photo_url: v.photo_url,
      }))
    );
  }, [open, editing, existingVariants]);

  const updateDraft = (key: string, patch: Partial<DraftVariant>) =>
    setDrafts(d => d.map(x => (x.key === key ? { ...x, ...patch } : x)));

  const removeDraft = (key: string) => {
    const d = drafts.find(x => x.key === key);
    if (d?.id) setRemovedIds(prev => [...prev, d.id!]);
    setDrafts(prev => prev.filter(x => x.key !== key));
  };

  const addDraft = (preset?: Partial<DraftVariant>) => {
    setDrafts(prev => [
      ...prev,
      { key: newKey(), size: '', color: '', price: '', stock: '0', photo_url: null, ...preset },
    ]);
  };

  const generateSizes = () => {
    const existing = new Set(drafts.map(d => d.size));
    const toAdd = COMMON_SIZES.filter(s => !existing.has(s));
    setDrafts(prev => [
      ...prev,
      ...toAdd.map(s => ({ key: newKey(), size: s, color: '', price: '', stock: '0', photo_url: null })),
    ]);
  };

  const handleAddInlineBrand = async () => {
    if (!newBrand.trim()) return;
    try { await addBrand.mutateAsync({ name: newBrand.trim() }); setBrand(newBrand.trim()); setNewBrand(''); }
    catch (e: any) { toast.error(e.message || 'No se pudo'); }
  };
  const handleAddInlineCat = async () => {
    if (!newCat.trim()) return;
    try { await addCategory.mutateAsync({ name: newCat.trim() }); setCategory(newCat.trim()); setNewCat(''); }
    catch (e: any) { toast.error(e.message || 'No se pudo'); }
  };

  const ensureCatalog = async (kind: 'size' | 'color', value: string) => {
    if (!value) return;
    const list = kind === 'size' ? sizes : colors;
    if (list.some(x => x.name.toLowerCase() === value.toLowerCase())) return;
    try {
      if (kind === 'size') await addSize.mutateAsync({ name: value });
      else await addColor.mutateAsync({ name: value });
    } catch { /* ignore duplicates */ }
  };

  const handleSave = async () => {
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

      let productId = editing?.id;
      let saved: any = editing;
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, ...payload });
        await supabase.from('client_products').update({ brand: payload.brand }).eq('id', productId);
      } else {
        saved = await addProduct.mutateAsync(payload);
        productId = saved?.id;
        if (productId) await supabase.from('client_products').update({ brand: payload.brand }).eq('id', productId);
      }

      if (!productId) throw new Error('No se pudo crear el producto');

      // Delete removed
      for (const id of removedIds) {
        await remove.mutateAsync(id).catch(() => null);
      }

      // Upsert drafts
      const valid = drafts.filter(d => d.size || d.color);
      for (const d of valid) {
        await ensureCatalog('size', d.size);
        await ensureCatalog('color', d.color);
        await upsert.mutateAsync({
          id: d.id,
          client_id: clientId,
          product_id: productId,
          size: d.size || null,
          color: d.color || null,
          price: d.price ? Number(d.price) : (price ? Number(price) : null),
          photo_url: d.photo_url,
          stock_quantity: d.stock ? Number(d.stock) : 0,
        });
      }

      onSaved?.(saved);
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const variantCount = drafts.filter(d => d.size || d.color).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-lg w-full sm:rounded-xl rounded-none border-0 sm:border h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Sticky header */}
        <DialogHeader className="px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <DialogTitle className="text-base">{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Foto + info base */}
          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <PhotoCapture
                value={photoUrl}
                onChange={setPhotoUrl}
                folder={`tissue/products/${editing?.id || 'new'}`}
                size="lg"
              />
              <div className="flex-1 space-y-2 min-w-0">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Camisa oversize" className="h-11" />
                </div>
                <div>
                  <Label className="text-xs">Precio base (CRC)</Label>
                  <Input value={price} onChange={e => setPrice(e.target.value)} type="number" inputMode="decimal" className="h-11" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <select value={brand} onChange={e => setBrand(e.target.value)} className="w-full h-11 rounded-md border border-input bg-background text-sm px-2">
                  <option value="">— Sin marca —</option>
                  {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <div className="flex gap-1">
                  <Input placeholder="+ Nueva marca" value={newBrand} onChange={e => setNewBrand(e.target.value)} className="h-9 text-xs" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInlineBrand(); } }} />
                  <Button type="button" size="sm" variant="ghost" className="h-9 px-2" onClick={handleAddInlineBrand}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de prenda</Label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-11 rounded-md border border-input bg-background text-sm px-2">
                  <option value="">— Sin categoría —</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="flex gap-1">
                  <Input placeholder="+ Nuevo tipo" value={newCat} onChange={e => setNewCat(e.target.value)} className="h-9 text-xs" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInlineCat(); } }} />
                  <Button type="button" size="sm" variant="ghost" className="h-9 px-2" onClick={handleAddInlineCat}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </section>

          {/* Variantes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Variantes</h3>
                <p className="text-[11px] text-muted-foreground">Cada talla / color con su foto y stock. Si no agregas, se vende como pieza única.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{variantCount}</Badge>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={generateSizes}>
                + Tallas XS–XXL
              </Button>
              {colors.slice(0, 4).map(c => (
                <Button key={c.id} type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => addDraft({ color: c.name })}>
                  + {c.name}
                </Button>
              ))}
            </div>

            {drafts.length === 0 ? (
              <div className="text-xs text-muted-foreground italic text-center py-3 border border-dashed rounded-lg">
                Sin variantes
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map(d => (
                  <DraftRow
                    key={d.key}
                    d={d}
                    sizes={sizes.map(s => s.name)}
                    colors={colors.map(c => c.name)}
                    onChange={patch => updateDraft(d.key, patch)}
                    onRemove={() => removeDraft(d.key)}
                  />
                ))}
              </div>
            )}

            <Button type="button" variant="outline" className="w-full h-11" onClick={() => addDraft()}>
              <Plus className="h-4 w-4 mr-1.5" /> Agregar variante
            </Button>
          </section>
        </div>

        {/* Sticky footer */}
        <div className="px-4 py-3 border-t bg-background/95 backdrop-blur flex gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="h-12 flex-1 text-base">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DraftRow = ({
  d, sizes, colors, onChange, onRemove,
}: {
  d: DraftVariant;
  sizes: string[];
  colors: string[];
  onChange: (patch: Partial<DraftVariant>) => void;
  onRemove: () => void;
}) => {
  const sizeOptions = useMemo(() => Array.from(new Set([...sizes, ...COMMON_SIZES])), [sizes]);
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 space-y-2">
      <div className="flex items-start gap-2.5">
        <PhotoCapture
          value={d.photo_url}
          onChange={url => onChange({ photo_url: url })}
          folder={`tissue/variants/${d.id || d.key}`}
          size="sm"
        />
        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
          <div>
            <Label className="text-[10px] text-muted-foreground">Talla</Label>
            <select value={d.size} onChange={e => onChange({ size: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background text-sm px-2">
              <option value="">—</option>
              {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Color</Label>
            <select value={d.color} onChange={e => onChange({ color: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background text-sm px-2">
              <option value="">—</option>
              {colors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Precio (opcional)</Label>
          <Input value={d.price} onChange={e => onChange({ price: e.target.value })} type="number" inputMode="decimal" placeholder="Usa precio base" className="h-10" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Stock</Label>
          <Input value={d.stock} onChange={e => onChange({ stock: e.target.value })} type="number" inputMode="numeric" className="h-10" />
        </div>
      </div>
    </div>
  );
};
