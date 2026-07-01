import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Tabs removed; charts moved to dedicated widgets
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ClipboardList, Phone, Inbox, DollarSign, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstantFormLead,
  useInstantFormLeads,
  useInstantFormLeadSource,
  useSyncInstantFormLeads,
  useUpdateInstantFormLeadStatus,
  useUpdateInstantFormLeadSeller,
  useClientSellers,
  useIsClientManager,
  InstantFormLeadStatus,
} from '@/hooks/use-instant-form-leads';
// recharts no longer needed here
import { InstantFormLeadDetailDialog } from './InstantFormLeadDetailDialog';
import { isInRange } from '@/lib/comfortex-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const STATUS_OPTIONS: { value: InstantFormLeadStatus | 'new'; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'venta', label: 'Venta' },
  { value: 'perdido', label: 'Perdido' },
];

const STATUS_STYLES: Record<string, { trigger: string; dot: string; chip: string }> = {
  new:          { trigger: 'border-[hsl(var(--status-new))]/50 bg-[hsl(var(--status-new))]/10 text-[hsl(var(--status-new))]', dot: 'bg-[hsl(var(--status-new))]', chip: 'bg-[hsl(var(--status-new))]/12 text-[hsl(var(--status-new))] ring-1 ring-[hsl(var(--status-new))]/30' },
  contactado:   { trigger: 'border-[hsl(var(--status-contactado))]/50 bg-[hsl(var(--status-contactado))]/12 text-[hsl(var(--status-contactado))]', dot: 'bg-[hsl(var(--status-contactado))]', chip: 'bg-[hsl(var(--status-contactado))]/15 text-[hsl(var(--status-contactado))] ring-1 ring-[hsl(var(--status-contactado))]/30' },
  seguimiento:  { trigger: 'border-[hsl(var(--status-seguimiento))]/50 bg-[hsl(var(--status-seguimiento))]/12 text-[hsl(var(--status-seguimiento))]', dot: 'bg-[hsl(var(--status-seguimiento))]', chip: 'bg-[hsl(var(--status-seguimiento))]/15 text-[hsl(var(--status-seguimiento))] ring-1 ring-[hsl(var(--status-seguimiento))]/30' },
  venta:        { trigger: 'border-[hsl(var(--status-venta))]/50 bg-[hsl(var(--status-venta))]/15 text-[hsl(var(--status-venta))]', dot: 'bg-[hsl(var(--status-venta))]', chip: 'bg-[hsl(var(--status-venta))]/18 text-[hsl(var(--status-venta))] ring-1 ring-[hsl(var(--status-venta))]/35' },
  perdido:      { trigger: 'border-[hsl(var(--status-perdido))]/50 bg-[hsl(var(--status-perdido))]/12 text-[hsl(var(--status-perdido))]', dot: 'bg-[hsl(var(--status-perdido))]', chip: 'bg-[hsl(var(--status-perdido))]/15 text-[hsl(var(--status-perdido))] ring-1 ring-[hsl(var(--status-perdido))]/30' },
};

const STATUS_FILTER = [{ value: 'all', label: 'Todos los estados' }, ...STATUS_OPTIONS];

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};


export const InstantFormLeadsWidget = ({ clientId }: Props) => {
  const { data: source } = useInstantFormLeadSource(clientId);
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const { data: sellers = [] } = useClientSellers(clientId);
  const isManager = useIsClientManager(clientId);
  const syncMutation = useSyncInstantFormLeads(clientId);
  const updateStatus = useUpdateInstantFormLeadStatus(clientId);
  const updateSeller = useUpdateInstantFormLeadSeller(clientId);

  const [rangeDays, setRangeDays] = useState('month');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedLead, setSelectedLead] = useState<InstantFormLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sellerMap = useMemo(() => {
    const m = new Map<string, string>();
    sellers.forEach((s) => m.set(s.user_id, s.full_name || s.email || 'Vendedor'));
    return m;
  }, [sellers]);

  const filtered = useMemo(() => {
    let result = leads.filter((l) => isInRange(l.created_time || l.created_at, rangeDays));
    if (statusFilter !== 'all') {
      result = result.filter((l) => (l.lead_status || 'new') === statusFilter);
    }
    return result;
  }, [leads, rangeDays, statusFilter]);




  const statusCounts = useMemo(() => {
    const c = { new: 0, contactado: 0, seguimiento: 0, venta: 0, perdido: 0 };
    filtered.forEach((l) => {
      const s = (l.lead_status || 'new') as keyof typeof c;
      if (s in c) c[s]++;
    });
    return c;
  }, [filtered]);

  const handleSync = async () => {
    try {
      const res = await syncMutation.mutateAsync();
      toast.success(`${res.synced} leads sincronizados`, {
        description: `${res.total} filas leídas${res.skipped ? `, ${res.skipped} omitidas` : ''}`,
      });
    } catch (e: any) {
      toast.error('Error al sincronizar', { description: e.message });
    }
  };

  const handleStatusChange = async (lead: InstantFormLead, status: InstantFormLeadStatus) => {
    try {
      await updateStatus.mutateAsync({ leadId: lead.id, status });
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  const handleSellerChange = async (lead: InstantFormLead, sellerId: string) => {
    try {
      await updateSeller.mutateAsync({ leadId: lead.id, sellerId: sellerId === '__none__' ? null : sellerId });
      toast.success('Vendedor actualizado');
    } catch (e: any) {
      toast.error('Solo managers pueden reasignar', { description: e.message });
    }
  };

  const openSale = (lead: InstantFormLead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  if (!source) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Leads del Instant Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
            <Inbox className="h-10 w-10" />
            <p className="text-sm">
              Aún no hay un Google Sheet configurado. Ve a <strong>Business Setup → Instant Form</strong> para conectarlo.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Leads del Instant Form
              <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
            {source.last_synced_at && (
              <p className="text-xs text-muted-foreground mt-1">Última sync: {formatDate(source.last_synced_at)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTER.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status summary chips */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <div className={`px-2.5 py-1 rounded-md ${STATUS_STYLES.new.chip}`}>Nuevos <span className="font-bold ml-1">{statusCounts.new}</span></div>
            <div className={`px-2.5 py-1 rounded-md ${STATUS_STYLES.contactado.chip}`}>Contactados <span className="font-bold ml-1">{statusCounts.contactado}</span></div>
            <div className={`px-2.5 py-1 rounded-md ${STATUS_STYLES.seguimiento.chip}`}>Seguimiento <span className="font-bold ml-1">{statusCounts.seguimiento}</span></div>
            <div className={`px-2.5 py-1 rounded-md ${STATUS_STYLES.venta.chip}`}>Ventas <span className="font-bold ml-1">{statusCounts.venta}</span></div>
            {statusCounts.perdido > 0 && (
              <div className={`px-2.5 py-1 rounded-md ${STATUS_STYLES.perdido.chip}`}>Perdidos <span className="font-bold ml-1">{statusCounts.perdido}</span></div>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sin leads en este rango.</div>
          ) : (
            <div className="rounded-md border divide-y max-h-[560px] overflow-y-auto">
              {filtered.slice(0, 500).map((l) => {
                const status = (l.lead_status || 'new') as InstantFormLeadStatus;
                const sellerLabel = l.assigned_seller_id ? sellerMap.get(l.assigned_seller_id) || 'Vendedor' : 'Sin asignar';
                return (
                  <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                    <button
                      type="button"
                      onClick={() => openSale(l)}
                      className="flex-1 min-w-0 text-left rounded-md -mx-1 px-1 py-0.5 transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group"
                      title="Ver detalles del lead"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate group-hover:text-primary group-hover:underline underline-offset-2 decoration-dotted">
                          {l.full_name || 'Sin nombre'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{formatDate(l.created_time || l.created_at)}</span>
                        {l.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {l.phone}
                          </span>
                        )}
                        {l.campaign_name && (
                          <span className="truncate max-w-[180px]" title={l.campaign_name}>· {l.campaign_name}</span>
                        )}
                      </div>
                    </button>


                    {/* Seller */}
                    <div className="hidden md:block w-[160px] shrink-0">
                      {isManager ? (
                        <Select
                          value={l.assigned_seller_id || '__none__'}
                          onValueChange={(v) => handleSellerChange(l, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin asignar</SelectItem>
                            {sellers.map((s) => (
                              <SelectItem key={s.user_id} value={s.user_id}>
                                {s.full_name || s.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate" title={sellerLabel}>
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{sellerLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Status dropdown */}
                    <Select value={status} onValueChange={(v) => handleStatusChange(l, v as InstantFormLeadStatus)}>
                      <SelectTrigger className={`h-8 w-[140px] text-xs shrink-0 font-semibold ${STATUS_STYLES[status]?.trigger || ''}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${STATUS_STYLES[status]?.dot || 'bg-muted-foreground'}`} />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[s.value]?.dot}`} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sale button */}
                    <Button
                      size="sm"
                      variant={l.message_sale_id ? 'outline' : 'default'}
                      onClick={() => openSale(l)}
                      className={`shrink-0 ${l.message_sale_id ? 'border-[hsl(var(--success))]/60 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10' : 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white'}`}
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      {l.message_sale_id ? 'Vendido' : 'Venta'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      <InstantFormLeadDetailDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
      />
    </>
  );
};
