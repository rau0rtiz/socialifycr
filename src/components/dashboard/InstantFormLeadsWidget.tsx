import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ClipboardList, Phone, Inbox, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstantFormLead,
  useInstantFormLeads,
  useInstantFormLeadSource,
  useSyncInstantFormLeads,
} from '@/hooks/use-instant-form-leads';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { InstantFormLeadDetailDialog } from './InstantFormLeadDetailDialog';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'new', label: 'Nuevos' },
  { value: 'contactado', label: 'Contactados' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'venta', label: 'Venta' },
];

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

const dayKey = (iso: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const tz = new Date(d.getTime() - 6 * 60 * 60 * 1000);
    return tz.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const statusBadgeVariant = (status: string | null): 'default' | 'secondary' | 'outline' => {
  if (status === 'venta') return 'default';
  if (status === 'contactado' || status === 'seguimiento') return 'secondary';
  return 'outline';
};

const statusLabel = (status: string | null) => {
  if (!status) return 'Nuevo';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const InstantFormLeadsWidget = ({ clientId }: Props) => {
  const { data: source } = useInstantFormLeadSource(clientId);
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const syncMutation = useSyncInstantFormLeads(clientId);

  const [rangeDays, setRangeDays] = useState('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [breakdownBy, setBreakdownBy] = useState<'campaign_name' | 'adset_name' | 'ad_name'>('campaign_name');
  const [selectedLead, setSelectedLead] = useState<InstantFormLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = leads;
    if (rangeDays !== 'all') {
      if (rangeDays === 'month') {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        result = result.filter((l) => {
          const ts = l.created_time || l.created_at;
          return ts ? new Date(ts).getTime() >= firstOfMonth : false;
        });
      } else {
        const days = parseInt(rangeDays, 10);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        result = result.filter((l) => {
          const ts = l.created_time || l.created_at;
          return ts ? new Date(ts).getTime() >= cutoff : false;
        });
      }
    }
    if (statusFilter !== 'all') {
      result = result.filter((l) => (l.lead_status || 'new') === statusFilter);
    }
    return result;
  }, [leads, rangeDays, statusFilter]);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((l) => {
      const key = (l as any)[breakdownBy] || '(sin asignar)';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = filtered.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, breakdownBy]);

  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((l) => {
      const k = dayKey(l.created_time || l.created_at);
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('es-CR', {
          day: '2-digit',
          month: 'short',
        }),
        leads: count,
      }));
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const c = { new: 0, contactado: 0, seguimiento: 0, venta: 0 };
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

  const openLead = (lead: InstantFormLead) => {
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
              <p className="text-xs text-muted-foreground mt-1">
                Última sync: {formatDate(source.last_synced_at)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
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
            <div className="px-2.5 py-1 rounded-md bg-muted/50">
              Nuevos <span className="font-semibold ml-1">{statusCounts.new}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-muted/50">
              Contactados <span className="font-semibold ml-1">{statusCounts.contactado}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-muted/50">
              Seguimiento <span className="font-semibold ml-1">{statusCounts.seguimiento}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-primary/10 text-primary">
              Ventas <span className="font-semibold ml-1">{statusCounts.venta}</span>
            </div>
          </div>

          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="utm">Por campaña</TabsTrigger>
              <TabsTrigger value="chart">Por día</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-3">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sin leads en este rango.</div>
              ) : (
                <div className="rounded-md border divide-y max-h-[520px] overflow-y-auto">
                  {filtered.slice(0, 500).map((l) => {
                    const cleanPhone = (l.phone || '').replace(/\D/g, '');
                    return (
                      <button
                        key={l.id}
                        onClick={() => openLead(l)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{l.full_name || 'Sin nombre'}</span>
                            <Badge variant={statusBadgeVariant(l.lead_status)} className="text-[10px] capitalize">
                              {statusLabel(l.lead_status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{formatDate(l.created_time || l.created_at)}</span>
                            {l.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {l.phone}
                              </span>
                            )}
                            {l.campaign_name && (
                              <span className="truncate max-w-[200px]" title={l.campaign_name}>
                                · {l.campaign_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="utm" className="mt-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Agrupar por:</span>
                <Select value={breakdownBy} onValueChange={(v) => setBreakdownBy(v as any)}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign_name">Campaña</SelectItem>
                    <SelectItem value="adset_name">Conjunto (adset)</SelectItem>
                    <SelectItem value="ad_name">Anuncio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {breakdown.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sin datos.</div>
              ) : (
                <div className="space-y-2 max-h-[440px] overflow-y-auto">
                  {breakdown.map((b) => (
                    <div key={b.name} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate" title={b.name}>{b.name}</span>
                          <span className="text-muted-foreground tabular-nums ml-2">
                            {b.count} · {b.pct}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-primary" style={{ width: `${b.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="chart" className="mt-3">
              {chartData.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sin datos.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
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
