import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHURN_REASONS = [
  'Aumentamos precio y no accedió',
  'Pocos resultados',
  'Muy caro',
  'No contestó para reagendar',
  'Cierra operaciones / cierra el negocio',
  'Cambio de proveedor / agencia',
  'Decidió manejarlo internamente',
  'Falta de presupuesto',
  'Pausa temporal indefinida',
  'Mala comunicación / no fit',
  'Expectativas no alineadas',
  'Otro',
] as const;
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AgencyContract,
  CustomerSummary,
  computeCustomerSummaries,
  computeInvoiceMrrTimeline,
  useAgencyContracts,
  useAgencyInvoices,
  useMarkDiscontinued,
  useReactivateCustomer,
} from '@/hooks/use-agency-finances';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, UserMinus, RotateCcw, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const GREEN = 'hsl(142, 71%, 45%)';

const AgencyFinances = () => {
  const { data: invoices = [], isLoading: loadingInv } = useAgencyInvoices();
  const { data: contracts = [] } = useAgencyContracts();
  const markDisc = useMarkDiscontinued();
  const reactivate = useReactivateCustomer();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'discontinued'>('all');
  const [discDialog, setDiscDialog] = useState<CustomerSummary | null>(null);
  const [discReasonType, setDiscReasonType] = useState<string>('');
  const [discReason, setDiscReason] = useState('');

  // Map of discontinued customers from contracts table
  const discontinuedMap = useMemo(() => {
    const m = new Map<string, { reason: string | null; at: string }>();
    contracts.forEach(c => {
      if (c.status === 'discontinued' && c.customer_name) {
        m.set(c.customer_name.toLowerCase(), { reason: c.discontinued_reason, at: c.discontinued_at || '' });
      }
    });
    return m;
  }, [contracts]);

  const customers = useMemo(
    () => computeCustomerSummaries(invoices, discontinuedMap),
    [invoices, discontinuedMap]
  );

  const timeline = useMemo(() => computeInvoiceMrrTimeline(invoices, 12), [invoices]);

  const totals = useMemo(() => {
    const active = customers.filter(c => c.status === 'active');
    const inactive = customers.filter(c => c.status === 'inactive');
    const discontinued = customers.filter(c => c.status === 'discontinued');
    const totalRevenue = customers.reduce((s, c) => s + c.total_revenue, 0);
    const currentMrr = active.reduce((s, c) => s + c.avg_monthly, 0);
    const lastMonth = timeline[timeline.length - 1]?.revenue ?? 0;
    const prevMonth = timeline[timeline.length - 2]?.revenue ?? 0;
    const growth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
    const churnRate = customers.length > 0 ? ((inactive.length + discontinued.length) / customers.length) * 100 : 0;
    return { active, inactive, discontinued, totalRevenue, currentMrr, growth, churnRate, lastMonth };
  }, [customers, timeline]);

  const filtered = useMemo(() => {
    return customers
      .filter(c => filter === 'all' || c.status === filter)
      .filter(c => !search || c.customer_name.toLowerCase().includes(search.toLowerCase()));
  }, [customers, filter, search]);

  const handleConfirmDiscontinue = () => {
    if (!discDialog) return;
    markDisc.mutate(
      { customer_name: discDialog.customer_name, client_id: discDialog.client_id, reason: discReason },
      { onSuccess: () => { setDiscDialog(null); setDiscReason(''); } }
    );
  };

  const statusBadge = (s: CustomerSummary['status'], days: number) => {
    if (s === 'discontinued') return <Badge variant="destructive">No continúa</Badge>;
    if (s === 'inactive') return <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Churn ({Math.floor(days/30)}m sin facturar)</Badge>;
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Activo</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finanzas Agencia</h1>
            <p className="text-muted-foreground">MRR, churn y LTV por cliente — basado en facturas Zoho</p>
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtUsd(totals.currentMrr)}</div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${totals.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totals.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {fmtPct(Math.abs(totals.growth))} vs mes anterior
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.active.length}</div>
              <div className="text-xs text-muted-foreground mt-1">facturaron en últimos 6 meses</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Churn rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtPct(totals.churnRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">{totals.inactive.length} inactivos · {totals.discontinued.length} confirmados</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtUsd(totals.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{invoices.length} facturas históricas</div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue facturado (12 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} />
                <Line type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customers table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Clientes ({filtered.length})</CardTitle>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="active">Activos</TabsTrigger>
                    <TabsTrigger value="inactive">Churn</TabsTrigger>
                    <TabsTrigger value="discontinued">No continúan</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInv ? (
              <p className="text-sm text-muted-foreground">Cargando facturas...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Facturas</TableHead>
                    <TableHead className="text-right">Total LTV</TableHead>
                    <TableHead className="text-right">Promedio/mes (6m)</TableHead>
                    <TableHead>Última factura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.customer_name}>
                      <TableCell className="font-medium">
                        {c.customer_name}
                        {c.discontinuedReason && (
                          <div className="text-xs text-muted-foreground italic mt-1">"{c.discontinuedReason}"</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{c.invoice_count}</TableCell>
                      <TableCell className="text-right font-mono">{fmtUsd(c.total_revenue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtUsd(c.avg_monthly)}</TableCell>
                      <TableCell className="text-sm">{new Date(c.last_invoice).toLocaleDateString('es-CR')}</TableCell>
                      <TableCell>{statusBadge(c.status, c.daysSinceLastInvoice)}</TableCell>
                      <TableCell className="text-right">
                        {c.status === 'discontinued' ? (
                          <Button variant="ghost" size="sm" onClick={() => reactivate.mutate({ customer_name: c.customer_name, client_id: c.client_id })}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivar
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setDiscDialog(c)}>
                            <UserMinus className="h-3.5 w-3.5 mr-1" /> No continúa
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Discontinue dialog */}
        <Dialog open={!!discDialog} onOpenChange={(o) => { if (!o) { setDiscDialog(null); setDiscReason(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como "no continúa"</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vas a marcar a <strong>{discDialog?.customer_name}</strong> como cliente que confirmó que no continúa.
                Esto cuenta como churn confirmado (distinto del auto-detectado por inactividad).
              </p>
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ej: Cierran operaciones, presupuesto, cambio de proveedor..."
                  value={discReason}
                  onChange={e => setDiscReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDiscDialog(null); setDiscReason(''); }}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDiscontinue} disabled={markDisc.isPending}>
                {markDisc.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AgencyFinances;
