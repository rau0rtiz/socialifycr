import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, MapPin, Shirt, ShoppingBag, Calendar, DollarSign, Image as ImageIcon, IdCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CustomerContact, CustomerAddress } from '@/hooks/use-customer-contacts';

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

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: currency || 'CRC', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

export const CustomerDetailDialog = ({ customer, clientId, open, onOpenChange }: Props) => {
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

  if (!customer) return null;

  const addresses = (customer.addresses || []) as CustomerAddress[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-lg">{customer.full_name}</DialogTitle>
          <DialogDescription className="text-xs">
            Cliente desde {format(new Date(customer.created_at), "d 'de' MMMM yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 py-4 space-y-5">
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

            {/* Direcciones */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Direcciones {addresses.length > 0 && <span className="text-muted-foreground/70">({addresses.length})</span>}
              </h3>
              {addresses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin direcciones registradas</p>
              ) : (
                <div className="space-y-2">
                  {addresses.map((a, i) => (
                    <div key={i} className="rounded-md border bg-muted/20 p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="text-sm flex-1">
                          {a.label && <p className="text-[11px] font-semibold text-primary mb-0.5">{a.label}</p>}
                          <p>{a.address_line_1}</p>
                          {a.address_line_2 && <p className="text-xs text-muted-foreground">{a.address_line_2}</p>}
                          <p className="text-xs text-muted-foreground">
                            {[a.district, a.city, a.state, a.country].filter(Boolean).join(', ')}
                            {a.post_code ? ` · ${a.post_code}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Compras */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
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
                          {/* Story thumbnail if present */}
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
            </section>

            {customer.notes && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notas</h3>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
