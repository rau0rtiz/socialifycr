import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, ShoppingBag, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useClientProducts } from '@/hooks/use-client-products';
import { useProductVariants, ProductVariant } from '@/hooks/use-product-variants';
import { useClientTeamMembers } from '@/hooks/use-client-team-members';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { TissueProductDialog } from '@/components/inventory/TissueProductDialog';

const SOURCE_OPTIONS = [
  { value: 'ad', label: 'Publicidad' },
  { value: 'store', label: 'Tienda física' },
];

const AD_CHANNELS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'tiktok', label: 'TikTok' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export const TissueSaleDialog = ({ open, onOpenChange, clientId }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { products } = useClientProducts(clientId);
  
  const { data: teamMembers = [] } = useClientTeamMembers(clientId);
  const { addSale } = useSalesTracking(clientId);

  const [productId, setProductId] = useState<string | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [source, setSource] = useState('store');
  const [adChannel, setAdChannel] = useState('instagram');
  const [closerName, setCloserName] = useState('');
  const [mode, setMode] = useState<'sale' | 'apartado'>('sale');
  const [deposit, setDeposit] = useState('');
  const [reservationDate, setReservationDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [searchProd, setSearchProd] = useState('');

  const selectedProduct = useMemo(() => products.find(p => p.id === productId) || null, [products, productId]);
  const { variants } = useProductVariants(clientId, productId);

  const filteredProducts = useMemo(() => {
    const q = searchProd.toLowerCase();
    return products.filter(p =>
      !q || p.name.toLowerCase().includes(q) ||
      ((p as any).brand || '').toLowerCase().includes(q)
    ).slice(0, 12);
  }, [products, searchProd]);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setProductId(null); setVariant(null); setAmount(''); setCustomerName(''); setCustomerPhone('');
      setSource('ad'); setAdChannel('instagram'); setMode('sale'); setDeposit(''); setNotes('');
      // Auto-pick logged-in user as vendedor if they belong to the team
      const me = teamMembers.find(m => m.userId === user?.id);
      setCloserName(me?.fullName || '');
      setSearchProd('');
    }
  }, [open]);

  // Auto-fill price from variant
  useEffect(() => {
    if (variant?.price) setAmount(String(variant.price));
    else if (selectedProduct?.price) setAmount(String(selectedProduct.price));
  }, [variant, selectedProduct]);

  // Auto-pick variant if product has only one
  useEffect(() => {
    if (selectedProduct && variants.length === 1) setVariant(variants[0]);
    else if (selectedProduct && variants.length > 1 && variant && !variants.find(v => v.id === variant.id)) setVariant(null);
  }, [selectedProduct, variants]);

  const handleSubmit = async () => {
    if (!selectedProduct) return toast.error('Selecciona un producto');
    if (variants.length > 0 && !variant) return toast.error('Selecciona una variante');
    if (!amount) return toast.error('Falta monto');
    if (!closerName) return toast.error('Selecciona la vendedora');

    setSubmitting(true);
    try {
      const isApartado = mode === 'apartado';
      const productLabel = [selectedProduct.name, variant?.size, variant?.color].filter(Boolean).join(' · ');

      const { data, error } = await supabase.from('message_sales').insert({
        client_id: clientId,
        created_by: user!.id,
        sale_date: new Date().toISOString().split('T')[0],
        amount: Number(amount),
        currency: 'CRC',
        source,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        product: productLabel,
        brand: (selectedProduct as any).brand || null,
        garment_size: variant?.size || null,
        closer_name: closerName,
        notes: notes || null,
        status: isApartado ? 'apartado' : 'completed',
        variant_id: variant?.id || null,
        ig_account: igAccount || null,
        deposit_amount: isApartado && deposit ? Number(deposit) : null,
        reservation_expires_at: isApartado ? reservationDate : null,
      } as any).select('id').single();

      if (error) throw error;

      // Upsert customer (best-effort)
      if (customerName) {
        try {
          await supabase.from('customer_contacts').upsert({
            client_id: clientId,
            full_name: customerName,
            phone: customerPhone || null,
            garment_sizes: variant?.size ? [variant.size] : [],
            preferred_brands: (selectedProduct as any).brand ? [(selectedProduct as any).brand] : [],
            last_purchase_at: new Date().toISOString(),
          } as any, { onConflict: 'client_id,phone' });
        } catch (e) { /* non-blocking */ }
      }

      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['product_variants'] });
      toast.success(isApartado ? 'Apartado registrado' : 'Venta registrada');
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {mode === 'apartado' ? 'Nuevo apartado' : 'Nueva venta'}
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('sale')}
              className={cn('flex-1 py-1.5 rounded-md transition', mode === 'sale' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >Venta</button>
            <button
              type="button"
              onClick={() => setMode('apartado')}
              className={cn('flex-1 py-1.5 rounded-md transition', mode === 'apartado' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >Apartado</button>
          </div>

          <div className="space-y-4">
            {/* Product picker */}
            <div className="space-y-2">
              <Label className="text-xs">Producto</Label>
              {!selectedProduct ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar por nombre o marca…"
                      value={searchProd}
                      onChange={(e) => setSearchProd(e.target.value)}
                      className="h-9"
                    />
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={() => setShowNewProduct(true)}>
                      <Plus className="h-3.5 w-3.5" /> Nuevo
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent text-left"
                      >
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{p.name}</div>
                          {(p as any).brand && <div className="text-[10px] text-muted-foreground truncate">{(p as any).brand}</div>}
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <div className="col-span-full text-xs text-muted-foreground p-4 text-center">Sin resultados</div>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/20">
                  {selectedProduct.photo_url ? (
                    <img src={selectedProduct.photo_url} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center"><Package className="h-5 w-5" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{selectedProduct.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      {(selectedProduct as any).brand && <Badge variant="outline" className="text-[10px]">{(selectedProduct as any).brand}</Badge>}
                      {selectedProduct.category && <Badge variant="outline" className="text-[10px]">{selectedProduct.category}</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setProductId(null); setVariant(null); }}>Cambiar</Button>
                </div>
              )}
            </div>

            {/* Variant picker */}
            {selectedProduct && variants.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> Variante (talla / color)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {variants.map(v => {
                    const noStock = v.stock_quantity <= 0;
                    const isSelected = variant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={noStock && !isSelected}
                        onClick={() => setVariant(v)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition',
                          isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                          noStock && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        {v.size && <span className="font-medium">{v.size}</span>}
                        {v.color && <span className="text-muted-foreground">{v.color}</span>}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{v.stock_quantity}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto (CRC)</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Vendedora</Label>
                <select value={closerName} onChange={(e) => setCloserName(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
                  <option value="">Seleccionar…</option>
                  {closers.map(c => <option key={c.userId} value={c.fullName}>{c.fullName}</option>)}
                </select>
              </div>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cliente</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="8888-8888" className="h-9" />
              </div>
            </div>

            {/* Source + IG account */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Origen</Label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
                  {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Cuenta de Instagram (opcional)</Label>
                <Input value={igAccount} onChange={(e) => setIgAccount(e.target.value)} placeholder="@tissue_..." className="h-9" />
              </div>
            </div>

            {/* Apartado fields */}
            {mode === 'apartado' && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/5">
                <div>
                  <Label className="text-xs">Depósito</Label>
                  <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} type="number" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Vence</Label>
                  <Input value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} type="date" className="h-9" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'apartado' ? 'Registrar apartado' : 'Registrar venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showNewProduct && (
        <TissueProductDialog
          open={showNewProduct}
          onOpenChange={(o) => { setShowNewProduct(o); if (!o) qc.invalidateQueries({ queryKey: ['client-products', clientId] }); }}
          clientId={clientId}
          onSaved={(p) => { if (p?.id) { setProductId(p.id); setShowNewProduct(false); } }}
        />
      )}
    </>
  );
};
