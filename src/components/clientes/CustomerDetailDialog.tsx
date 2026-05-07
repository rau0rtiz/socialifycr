import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Phone, Mail, MapPin, Shirt, ShoppingBag, Calendar, DollarSign, Image as ImageIcon, IdCard, Plus, Pencil, Trash2, Download, Truck, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CustomerContact, CustomerAddress } from '@/hooks/use-customer-contacts';
import { CostaRicaAddressDialog } from '@/components/common/CostaRicaAddressDialog';
import { toast } from 'sonner';

interface Props {
  customer: CustomerContact | null;
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PurchaseRow {
  id: string;
  sale_date: string;
  amount: number;
  currency: string;
  product: string | null;
  brand: string | null;
  garment_size: string | null;
  payment_method: string | null;
  story_id: string | null;
  notes: string | null;
}

interface StoryRow {
  story_id: string;
  permalink: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  media_type: string | null;
  timestamp: string;
}

interface OrderRow {
  id: string;
  order_date: string;
  status: string;
  currency: string;
  total_amount: number;
  payment_method: string | null;
  shipping_address: CustomerAddress | null;
  notes: string | null;
  items: Array<{ id: string; product_name: string | null; quantity: number; unit_price: number; subtotal: number; garment_size: string | null }>;
}

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: currency || 'CRC', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const formatAddressOneLine = (a: CustomerAddress) =>
  [a.address_line_1, a.district, a.city, a.state, a.country, a.post_code].filter(Boolean).join(', ');

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  shipped: 'Enviada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  paid: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
};

export const CustomerDetailDialog = ({ customer, clientId, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [deleteAddressIdx, setDeleteAddressIdx] = useState<number | null>(null);

  // Fetch purchases from message_sales matching this customer (by phone or name)
  const { data: purchases = [] } = useQuery<PurchaseRow[]>({
    queryKey: ['customer-purchases', clientId, customer?.id, customer?.phone, customer?.full_name],
    queryFn: async () => {
      if (!clientId || !customer) return [];
      let query = supabase
        .from('message_sales')
        .select('id, sale_date, amount, currency, product, brand, garment_size, payment_method, story_id, notes, customer_name, customer_phone')
        .eq('client_id', clientId);
      if (customer.phone) {
        query = query.eq('customer_phone', customer.phone);
      } else {
        query = query.eq('customer_name', customer.full_name);
      }
      const { data, error } = await query.order('sale_date', { ascending: false });
      if (error) throw error;
      return (data || []) as PurchaseRow[];
    },
    enabled: !!clientId && !!customer && open,
    staleTime: 60_000,
  });

  // Fetch orders for this customer
  const { data: orders = [] } = useQuery<OrderRow[]>({
    queryKey: ['customer-orders', clientId, customer?.id, customer?.phone, customer?.full_name],
    queryFn: async () => {
      if (!clientId || !customer) return [];
      let q = supabase
        .from('orders' as any)
        .select('id, order_date, status, currency, total_amount, payment_method, shipping_address, notes, customer_contact_id, customer_phone, customer_name, items:order_items(id, product_name, quantity, unit_price, subtotal, garment_size)')
        .eq('client_id', clientId);
      // Match by contact id OR phone OR name
      const ors: string[] = [`customer_contact_id.eq.${customer.id}`];
      if (customer.phone) ors.push(`customer_phone.eq.${customer.phone}`);
      ors.push(`customer_name.eq.${customer.full_name}`);
      q = q.or(ors.join(','));
      const { data, error } = await q.order('order_date', { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as unknown as OrderRow[];
    },
    enabled: !!clientId && !!customer && open,
    staleTime: 30_000,
  });

  const storyIds = useMemo(() => Array.from(new Set(purchases.map(p => p.story_id).filter(Boolean) as string[])), [purchases]);

  const { data: stories = [] } = useQuery<StoryRow[]>({
    queryKey: ['customer-purchase-stories', clientId, storyIds],
    queryFn: async () => {
      if (!clientId || storyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('archived_stories')
        .select('story_id, permalink, thumbnail_url, media_url, media_type, timestamp')
        .eq('client_id', clientId)
        .in('story_id', storyIds);
      if (error) throw error;
      return (data || []) as StoryRow[];
    },
    enabled: !!clientId && storyIds.length > 0 && open,
    staleTime: 60_000,
  });

  const storyById = useMemo(() => {
    const m = new Map<string, StoryRow>();
    for (const s of stories) m.set(s.story_id, s);
    return m;
  }, [stories]);

  const totalSpent = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const p of purchases) {
      byCurrency[p.currency] = (byCurrency[p.currency] || 0) + Number(p.amount || 0);
    }
    return byCurrency;
  }, [purchases]);

  // ── Address CRUD ──
  const saveAddresses = useMutation({
    mutationFn: async (next: CustomerAddress[]) => {
      if (!customer) throw new Error('No customer');
      const { error } = await supabase
        .from('customer_contacts' as any)
        .update({ addresses: next } as any)
        .eq('id', customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
      toast.success('Direcciones actualizadas');
    },
    onError: (e: any) => toast.error(e?.message || 'Error al guardar dirección'),
  });

  const handleSaveAddress = (a: CustomerAddress) => {
    if (!customer) return;
    const current = (customer.addresses || []).slice();
    if (editingAddressIdx !== null) {
      current[editingAddressIdx] = a;
    } else {
      current.push(a);
    }
    saveAddresses.mutate(current);
    setAddressDialogOpen(false);
    setEditingAddressIdx(null);
  };

  const handleDeleteAddress = () => {
    if (!customer || deleteAddressIdx === null) return;
    const current = (customer.addresses || []).slice();
    current.splice(deleteAddressIdx, 1);
    saveAddresses.mutate(current);
    setDeleteAddressIdx(null);
  };

  const handleCopyAddress = async (a: CustomerAddress) => {
    try {
      await navigator.clipboard.writeText(formatAddressOneLine(a));
      toast.success('Dirección copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleExportOrders = () => {
    if (!customer || orders.length === 0) {
      toast.info('No hay órdenes para exportar');
      return;
    }
    const headers = ['Fecha', 'Estado', 'Total', 'Moneda', 'Método de pago', 'Productos', 'Dirección de envío', 'Notas'];
    const rows = orders.map(o => [
      o.order_date,
      STATUS_LABEL[o.status] || o.status,
      String(o.total_amount),
      o.currency,
      o.payment_method || '',
      (o.items || []).map(it => `${it.quantity}x ${it.product_name || ''}${it.garment_size ? ` (${it.garment_size})` : ''}`).join(' | '),
      o.shipping_address ? formatAddressOneLine(o.shipping_address) : '',
      (o.notes || '').replace(/\n/g, ' '),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordenes-${customer.full_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!customer) return null;
  const addresses = (customer.addresses || []) as CustomerAddress[];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="text-lg">{customer.full_name}</DialogTitle>
            <DialogDescription className="text-xs">
              Cliente desde {format(new Date(customer.created_at), "d 'de' MMMM yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <div className="px-6 pt-3 border-b">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="orders">
                  Órdenes {orders.length > 0 && <span className="ml-1 text-[10px] opacity-70">({orders.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="purchases">Compras</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="max-h-[70vh]">
              {/* ─────────── INFO ─────────── */}
              <TabsContent value="info" className="px-6 py-4 space-y-5 mt-0">
                {/* Resumen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Compras</p>
                    <p className="text-xl font-bold mt-0.5">{customer.total_purchases || 0}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Última compra</p>
                    <p className="text-xs font-semibold mt-1">
                      {customer.last_purchase_at
                        ? format(new Date(customer.last_purchase_at), "d MMM yyyy", { locale: es })
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 col-span-2">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Total invertido</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.keys(totalSpent).length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        Object.entries(totalSpent).map(([cur, amt]) => (
                          <Badge key={cur} variant="secondary" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatMoney(amt, cur)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contacto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{customer.phone || <span className="text-muted-foreground">Sin teléfono</span>}</div>
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{customer.email || <span className="text-muted-foreground">Sin email</span>}</div>
                    <div className="flex items-center gap-2"><IdCard className="h-3.5 w-3.5 text-muted-foreground" />{customer.id_number || <span className="text-muted-foreground">Sin cédula</span>}</div>
                  </div>
                </section>

                {/* Tallas y marcas preferidas */}
                {((customer.garment_sizes || []).length > 0 || (customer.preferred_brands || []).length > 0) && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Preferencias</h3>
                    {(customer.garment_sizes || []).length > 0 && (
                      <div className="mb-2">
                        <p className="text-[11px] text-muted-foreground mb-1">Tallas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(customer.garment_sizes || []).map((sz, i) => (
                            <Badge key={i} variant="outline" className="text-xs gap-1"><Shirt className="h-3 w-3" />{sz}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(customer.preferred_brands || []).length > 0 && (
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">Marcas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(customer.preferred_brands || []).map((b, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Direcciones con CRUD */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Direcciones {addresses.length > 0 && <span className="text-muted-foreground/70">({addresses.length})</span>}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => { setEditingAddressIdx(null); setAddressDialogOpen(true); }}
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin direcciones registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {addresses.map((a, i) => (
                        <div key={i} className="rounded-md border bg-muted/20 p-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-sm flex-1 min-w-0">
                              {a.label && <p className="text-[11px] font-semibold text-primary mb-0.5">{a.label}</p>}
                              <p className="break-words">{a.address_line_1}</p>
                              {a.address_line_2 && <p className="text-xs text-muted-foreground break-words">{a.address_line_2}</p>}
                              <p className="text-xs text-muted-foreground">
                                {[a.district, a.city, a.state, a.country].filter(Boolean).join(', ')}
                                {a.post_code ? ` · ${a.post_code}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" title="Copiar"
                                onClick={() => handleCopyAddress(a)}>
                                <Truck className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" title="Editar"
                                onClick={() => { setEditingAddressIdx(i); setAddressDialogOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="Eliminar"
                                onClick={() => setDeleteAddressIdx(i)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {customer.notes && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notas</h3>
                    <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                  </section>
                )}
              </TabsContent>

              {/* ─────────── ÓRDENES ─────────── */}
              <TabsContent value="orders" className="px-6 py-4 space-y-3 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Órdenes {orders.length > 0 && <span className="text-muted-foreground/70">({orders.length})</span>}
                  </h3>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleExportOrders} disabled={orders.length === 0}>
                    <Download className="h-3 w-3" />
                    Exportar CSV
                  </Button>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-md">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No hay órdenes registradas para este cliente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.id} className="rounded-md border bg-card p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(o.order_date), "d MMM yyyy", { locale: es })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[o.status] || 'secondary'} className="text-[10px]">
                              {STATUS_LABEL[o.status] || o.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-semibold">
                              {formatMoney(Number(o.total_amount || 0), o.currency)}
                            </Badge>
                          </div>
                        </div>
                        {(o.items || []).length > 0 && (
                          <ul className="text-sm space-y-0.5 mb-2">
                            {o.items.map(it => (
                              <li key={it.id} className="flex items-center gap-1.5">
                                <ShoppingBag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span>{it.quantity}x {it.product_name || 'Producto'}</span>
                                {it.garment_size && <Badge variant="outline" className="text-[10px]">{it.garment_size}</Badge>}
                              </li>
                            ))}
                          </ul>
                        )}
                        {o.shipping_address && (
                          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-dashed">
                            <Truck className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-[11px] text-muted-foreground flex-1 break-words">
                              {formatAddressOneLine(o.shipping_address)}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              title="Copiar dirección"
                              onClick={() => handleCopyAddress(o.shipping_address!)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {o.payment_method && (
                          <p className="text-[11px] text-muted-foreground mt-1">Pago: {o.payment_method}</p>
                        )}
                        {o.notes && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{o.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ─────────── COMPRAS (sales legacy) ─────────── */}
              <TabsContent value="purchases" className="px-6 py-4 space-y-3 mt-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial de compras {purchases.length > 0 && <span className="text-muted-foreground/70">({purchases.length})</span>}
                </h3>
                {purchases.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay compras registradas para este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {purchases.map(p => {
                      const story = p.story_id ? storyById.get(p.story_id) : null;
                      return (
                        <div key={p.id} className="rounded-md border bg-card p-3">
                          <div className="flex gap-3">
                            {story && (
                              <a
                                href={story.permalink || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted relative group"
                                onClick={(e) => { if (!story.permalink) e.preventDefault(); }}
                              >
                                {story.thumbnail_url || story.media_url ? (
                                  <img
                                    src={story.thumbnail_url || story.media_url || ''}
                                    alt="story"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                              </a>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(p.sale_date), "d MMM yyyy", { locale: es })}
                                </div>
                                <Badge variant="secondary" className="text-xs font-semibold">
                                  {formatMoney(Number(p.amount || 0), p.currency)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center text-sm">
                                {p.product && <span className="font-medium flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{p.product}</span>}
                                {p.brand && <Badge variant="outline" className="text-[10px]">{p.brand}</Badge>}
                                {p.garment_size && (
                                  <Badge variant="outline" className="text-[10px] gap-1"><Shirt className="h-2.5 w-2.5" />{p.garment_size}</Badge>
                                )}
                              </div>
                              {p.payment_method && (
                                <p className="text-[11px] text-muted-foreground mt-1">Pago: {p.payment_method}</p>
                              )}
                              {p.notes && (
                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CostaRicaAddressDialog
        open={addressDialogOpen}
        onOpenChange={(v) => { setAddressDialogOpen(v); if (!v) setEditingAddressIdx(null); }}
        initial={editingAddressIdx !== null ? addresses[editingAddressIdx] : null}
        onSave={handleSaveAddress}
      />

      <AlertDialog open={deleteAddressIdx !== null} onOpenChange={(open) => !open && setDeleteAddressIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar dirección</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. La dirección se eliminará del perfil del cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
