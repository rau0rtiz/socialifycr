import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Phone, Mail, DollarSign, FileText, ChevronDown, MessageCircle, Megaphone, ShoppingBag, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  leadName: string | null;
  leadPhone: string | null;
  leadEmail?: string | null;
}

interface FormRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  form_name: string | null;
  platform: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  created_time: string | null;
  created_at: string;
  custom_answers: Record<string, any>;
}

interface SaleRow {
  id: string;
  sale_date: string;
  amount: number;
  currency: string;
  product: string | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
}

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: currency || 'CRC', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const prettyKey = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const channelLabel = (platform: string | null | undefined) => {
  if (!platform) return 'Desconocido';
  const p = platform.toLowerCase();
  if (p.includes('fb') || p.includes('facebook')) return 'Facebook Lead Ad';
  if (p.includes('ig') || p.includes('instagram')) return 'Instagram Lead Ad';
  if (p.includes('tt') || p.includes('tiktok')) return 'TikTok Lead';
  return platform;
};

export const LeadContactDetailDialog = ({ open, onOpenChange, clientId, leadName, leadPhone, leadEmail }: Props) => {
  const [expandedForm, setExpandedForm] = useState<string | null>(null);

  const { data: forms = [], isLoading: formsLoading } = useQuery<FormRow[]>({
    queryKey: ['lead-contact-forms', clientId, leadPhone, leadName],
    queryFn: async () => {
      if (!clientId) return [];
      let q = supabase
        .from('instant_form_leads' as any)
        .select('id, full_name, phone, form_name, platform, campaign_name, adset_name, ad_name, created_time, created_at, custom_answers')
        .eq('client_id', clientId);
      const ors: string[] = [];
      if (leadPhone) ors.push(`phone.eq.${leadPhone}`);
      if (leadName) ors.push(`full_name.eq.${leadName}`);
      if (ors.length === 0) return [];
      q = q.or(ors.join(','));
      const { data, error } = await q.order('created_time', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as unknown as FormRow[];
    },
    enabled: open && !!clientId && (!!leadPhone || !!leadName),
    staleTime: 60_000,
  });

  const { data: sales = [] } = useQuery<SaleRow[]>({
    queryKey: ['lead-contact-sales', clientId, leadPhone, leadName],
    queryFn: async () => {
      if (!clientId) return [];
      let q = supabase
        .from('message_sales')
        .select('id, sale_date, amount, currency, product, status, payment_method, notes')
        .eq('client_id', clientId);
      if (leadPhone) {
        q = q.eq('customer_phone', leadPhone);
      } else if (leadName) {
        q = q.eq('customer_name', leadName);
      }
      const { data, error } = await q.order('sale_date', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as SaleRow[];
    },
    enabled: open && !!clientId && (!!leadPhone || !!leadName),
    staleTime: 60_000,
  });

  const totalByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sales) {
      if ((s.status || '') === 'cancelled') continue;
      m[s.currency || 'CRC'] = (m[s.currency || 'CRC'] || 0) + Number(s.amount || 0);
    }
    return m;
  }, [sales]);

  const firstForm = forms[forms.length - 1]; // oldest = acquisition
  const acquisitionPlatform = firstForm?.platform || forms[0]?.platform || null;
  const acquisitionCampaign = firstForm?.campaign_name || forms[0]?.campaign_name || null;
  const cleanPhone = (leadPhone || '').replace(/\D/g, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-lg">{leadName || 'Lead'}</DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-3 flex-wrap">
            {leadPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{leadPhone}</span>}
            {leadEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{leadEmail}</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <div className="px-6 pt-3 border-b">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="forms">
                Formularios {forms.length > 0 && <span className="ml-1 text-[10px] opacity-70">({forms.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="purchases">
                Compras {sales.length > 0 && <span className="ml-1 text-[10px] opacity-70">({sales.length})</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[70vh]">
            {/* INFO */}
            <TabsContent value="info" className="px-6 py-4 space-y-5 mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Compras totales</p>
                  <p className="text-xl font-bold mt-0.5">{sales.filter(s => (s.status || '') !== 'cancelled').length}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Monto total invertido</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.keys(totalByCurrency).length === 0 ? (
                      <p className="text-xs text-muted-foreground">—</p>
                    ) : (
                      Object.entries(totalByCurrency).map(([cur, amt]) => (
                        <Badge key={cur} variant="secondary" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatMoney(amt, cur)}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{leadPhone || <span className="text-muted-foreground">Sin teléfono</span>}</div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{leadEmail || <span className="text-muted-foreground">Sin email</span>}</div>
                </div>
                {cleanPhone && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { window.location.href = `tel:${cleanPhone}`; }}>
                      <Phone className="h-3.5 w-3.5" /> Llamar
                    </Button>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" /> Canal de adquisición
                </h3>
                {acquisitionPlatform || acquisitionCampaign ? (
                  <div className="rounded-md border bg-muted/20 p-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{channelLabel(acquisitionPlatform)}</Badge>
                      {firstForm?.created_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(firstForm.created_time), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                    {acquisitionCampaign && <p className="text-xs"><span className="text-muted-foreground">Campaña:</span> {acquisitionCampaign}</p>}
                    {firstForm?.adset_name && <p className="text-xs"><span className="text-muted-foreground">Adset:</span> {firstForm.adset_name}</p>}
                    {firstForm?.ad_name && <p className="text-xs"><span className="text-muted-foreground">Anuncio:</span> {firstForm.ad_name}</p>}
                    {firstForm?.form_name && <p className="text-xs"><span className="text-muted-foreground">Formulario:</span> {firstForm.form_name}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin datos de adquisición</p>
                )}
              </section>
            </TabsContent>

            {/* FORMS */}
            <TabsContent value="forms" className="px-6 py-4 space-y-2 mt-0">
              {formsLoading ? (
                <p className="text-xs text-muted-foreground">Cargando…</p>
              ) : forms.length === 0 ? (
                <p className="text-xs text-muted-foreground">No ha llenado formularios.</p>
              ) : forms.map(f => {
                const isOpen = expandedForm === f.id;
                const entries = Object.entries(f.custom_answers || {});
                return (
                  <Collapsible key={f.id} open={isOpen} onOpenChange={(o) => setExpandedForm(o ? f.id : null)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left rounded-md border bg-card hover:bg-muted/40 p-3 flex items-start justify-between gap-3 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{f.form_name || 'Formulario'}</span>
                            <Badge variant="outline" className="text-[10px]">{channelLabel(f.platform)}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            {f.created_time && <span>{format(new Date(f.created_time), "d MMM yyyy HH:mm", { locale: es })}</span>}
                            {f.campaign_name && <span className="truncate">· {f.campaign_name}</span>}
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="rounded-md border-x border-b bg-muted/10 p-3 -mt-px space-y-1.5">
                        {entries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin respuestas registradas.</p>
                        ) : entries.map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[140px_1fr] gap-2 text-xs">
                            <span className="text-muted-foreground">{prettyKey(k)}</span>
                            <span className="break-words">{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</span>
                          </div>
                        ))}
                        {(f.ad_name || f.adset_name) && (
                          <div className="pt-2 mt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-0.5">
                            {f.adset_name && <p>Adset: {f.adset_name}</p>}
                            {f.ad_name && <p>Anuncio: {f.ad_name}</p>}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TabsContent>

            {/* PURCHASES */}
            <TabsContent value="purchases" className="px-6 py-4 space-y-2 mt-0">
              {sales.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin compras registradas.</p>
              ) : sales.map(s => (
                <div key={s.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{s.product || 'Compra'}</span>
                        {s.status && <Badge variant="outline" className="text-[10px]">{s.status}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(s.sale_date), "d MMM yyyy", { locale: es })}
                        {s.payment_method ? ` · ${s.payment_method}` : ''}
                      </p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.notes}</p>}
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">{formatMoney(Number(s.amount || 0), s.currency || 'CRC')}</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
