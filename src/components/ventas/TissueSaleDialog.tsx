import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, ShoppingBag, Plus, X, ChevronLeft, ChevronRight, Check, Trash2, Search, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useClientProducts } from '@/hooks/use-client-products';
import { useProductVariants } from '@/hooks/use-product-variants';
import { useClientTeamMembers } from '@/hooks/use-client-team-members';
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
const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'sinpe', label: 'SINPE' },
  { value: 'transferencia_bancaria', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

type OrderItem = {
  tempId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  brand?: string | null;
  variantLabel?: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const STEP_TITLES = ['Orden', 'Cliente', 'Pago'];

export const TissueSaleDialog = ({ open, onOpenChange, clientId }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { products } = useClientProducts(clientId);
  const { data: teamMembers = [] } = useClientTeamMembers(clientId);

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProductId, setPickerProductId] = useState<string | null>(null);
  const [searchProd, setSearchProd] = useState('');
  const [showNewProduct, setShowNewProduct] = useState(false);

  // Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [closerName, setCloserName] = useState('');
  const [source, setSource] = useState('ad');
  const [adChannel, setAdChannel] = useState('instagram');

  // Pago
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [mode, setMode] = useState<'sale' | 'apartado'>('sale');
  const [deposit, setDeposit] = useState('');
  const [reservationDate, setReservationDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
  });
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0), [items]);
  const itemCount = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setItems([]);
    setPickerOpen(false);
    setPickerProductId(null);
    setSearchProd('');
    setCustomerName(''); setCustomerPhone('');
    setSource('ad'); setAdChannel('instagram');
    setPaymentMethod('efectivo');
    setMode('sale'); setDeposit('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    const me = teamMembers.find(m => m.userId === user?.id);
    setCloserName(me?.fullName || '');
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = searchProd.toLowerCase().trim();
    return products.filter(p =>
      !q || p.name.toLowerCase().includes(q) || ((p as any).brand || '').toLowerCase().includes(q)
    );
  }, [products, searchProd]);

  const addItem = (item: OrderItem) => {
    setItems(prev => [...prev, item]);
    setPickerOpen(false);
    setPickerProductId(null);
    setSearchProd('');
  };

  const updateItem = (tempId: string, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map(it => it.tempId === tempId ? { ...it, ...patch } : it));
  };

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(it => it.tempId !== tempId));
  };

  const canAdvance = (s: number) => {
    if (s === 0) return items.length > 0;
    if (s === 1) return !!closerName && (source !== 'ad' || !!adChannel);
    return true;
  };

  const handleNext = () => {
    if (!canAdvance(step)) {
      if (step === 0) toast.error('Agrega al menos un producto');
      if (step === 1) toast.error('Completa vendedor y canal');
      return;
    }
    if (step < 2) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return toast.error('Sin productos');
    if (!closerName) return toast.error('Falta vendedor');

    setSubmitting(true);
    try {
      const isApartado = mode === 'apartado';
      const first = items[0];
      const productLabel = items.length === 1
        ? [first.productName, first.size, first.color].filter(Boolean).join(' · ')
        : `Orden (${items.length} productos)`;

      const { data: sale, error } = await supabase.from('message_sales').insert({
        client_id: clientId,
        created_by: user!.id,
        sale_date: saleDate,
        amount: total,
        currency: 'CRC',
        source,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        product: productLabel,
        brand: first.brand || null,
        garment_size: first.size || null,
        closer_name: closerName,
        notes: notes || null,
        payment_method: paymentMethod,
        status: isApartado ? 'apartado' : 'completed',
        variant_id: items.length === 1 ? first.variantId : null,
        ig_account: source === 'ad' ? adChannel : null,
        deposit_amount: isApartado && deposit ? Number(deposit) : null,
        reservation_expires_at: isApartado ? reservationDate : null,
      } as any).select('id').single();

      if (error) throw error;

      // Insert order items
      const itemRows = items.map(it => ({
        sale_id: sale.id,
        client_id: clientId,
        product_id: it.productId,
        variant_id: it.variantId,
        product_name: it.productName,
        variant_label: [it.size, it.color].filter(Boolean).join(' · ') || null,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        currency: 'CRC',
      }));
      const { error: itemsErr } = await supabase.from('sale_order_items').insert(itemRows as any);
      if (itemsErr) console.error('Items err', itemsErr);

      // Customer
      if (customerName) {
        try {
          await supabase.from('customer_contacts').upsert({
            client_id: clientId,
            full_name: customerName,
            phone: customerPhone || null,
            last_purchase_at: new Date().toISOString(),
          } as any, { onConflict: 'client_id,phone' });
        } catch {}
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
        <DialogContent className="p-0 gap-0 max-w-xl w-full sm:h-auto h-[100dvh] sm:max-h-[92vh] sm:rounded-lg rounded-none flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-base">{mode === 'apartado' ? 'Nuevo apartado' : 'Nueva venta'}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Step pills */}
            <div className="flex items-center gap-2">
              {STEP_TITLES.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn(
                    'h-1.5 w-full rounded-full transition-colors',
                    i === step ? 'bg-primary' : i < step ? 'bg-primary/40' : 'bg-muted'
                  )} />
                  <span className={cn('text-[10px] font-medium', i === step ? 'text-primary' : 'text-muted-foreground')}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {step === 0 && (
              <OrderStep
                items={items}
                addItem={addItem}
                updateItem={updateItem}
                removeItem={removeItem}
                onOpenPicker={() => setPickerOpen(true)}
                total={total}
                itemCount={itemCount}
              />
            )}
            {step === 1 && (
              <ClientStep
                customerName={customerName} setCustomerName={setCustomerName}
                customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                closerName={closerName} setCloserName={setCloserName}
                source={source} setSource={setSource}
                adChannel={adChannel} setAdChannel={setAdChannel}
                teamMembers={teamMembers}
              />
            )}
            {step === 2 && (
              <PaymentStep
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                mode={mode} setMode={setMode}
                deposit={deposit} setDeposit={setDeposit}
                reservationDate={reservationDate} setReservationDate={setReservationDate}
                saleDate={saleDate} setSaleDate={setSaleDate}
                notes={notes} setNotes={setNotes}
                total={total}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-background flex items-center justify-between gap-2 sticky bottom-0">
            <div className="text-xs">
              <div className="text-muted-foreground">{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</div>
              <div className="font-semibold text-base">₡{total.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="h-10">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
              )}
              {step < 2 ? (
                <Button size="sm" onClick={handleNext} className="h-10" disabled={!canAdvance(step)}>
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="h-10">
                  {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  {mode === 'apartado' ? 'Crear apartado' : 'Registrar venta'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product picker overlay */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl w-full sm:h-auto h-[100dvh] sm:max-h-[85vh] sm:rounded-lg rounded-none flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Agregar al pedido</h3>
            <Button variant="ghost" size="sm" onClick={() => { setPickerOpen(false); setPickerProductId(null); }} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!pickerProductId ? (
            <>
              <div className="px-4 py-3 border-b space-y-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto…"
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    className="h-10 pl-8"
                    autoFocus
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 w-full gap-1" onClick={() => setShowNewProduct(true)}>
                  <Plus className="h-3.5 w-3.5" /> Crear producto nuevo
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPickerProductId(p.id)}
                    className="flex flex-col gap-1.5 p-2 rounded-lg border hover:border-primary/60 active:bg-accent text-left"
                  >
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="aspect-square w-full rounded object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    {(p as any).brand && <div className="text-[10px] text-muted-foreground truncate">{(p as any).brand}</div>}
                  </button>
                ))}
                {filteredProducts.length === 0 && <div className="col-span-full text-xs text-muted-foreground text-center py-8">Sin resultados</div>}
              </div>
            </>
          ) : (
            <VariantPicker
              clientId={clientId}
              productId={pickerProductId}
              product={products.find(p => p.id === pickerProductId)}
              onBack={() => setPickerProductId(null)}
              onAdd={addItem}
            />
          )}
        </DialogContent>
      </Dialog>

      {showNewProduct && (
        <TissueProductDialog
          open={showNewProduct}
          onOpenChange={(o) => { setShowNewProduct(o); if (!o) qc.invalidateQueries({ queryKey: ['client-products', clientId] }); }}
          clientId={clientId}
          onSaved={(p) => { if (p?.id) { setPickerProductId(p.id); setShowNewProduct(false); } }}
        />
      )}
    </>
  );
};

// ────── Step components ──────

const OrderStep = ({ items, addItem, updateItem, removeItem, onOpenPicker, total, itemCount }: any) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold">Pedido</h3>
      <Button size="sm" onClick={onOpenPicker} className="h-9 gap-1">
        <Plus className="h-4 w-4" /> Agregar
      </Button>
    </div>

    {items.length === 0 ? (
      <button
        type="button"
        onClick={onOpenPicker}
        className="w-full p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/50 flex flex-col items-center gap-2 text-muted-foreground"
      >
        <ShoppingBag className="h-8 w-8" />
        <div className="text-sm font-medium">Agrega productos al pedido</div>
        <div className="text-xs">Toca para buscar o crear nuevos</div>
      </button>
    ) : (
      <div className="space-y-2">
        {items.map((it: OrderItem) => (
          <div key={it.tempId} className="rounded-lg border p-3 space-y-2 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{it.productName}</div>
                {(it.size || it.color || it.brand) && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {[it.brand, it.size, it.color].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(it.tempId)} className="h-7 w-7 p-0 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0"
                    onClick={() => updateItem(it.tempId, { quantity: Math.max(1, it.quantity - 1) })}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={it.quantity}
                    onChange={e => updateItem(it.tempId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="h-9 text-center px-1"
                  />
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0"
                    onClick={() => updateItem(it.tempId, { quantity: it.quantity + 1 })}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Precio unit. (₡)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={it.unitPrice}
                  onChange={e => updateItem(it.tempId, { unitPrice: Number(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-[11px] text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold">₡{(it.quantity * it.unitPrice).toLocaleString()}</span>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onOpenPicker}
          className="w-full p-3 rounded-lg border-2 border-dashed hover:border-primary/60 text-xs text-muted-foreground flex items-center justify-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar otro producto
        </button>
      </div>
    )}
  </div>
);

const ClientStep = ({ customerName, setCustomerName, customerPhone, setCustomerPhone, closerName, setCloserName, source, setSource, adChannel, setAdChannel, teamMembers }: any) => (
  <div className="space-y-4">
    <div>
      <Label className="text-xs">Nombre del cliente</Label>
      <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Opcional" className="h-11" />
    </div>
    <div>
      <Label className="text-xs">Teléfono</Label>
      <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" inputMode="tel" placeholder="8888-8888" className="h-11" />
    </div>
    <div>
      <Label className="text-xs">Vendedor</Label>
      <select value={closerName} onChange={e => setCloserName(e.target.value)} className="w-full h-11 rounded-md border border-input bg-background text-sm px-3">
        <option value="">Seleccionar…</option>
        {teamMembers.map((m: any) => <option key={m.userId} value={m.fullName}>{m.fullName}</option>)}
      </select>
    </div>
    <div>
      <Label className="text-xs">Origen</Label>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {SOURCE_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setSource(o.value)}
            className={cn(
              'h-11 rounded-md border text-sm font-medium transition',
              source === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-input'
            )}
          >{o.label}</button>
        ))}
      </div>
    </div>
    {source === 'ad' && (
      <div>
        <Label className="text-xs">Canal</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {AD_CHANNELS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAdChannel(c.value)}
              className={cn(
                'h-11 rounded-md border text-sm font-medium transition',
                adChannel === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-input'
              )}
            >{c.label}</button>
          ))}
        </div>
      </div>
    )}
  </div>
);

const PaymentStep = ({ paymentMethod, setPaymentMethod, mode, setMode, deposit, setDeposit, reservationDate, setReservationDate, saleDate, setSaleDate, notes, setNotes, total }: any) => (
  <div className="space-y-4">
    <div>
      <Label className="text-xs">Tipo</Label>
      <div className="flex rounded-lg bg-muted p-1 text-sm font-medium mt-1">
        <button type="button" onClick={() => setMode('sale')} className={cn('flex-1 py-2 rounded-md transition', mode === 'sale' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Venta</button>
        <button type="button" onClick={() => setMode('apartado')} className={cn('flex-1 py-2 rounded-md transition', mode === 'apartado' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Apartado</button>
      </div>
    </div>

    <div>
      <Label className="text-xs">Método de pago</Label>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {PAYMENT_METHODS.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPaymentMethod(p.value)}
            className={cn(
              'h-11 rounded-md border text-sm font-medium transition',
              paymentMethod === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-input'
            )}
          >{p.label}</button>
        ))}
      </div>
    </div>

    <div>
      <Label className="text-xs">Fecha de venta</Label>
      <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="h-11" />
    </div>

    {mode === 'apartado' && (
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/5">
        <div>
          <Label className="text-xs">Depósito (₡)</Label>
          <Input value={deposit} onChange={e => setDeposit(e.target.value)} type="number" inputMode="decimal" className="h-11" />
        </div>
        <div>
          <Label className="text-xs">Vence</Label>
          <Input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} className="h-11" />
        </div>
      </div>
    )}

    <div>
      <Label className="text-xs">Notas</Label>
      <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Opcional" />
    </div>

    <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
      <span className="text-sm font-medium">Total a registrar</span>
      <span className="text-lg font-bold">₡{total.toLocaleString()}</span>
    </div>
  </div>
);

const VariantPicker = ({ clientId, productId, product, onBack, onAdd }: any) => {
  const { variants } = useProductVariants(clientId, productId);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(product?.price || 0);

  useEffect(() => {
    if (variants.length === 1 && !variantId) setVariantId(variants[0].id);
  }, [variants]);

  const v = variants.find(x => x.id === variantId);
  useEffect(() => {
    if (v?.price) setUnitPrice(v.price);
    else if (product?.price) setUnitPrice(product.price);
  }, [v, product]);

  const handleAdd = () => {
    if (variants.length > 0 && !variantId) {
      toast.error('Selecciona una variante');
      return;
    }
    if (!unitPrice || unitPrice <= 0) {
      toast.error('Indica un precio');
      return;
    }
    onAdd({
      tempId: crypto.randomUUID(),
      productId: product.id,
      variantId: v?.id || null,
      productName: product.name,
      brand: product.brand || null,
      size: v?.size || null,
      color: v?.color || null,
      quantity,
      unitPrice,
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          {product?.photo_url ? (
            <img src={product.photo_url} alt="" className="h-14 w-14 rounded object-cover" />
          ) : (
            <div className="h-14 w-14 rounded bg-muted flex items-center justify-center"><Package className="h-6 w-6" /></div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{product?.name}</div>
            {product?.brand && <Badge variant="outline" className="text-[10px]">{product.brand}</Badge>}
          </div>
        </div>

        {variants.length > 0 && (
          <div>
            <Label className="text-xs">Variante</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {variants.map(vv => {
                const noStock = vv.stock_quantity <= 0;
                const sel = variantId === vv.id;
                return (
                  <button
                    key={vv.id}
                    type="button"
                    disabled={noStock && !sel}
                    onClick={() => setVariantId(vv.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 transition min-h-[40px]',
                      sel ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/40',
                      noStock && 'opacity-40'
                    )}
                  >
                    {vv.size && <span className="font-medium">{vv.size}</span>}
                    {vv.color && <span className="text-muted-foreground">{vv.color}</span>}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{vv.stock_quantity}</Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Cantidad</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-11 w-11 p-0" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input type="number" inputMode="numeric" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))} className="h-11 text-center px-1" />
              <Button variant="outline" size="sm" className="h-11 w-11 p-0" onClick={() => setQuantity(q => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Precio unit. (₡)</Label>
            <Input type="number" inputMode="decimal" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value) || 0)} className="h-11" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="h-11">
          <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">₡{(quantity * unitPrice).toLocaleString()}</span>
          <Button size="sm" onClick={handleAdd} className="h-11">
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>
    </>
  );
};
