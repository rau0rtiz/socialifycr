import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ClipboardList, Phone, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstantFormLeads,
  useInstantFormLeadSource,
  useSyncInstantFormLeads,
} from '@/hooks/use-instant-form-leads';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
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
    // Costa Rica day (UTC-6)
    const tz = new Date(d.getTime() - 6 * 60 * 60 * 1000);
    return tz.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

export const InstantFormLeadsWidget = ({ clientId }: Props) => {
  const { data: source } = useInstantFormLeadSource(clientId);
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const syncMutation = useSyncInstantFormLeads(clientId);

  const [rangeDays, setRangeDays] = useState('30');
  const [breakdownBy, setBreakdownBy] = useState<'campaign_name' | 'adset_name' | 'ad_name'>('campaign_name');

  const filtered = useMemo(() => {
    if (rangeDays === 'all') return leads;
    const days = parseInt(rangeDays, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return leads.filter((l) => {
      const ts = l.created_time || l.created_at;
      if (!ts) return false;
      return new Date(ts).getTime() >= cutoff;
    });
  }, [leads, rangeDays]);

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
      const k = dayKey(l.created_time);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Leads del Instant Form
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
          {source.last_synced_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronización: {formatDate(source.last_synced_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Tabla</TabsTrigger>
            <TabsTrigger value="utm">Por campaña</TabsTrigger>
            <TabsTrigger value="chart">Por día</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sin leads en este rango.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Campaña</TableHead>
                      <TableHead>Anuncio</TableHead>
                      <TableHead>Respuestas</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 500).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(l.created_time)}</TableCell>
                        <TableCell className="font-medium">{l.full_name || '—'}</TableCell>
                        <TableCell>
                          {l.phone ? (
                            <a
                              href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs inline-flex items-center gap-1 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {l.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={l.campaign_name || ''}>
                          {l.campaign_name || '—'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={l.ad_name || ''}>
                          {l.ad_name || '—'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[280px]">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(l.custom_answers || {})
                              .filter(([, v]) => v !== '' && v != null)
                              .slice(0, 4)
                              .map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[10px] font-normal">
                                  <span className="text-muted-foreground mr-1">{k.replace(/_/g, ' ')}:</span>
                                  {String(v).slice(0, 40)}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{l.lead_status || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="utm" className="mt-4">
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
              <div className="space-y-2">
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
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chart" className="mt-4">
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
  );
};
