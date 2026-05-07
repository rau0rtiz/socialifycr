import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ChevronLeft, ChevronRight, Package, Image as ImageIcon, MapPin, Search, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useCustomerContacts, upsertCustomerContact, type CustomerAddress } from '@/hooks/use-customer-contacts';
import { useClientProducts } from '@/hooks/use-client-products';
import { useStories } from '@/hooks/use-stories';
import { useOrders } from '@/hooks/use-orders';
import { useProductBrands, useProductCategoriesCatalog } from '@/hooks/use-product-catalogs';
import { CostaRicaAddressDialog } from '@/components/common/CostaRicaAddressDialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
}

interface DraftItem {
  key: string;
  product_id: string | null;
  variant_id: string | null;
  story_id: string | null;
  story_thumb?: string | null;
  product_name: string;
  garment_size?: string;
  brand?: string;
  garment_type?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

const STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagada' },
  { value: 'shipped', label: 'Enviada' },
  { value: 'delivered', label: 'Entregada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const PAYMENT_METHODS = ['Efectivo', 'SINPE', 'Transferencia', 'Stripe', 'Tarjeta', 'Otro'];

export const OrderWizardDialog = ({ open, onOpenChange, clientId }: Props) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { contacts } = useCustomerContacts(clientId);
  const { products } = useClientProducts(clientId);
  const { activeStories, archivedStories, allArchivedStories, isLoadingAllArchived, hasMoreArchived, fetchAllArchived } = useStories(clientId);
  const [storyQuery, setStoryQuery] = useState('');
  const [storyShowAll, setStoryShowAll] = useState(false);
  const [storyDateFrom, setStoryDateFrom] = useState('');
  const [storyDateTo, setStoryDateTo] = useState('');
  const { items: brandsCatalog } = useProductBrands(clientId);
  const { items: categoriesCatalog } = useProductCategoriesCatalog(clientId);
  const { createOrder } = useOrders(clientId);

  // Customer
  const [contactId, setContactId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<CustomerAddress | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

  // Items
  const [items, setItems] = useState<DraftItem[]>([]);

  // Payment
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('SINPE');
  const [currency, setCurrency] = useState('CRC');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1); setContactId(null); setCustomerName(''); setCustomerPhone('');
      setContactQuery(''); setShippingAddress(null); setItems([]);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setStatus('pending'); setPaymentMethod('SINPE'); setCurrency('CRC'); setNotes('');
    }
  }, [open]);

  const selectedContact = contacts.find(c => c.id === contactId);
  const savedAddresses = selectedContact?.addresses || [];

  const total = useMemo(() => items.reduce((s, i) => s + (i.unit_price * i.quantity), 0), [items]);

  const addItem = (partial: Partial<DraftItem>) => {
    setItems(prev => [...prev, {
      key: crypto.randomUUID(),
      product_id: null, variant_id: null, story_id: null,
      product_name: '', quantity: 1, unit_price: 0,
      ...partial,
    } as DraftItem]);
  };

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i));
  };
  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key));

  const handleSelectContact = (c: typeof contacts[0]) => {
    setContactId(c.id);
    setCustomerName(c.full_name);
    setCustomerPhone(c.phone || '');
    if (c.addresses?.[0] && !shippingAddress) setShippingAddress(c.addresses[0]);
    setContactQuery('');
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Agrega al menos un item');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Nombre del cliente requerido');
      return;
    }
    try {
      // Upsert customer contact (don't increment purchase here — sales trigger handles it indirectly)
      let finalContactId = contactId;
      if (!finalContactId) {
        finalContactId = await upsertCustomerContact({
          clientId,
          fullName: customerName,
          phone: customerPhone || null,
          address: shippingAddress,
          isNewSale: false,
        });
      } else if (shippingAddress) {
        // Save new address to existing contact if not already saved
        const exists = (selectedContact?.addresses || []).some(a =>
          a.address_line_1 === shippingAddress.address_line_1 &&
          a.district === shippingAddress.district
        );
        if (!exists) {
          await supabase.from('customer_contacts' as any).update({
            addresses: [...(selectedContact?.addresses || []), shippingAddress],
          } as any).eq('id', finalContactId);
        }
      }

      await createOrder.mutateAsync({
        customer_contact_id: finalContactId,
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        status,
        payment_method: paymentMethod,
        currency,
        order_date: orderDate,
        notes,
        items: items.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          story_id: i.story_id,
          product_name: i.product_name,
          garment_size: i.garment_size,
          brand: i.brand,
          garment_type: i.garment_type,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
          notes: i.notes,
        })),
      });
      toast.success('Orden creada');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'no se pudo crear la orden'));
    }
  };

  const canNext1 = customerName.trim().length > 0;
  const canNext2 = items.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nueva orden — Paso {step} de 3</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 text-xs">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                step >= s ? 'bg-primary' : 'bg-muted'
              )} />
            ))}
          </div>

          {/* STEP 1 — Customer + Address */}
          {step === 1 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-xs">Buscar cliente existente</Label>
                <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={contactPopoverOpen}
                      className="w-full justify-between mt-1 font-normal"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedContact
                            ? `${selectedContact.full_name}${selectedContact.phone ? ` · ${selectedContact.phone}` : ''}`
                            : 'Nombre o teléfono…'}
                        </span>
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command
                      filter={(value, search) => {
                        if (!search) return 1;
                        return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}
                    >
                      <CommandInput placeholder="Nombre o teléfono…" />
                      <CommandList className="max-h-[280px]">
                        <CommandEmpty>Sin resultados</CommandEmpty>
                        <CommandGroup>
                          {contacts.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.full_name || ''} ${c.phone || ''}`}
                              onSelect={() => {
                                handleSelectContact(c);
                                setContactPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  contactId === c.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{c.full_name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {c.phone || 'Sin teléfono'} · {c.total_purchases || 0} compras
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setContactId(null); }} />
                </div>
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Dirección de envío</Label>
                {savedAddresses.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {savedAddresses.map((a, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setShippingAddress(a)}
                        className={cn(
                          'w-full text-left p-2 border rounded-lg text-xs bg-white text-neutral-900 transition-colors',
                          shippingAddress === a
                            ? 'border-2 border-orange-500'
                            : 'border border-neutral-200 hover:border-orange-400'
                        )}
                      >
                        <div className="font-medium text-neutral-900">{a.label || `${a.state}, ${a.city}`}</div>
                        <div className="text-neutral-600">{a.district} · {a.address_line_1}</div>
                      </button>
                    ))}
                  </div>
                )}
                {shippingAddress && !savedAddresses.includes(shippingAddress) && (
                  <Card className="p-2 mb-2 text-xs">
                    <div className="font-medium">{shippingAddress.label || 'Nueva dirección'}</div>
                    <div className="text-muted-foreground">
                      {shippingAddress.state}, {shippingAddress.city}, {shippingAddress.district}
                    </div>
                    <div className="text-muted-foreground">{shippingAddress.address_line_1}</div>
                  </Card>
                )}
                {savedAddresses.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setAddressPickerOpen(true)} className="w-full">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {shippingAddress ? 'Cambiar dirección' : 'Seleccionar dirección'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAddressDialogOpen(true)} className="w-full">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {shippingAddress ? 'Cambiar dirección' : 'Agregar dirección'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Items */}
          {step === 2 && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <Tabs defaultValue="story">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="story" className="text-xs">Desde historias</TabsTrigger>
                  <TabsTrigger value="product" className="text-xs">Catálogo</TabsTrigger>
                  <TabsTrigger value="free" className="text-xs">Sin historia</TabsTrigger>
                </TabsList>

                <TabsContent value="story" className="space-y-2">
                  {(() => {
                    const archivedSource = storyShowAll && allArchivedStories.length > 0 ? allArchivedStories : archivedStories;
                    const all = [...activeStories, ...archivedSource];
                    const q = storyQuery.trim().toLowerCase();
                    const fromMs = storyDateFrom ? new Date(storyDateFrom + 'T00:00:00').getTime() : null;
                    const toMs = storyDateTo ? new Date(storyDateTo + 'T23:59:59').getTime() : null;
                    const hasDateFilter = fromMs !== null || toMs !== null;
                    const filtered = all.filter(s => {
                      const ts = new Date(s.timestamp).getTime();
                      if (fromMs !== null && ts < fromMs) return false;
                      if (toMs !== null && ts > toMs) return false;
                      if (!q) return true;
                      const date = new Date(s.timestamp).toLocaleDateString('es-CR');
                      const sd = s.scannedData || {};
                      return date.includes(q)
                        || (sd.customer_name || '').toLowerCase().includes(q)
                        || (sd.brand || '').toLowerCase().includes(q)
                        || (sd.garment_type || '').toLowerCase().includes(q)
                        || (sd.notes || '').toLowerCase().includes(q);
                    });
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por fecha, cliente, marca…"
                              value={storyQuery}
                              onChange={(e) => setStoryQuery(e.target.value)}
                              className="pl-7 h-8 text-xs"
                            />
                          </div>
                          {(hasMoreArchived || allArchivedStories.length > 0) && (
                            <Button
                              type="button"
                              size="sm"
                              variant={storyShowAll ? 'default' : 'outline'}
                              onClick={() => {
                                if (!storyShowAll && allArchivedStories.length === 0) fetchAllArchived();
                                setStoryShowAll(s => !s);
                              }}
                              disabled={isLoadingAllArchived}
                              className="h-8 text-xs whitespace-nowrap"
                            >
                              {isLoadingAllArchived ? 'Cargando…' : storyShowAll ? 'Solo recientes' : 'Cargar todas'}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Desde</span>
                            <Input
                              type="date"
                              value={storyDateFrom}
                              onChange={(e) => {
                                setStoryDateFrom(e.target.value);
                                if (e.target.value && !storyShowAll && allArchivedStories.length === 0) {
                                  fetchAllArchived();
                                  setStoryShowAll(true);
                                }
                              }}
                              className="h-7 text-xs w-[140px]"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Hasta</span>
                            <Input
                              type="date"
                              value={storyDateTo}
                              onChange={(e) => {
                                setStoryDateTo(e.target.value);
                                if (e.target.value && !storyShowAll && allArchivedStories.length === 0) {
                                  fetchAllArchived();
                                  setStoryShowAll(true);
                                }
                              }}
                              className="h-7 text-xs w-[140px]"
                            />
                          </div>
                          {hasDateFilter && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => { setStoryDateFrom(''); setStoryDateTo(''); }}
                              className="h-7 text-xs"
                            >
                              Limpiar fechas
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Activas: {activeStories.length} · Archivadas: {archivedSource.length}{(q || hasDateFilter) && ` · Resultados: ${filtered.length}`}
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
                          {filtered.slice(0, 200).map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => addItem({
                                story_id: s.storyId,
                                story_thumb: s.thumbnailUrl || s.mediaUrl,
                                product_name: `Historia ${new Date(s.timestamp).toLocaleDateString('es-CR')}`,
                                brand: s.scannedData?.brand || undefined,
                                garment_type: s.scannedData?.garment_type || undefined,
                              })}
                              className="aspect-[9/16] rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary relative"
                            >
                              {(s.thumbnailUrl || s.mediaUrl) ? (
                                <img src={s.thumbnailUrl || s.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                              {s.isActive && <div className="absolute top-0.5 right-0.5 bg-green-500 text-[8px] text-white px-1 rounded">LIVE</div>}
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                                {new Date(s.timestamp).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
                              </div>
                            </button>
                          ))}
                          {filtered.length === 0 && (
                            <div className="col-span-full text-center text-xs text-muted-foreground py-6">Sin historias</div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="product" className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem({
                          product_id: p.id,
                          product_name: p.name,
                          unit_price: Number(p.price || 0),
                        })}
                        className="text-left p-2 border rounded-lg hover:bg-accent flex items-center gap-2"
                      >
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.currency} {Number(p.price || 0).toLocaleString()}</div>
                        </div>
                      </button>
                    ))}
                    {products.length === 0 && <div className="text-xs text-muted-foreground col-span-2 p-4 text-center">Sin productos en catálogo</div>}
                  </div>
                </TabsContent>

                <TabsContent value="free">
                  <Button size="sm" variant="outline" onClick={() => addItem({ product_name: '' })}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Agregar item libre
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Items list */}
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                    Agrega items desde las pestañas arriba
                  </div>
                )}
                {items.map(it => (
                  <Card key={it.key} className="p-2.5">
                    <div className="flex gap-2 items-start">
                      {it.story_thumb ? (
                        <img src={it.story_thumb} alt="" className="w-12 h-16 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-16 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nombre del producto"
                          value={it.product_name}
                          onChange={(e) => updateItem(it.key, { product_name: e.target.value })}
                          className="h-8 text-xs"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={it.brand || '__none__'}
                            onValueChange={(v) => updateItem(it.key, { brand: v === '__none__' ? undefined : v })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Marca" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">— Sin marca —</SelectItem>
                              {brandsCatalog.map(b => (
                                <SelectItem key={b.id} value={b.name} className="text-xs">{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={it.garment_type || '__none__'}
                            onValueChange={(v) => updateItem(it.key, { garment_type: v === '__none__' ? undefined : v })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo de prenda" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">— Sin tipo —</SelectItem>
                              {categoriesCatalog.map(c => (
                                <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Talla"
                            value={it.garment_size || ''}
                            onChange={(e) => updateItem(it.key, { garment_size: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Cantidad"
                            value={it.quantity}
                            onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) || 1 })}
                            className="h-8 text-xs"
                          />
                          <Input
                            type="number"
                            placeholder="Precio unit."
                            value={it.unit_price}
                            onChange={(e) => updateItem(it.key, { unit_price: Number(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(it.key)} className="h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-right text-xs text-muted-foreground mt-1">
                      Subtotal: {(it.unit_price * it.quantity).toLocaleString()}
                    </div>
                  </Card>
                ))}
                {items.length > 0 && (
                  <div className="text-right font-bold text-base">
                    Total: {currency} {total.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Payment + summary */}
          {step === 3 && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Método de pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">CRC</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <Card className="p-3 space-y-1.5 text-xs">
                <div className="font-semibold text-sm">Resumen</div>
                <div><strong>Cliente:</strong> {customerName} {customerPhone && `· ${customerPhone}`}</div>
                {shippingAddress && (
                  <div><strong>Envío:</strong> {shippingAddress.state}, {shippingAddress.city}, {shippingAddress.district} — {shippingAddress.address_line_1}</div>
                )}
                <div><strong>Items ({items.length}):</strong></div>
                <ul className="ml-4 space-y-0.5">
                  {items.map(i => (
                    <li key={i.key}>
                      {i.quantity}× {i.product_name} {i.garment_size && `(${i.garment_size})`} — {(i.unit_price * i.quantity).toLocaleString()}
                    </li>
                  ))}
                </ul>
                <div className="text-base font-bold pt-1 border-t">Total: {currency} {total.toLocaleString()}</div>
              </Card>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => step === 1 ? onOpenChange(false) : setStep((step - 1) as 1 | 2)}
            >
              {step === 1 ? 'Cancelar' : (<><ChevronLeft className="h-4 w-4 mr-1" />Atrás</>)}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((step + 1) as 2 | 3)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              >
                Siguiente<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createOrder.isPending}>
                {createOrder.isPending ? 'Creando...' : 'Crear orden'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CostaRicaAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        initial={shippingAddress}
        onSave={setShippingAddress}
      />

      <Dialog open={addressPickerOpen} onOpenChange={setAddressPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar dirección</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {savedAddresses.map((a, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setShippingAddress(a); setAddressPickerOpen(false); }}
                className={cn(
                  'w-full text-left p-3 rounded-lg text-xs bg-white text-neutral-900 transition-colors',
                  shippingAddress === a
                    ? 'border-2 border-orange-500'
                    : 'border border-neutral-200 hover:border-orange-400'
                )}
              >
                <div className="font-medium text-sm text-neutral-900">{a.label || `${a.state}, ${a.city}`}</div>
                <div className="text-neutral-600 mt-0.5">
                  {a.state}, {a.city}, {a.district}
                </div>
                <div className="text-neutral-600">{a.address_line_1}</div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAddressPickerOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setAddressPickerOpen(false); setAddressDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Crear nueva dirección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
