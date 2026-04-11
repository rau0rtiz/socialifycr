import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useClientProducts, ClientProduct, ProductInput } from '@/hooks/use-client-products';
import { usePaymentSchemes, PaymentSchemeInput, useClientPaymentSchemes } from '@/hooks/use-payment-schemes';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Pencil, Trash2, DollarSign, TrendingUp, Camera, Loader2, X, CreditCard, GraduationCap, Users, BookOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBrand } from '@/contexts/BrandContext';

interface ProductsManagerProps {
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

// Sub-component: Variants for a product (used inside the detail dialog)
const VariantsSection = ({ productId, clientId, productCurrency }: { productId: string; clientId: string; productCurrency: string }) => {
  const { schemes, addScheme, updateScheme, deleteScheme } = usePaymentSchemes(productId, clientId);
  const [editing, setEditing] = useState<string | null>(null);
  const [sName, setSName] = useState('');
  const [sTotal, setSTotal] = useState('');
  const [sInstallments, setSInstallments] = useState('1');
  const [sCurrency, setSCurrency] = useState(productCurrency);
  const [adding, setAdding] = useState(false);

  const installmentAmount = sTotal && sInstallments && parseInt(sInstallments) > 0
    ? parseFloat(sTotal) / parseInt(sInstallments)
    : 0;

  const resetForm = () => {
    setSName('');
    setSTotal('');
    setSInstallments('1');
    setSCurrency(productCurrency);
    setEditing(null);
    setAdding(false);
  };

  const openEdit = (s: any) => {
    setEditing(s.id);
    setSName(s.name);
    setSTotal(String(s.total_price));
    setSInstallments(String(s.num_installments));
    setSCurrency(s.currency);
    setAdding(true);
  };

  const handleSave = async () => {
    if (!sName.trim() || !sTotal) {
      toast.error('Nombre y precio total son obligatorios');
      return;
    }
    const input: PaymentSchemeInput = {
      name: sName.trim(),
      total_price: parseFloat(sTotal),
      num_installments: parseInt(sInstallments) || 1,
      installment_amount: Math.round(installmentAmount * 100) / 100,
      currency: sCurrency,
      sort_order: schemes.length,
    };
    try {
      if (editing) {
        await updateScheme.mutateAsync({ id: editing, ...input });
        toast.success('Variante actualizada');
      } else {
        await addScheme.mutateAsync(input);
        toast.success('Variante creada');
      }
      resetForm();
    } catch {
      toast.error('Error al guardar variante');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheme.mutateAsync(id);
      toast.success('Variante eliminada');
    } catch {
      toast.error('Error al eliminar variante');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          Variantes
        </Label>
        {!adding && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Agregar variante
          </Button>
        )}
      </div>

      {/* Existing schemes */}
      {schemes.length > 0 && (
        <div className="space-y-1.5">
          {schemes.map(s => (
            <div key={s.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted-foreground ml-1.5">
                  {formatCurrency(s.total_price, s.currency)}
                </span>
                {s.num_installments > 1 && (
                  <Badge variant="secondary" className="ml-1.5 text-[9px] py-0">
                    {s.num_installments}x {formatCurrency(s.installment_amount, s.currency)}
                  </Badge>
                )}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}>
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {adding && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2.5">
          <Input
            placeholder="Ej: 2 clases/semana, Intensivo, Premium..."
            value={sName}
            onChange={e => setSName(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Precio total</Label>
              <Input type="number" min={0} placeholder="0" value={sTotal} onChange={e => setSTotal(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Cuotas</Label>
              <Input type="number" min={1} max={36} value={sInstallments} onChange={e => setSInstallments(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Moneda</Label>
              <Select value={sCurrency} onValueChange={setSCurrency}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">₡ CRC</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {installmentAmount > 0 && parseInt(sInstallments) > 1 && (
            <p className="text-[10px] text-muted-foreground">
              Cuota: <span className="font-semibold text-foreground">{formatCurrency(Math.round(installmentAmount * 100) / 100, sCurrency)}</span> × {sInstallments}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={handleSave} disabled={addScheme.isPending || updateScheme.isPending}>
              {editing ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      {schemes.length === 0 && !adding && (
        <div className="text-center py-4 rounded-lg border border-dashed border-border/50">
          <CreditCard className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">Sin variantes</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Agrega variantes con diferentes precios y opciones de cuotas</p>
        </div>
      )}
    </div>
  );
};
const SPEAK_UP_CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'individual', label: 'Clases Personalizadas', icon: GraduationCap },
  { key: 'group', label: 'Clases Grupales', icon: Users },
  { key: 'toeic', label: 'TOEIC', icon: BookOpen },
  { key: 'exam', label: 'Exámenes', icon: BookOpen },
  { key: 'trial', label: 'Otros', icon: MoreHorizontal },
];

const ProductCard = ({ p, allSchemes, onClick }: { p: ClientProduct; allSchemes: any[]; onClick: () => void }) => {
  const productSchemes = allSchemes.filter((s: any) => s.product_id === p.id);
  const variantCount = productSchemes.length;
  const minPrice = variantCount > 0
    ? Math.min(...productSchemes.map((s: any) => s.total_price))
    : p.price;
  const minCurrency = variantCount > 0 ? productSchemes.reduce((prev: any, curr: any) => curr.total_price < prev.total_price ? curr : prev).currency : p.currency;

  return (
    <div
      className="group rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer p-3.5"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
            {variantCount > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {variantCount} variante{variantCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {p.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {minPrice != null && (
              <span className="text-xs font-medium text-foreground">
                {variantCount > 0 ? 'Desde ' : ''}{formatCurrency(minPrice, minCurrency)}
              </span>
            )}
          </div>
        </div>
        <div className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};

const ProductList = ({ products, allSchemes, onSelect, clientId }: { products: ClientProduct[]; allSchemes: any[]; onSelect: (p: ClientProduct) => void; clientId: string }) => {
  const { selectedClient } = useBrand();
  const isSpeakUp = selectedClient?.name?.toLowerCase().includes('speak up');

  if (!isSpeakUp) {
    return (
      <div className="space-y-2">
        {products.map(p => (
          <ProductCard key={p.id} p={p} allSchemes={allSchemes} onClick={() => onSelect(p)} />
        ))}
      </div>
    );
  }

  // Group by category for Speak Up
  const grouped = SPEAK_UP_CATEGORIES.map(cat => {
    const catProducts = products.filter(p => {
      if (cat.key === 'trial') {
        // "Otros" catches trial + anything uncategorized
        return !['individual', 'group', 'toeic', 'exam'].includes(p.category || '');
      }
      return p.category === cat.key;
    });
    return { ...cat, products: catProducts };
  }).filter(g => g.products.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(group => {
        const Icon = group.icon;
        return (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-auto">{group.products.length}</Badge>
            </div>
            <div className="space-y-2">
              {group.products.map(p => (
                <ProductCard key={p.id} p={p} allSchemes={allSchemes} onClick={() => onSelect(p)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};


  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useClientProducts(clientId);
  const { data: allSchemes } = useClientPaymentSchemes(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Detail dialog — clicking a product card opens this
  const [detailProduct, setDetailProduct] = useState<ClientProduct | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setCost('');
    setCurrency('CRC');
    setDescription('');
    setPhotoUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (p: ClientProduct) => {
    setEditing(p);
    setName(p.name);
    setPrice(p.price != null ? String(p.price) : '');
    setCost(p.cost != null ? String(p.cost) : '');
    setCurrency(p.currency);
    setDescription(p.description || '');
    setPhotoUrl(p.photo_url || null);
    setDialogOpen(true);
    setDetailProduct(null); // close detail when opening edit
  };

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
    const input: ProductInput = {
      name: name.trim(),
      price: price ? parseFloat(price) : null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      description: description.trim(),
      photo_url: photoUrl,
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...input });
        toast.success('Producto actualizado');
      } else {
        const result = await addProduct.mutateAsync(input);
        toast.success('Producto creado');
        // Open the detail dialog for the new product so user can add schemes
        setDetailProduct(result);
      }
      setDialogOpen(false);
    } catch {
      toast.error('Error al guardar producto');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Producto eliminado');
      setDeleteConfirm(null);
      setDetailProduct(null);
    } catch {
      toast.error('Error al eliminar producto');
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              Productos
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Package className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin productos</p>
              <p className="text-xs text-muted-foreground mt-1">Agrega productos para vincularlos con ventas.</p>
              <Button size="sm" variant="outline" onClick={openNew} className="mt-3 h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Crear primer producto
              </Button>
            </div>
          ) : (
            <ProductList
              products={products}
              allSchemes={allSchemes || []}
              onSelect={setDetailProduct}
              clientId={clientId}
            />
          )}
        </CardContent>
      </Card>

      {/* ========== PRODUCT DETAIL DIALOG ========== */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => { if (!open) setDetailProduct(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0">
          {detailProduct && (
            <>
              {/* Header with product info */}
              <div className="px-6 pt-6 pb-4 space-y-4">
                <DialogHeader className="space-y-0">
                  <DialogTitle className="sr-only">{detailProduct.name}</DialogTitle>
                </DialogHeader>
                <div className="flex items-start gap-4">
                  {detailProduct.photo_url ? (
                    <img src={detailProduct.photo_url} alt={detailProduct.name} className="w-16 h-16 rounded-xl object-cover border border-border/50 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground">{detailProduct.name}</h3>
                    {detailProduct.description && (
                      <p className="text-xs text-muted-foreground mt-1">{detailProduct.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {detailProduct.price != null && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="font-semibold text-foreground">{formatCurrency(detailProduct.price, detailProduct.currency)}</span>
                          <span className="text-muted-foreground">precio</span>
                        </div>
                      )}
                      {detailProduct.cost != null && (
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="font-semibold text-foreground">{formatCurrency(detailProduct.cost, detailProduct.currency)}</span>
                          <span className="text-muted-foreground">costo</span>
                        </div>
                      )}
                      {detailProduct.price != null && detailProduct.cost != null && detailProduct.cost > 0 && (
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          (() => {
                            const m = Math.round(((detailProduct.price! - detailProduct.cost!) / detailProduct.price!) * 100);
                            return m >= 50 ? 'bg-emerald-500/10 text-emerald-600' :
                              m >= 20 ? 'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600';
                          })()
                        )}>
                          {Math.round(((detailProduct.price! - detailProduct.cost!) / detailProduct.price!) * 100)}% margen
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => openEdit(detailProduct)}>
                    <Pencil className="h-3 w-3" /> Editar producto
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(detailProduct.id)}>
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </Button>
                </div>
              </div>

              <Separator />

               {/* Variants section */}
              <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '40vh' }}>
                <VariantsSection
                  productId={detailProduct.id}
                  clientId={clientId}
                  productCurrency={detailProduct.currency}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              {editing ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Photo upload */}
            <div>
              <Label className="text-xs">Foto del producto</Label>
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
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del producto o servicio..." className="mt-1.5 min-h-[70px] text-sm" />
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Precio base</Label>
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
            {price && cost && parseFloat(cost) > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                Margen: <span className="font-semibold text-foreground">
                  {Math.round(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100)}%
                </span>
                {' '}· Ganancia: <span className="font-semibold text-foreground">
                  {formatCurrency(parseFloat(price) - parseFloat(cost), currency)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={addProduct.isPending || updateProduct.isPending || uploading} size="sm">
              {(addProduct.isPending || updateProduct.isPending) ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar producto?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} size="sm">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} size="sm" disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
