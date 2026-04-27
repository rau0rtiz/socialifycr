import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AgencyContract,
  computeChurnRate,
  computeLtv,
  computeMonthsActive,
  computeMrrTimeline,
  monthlyEquivalent,
  useAgencyContracts,
  useBillingAccounts,
  useDeleteContract,
} from '@/hooks/use-agency-finances';
import { ContractFormDialog } from '@/components/agency-finances/ContractFormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Plus, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const GREEN = 'hsl(142, 71%, 45%)';
const RED = 'hsl(0, 75%, 55%)';

const AgencyFinances = () => {
  const { data: contracts = [], isLoading: loadingContracts } = useAgencyContracts();
  const { data: billingAccounts = [] } = useBillingAccounts();
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list-agency-fin'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      return data || [];
    },
  });
  const deleteContract = useDeleteContract();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyContract | null>(null);

  const timeline = useMemo(() => computeMrrTimeline(contracts, 12), [contracts]);
  const currentMrr = timeline[timeline.length - 1]?.mrr ?? 0;
  const prevMrr = timeline[timeline.length - 2]?.mrr ?? 0;
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;
  const churnRate = computeChurnRate(timeline);
  const activeContracts = contracts.filter(c => c.status === 'active');
  const lastMonth = timeline[timeline.length - 1];
  const newThisMonth = lastMonth?.newMrr ?? 0;

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.name])), [clients]);
  const billingMap = useMemo(() => Object.fromEntries(billingAccounts.map(b => [b.id, b.name])), [billingAccounts]);

  // Group contracts by billing account
  const grouped = useMemo(() => {
    const map = new Map<string, AgencyContract[]>();
    contracts.forEach(c => {
      const key = c.billing_account_id ?? '__direct__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [contracts]);

  // At-risk: contract ending in <30 days OR paused
  const atRisk = useMemo(() => {
    const now = Date.now();
    return contracts.filter(c => {
      if (c.status === 'paused') return true;
      if (c.end_date) {
        const days = (new Date(c.end_date).getTime() - now) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days <= 30) return true;
      }
      return false;
    });
  }, [contracts]);

  const handleEdit = (c: AgencyContract) => {
    setEditing(c);
    setDialogOpen(true);
  };
  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finanzas Agencia</h1>
            <p className="text-muted-foreground">MRR, churn, LTV y pauta — vista interna</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo contrato
          </Button>
        </div>

        {/* Hero KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR actual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtUsd(currentMrr)}</div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${mrrGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {mrrGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {fmtPct(Math.abs(mrrGrowth))} vs mes anterior
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContracts.length}</div>
              <div className="text-xs text-muted-foreground mt-1">+{fmtUsd(newThisMonth)} nuevo MRR este mes</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Churn rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtPct(churnRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">{lastMonth?.churned ?? 0} bajas este mes</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pauta Meta agencia</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
              <div className="text-xs text-muted-foreground mt-1">Conectar Business Manager</div>
            </CardContent>
          </Card>
        </div>

        {/* MRR chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución MRR (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="net">
              <TabsList>
                <TabsTrigger value="net">MRR Neto</TabsTrigger>
                <TabsTrigger value="movement">Nuevo vs Perdido</TabsTrigger>
              </TabsList>
              <TabsContent value="net" className="h-[280px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtUsd(v)} />
                    <Line type="monotone" dataKey="mrr" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="movement" className="h-[280px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtUsd(v)} />
                    <Legend />
                    <Bar dataKey="newMrr" name="Nuevo MRR" fill={GREEN} />
                    <Bar dataKey="lostMrr" name="MRR perdido" fill={RED} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Contracts table */}
        <Card>
          <CardHeader>
            <CardTitle>Contratos por cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingContracts ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : contracts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay contratos registrados todavía.</p>
                <Button onClick={handleNew} className="mt-4"><Plus className="h-4 w-4 mr-2" />Crear primer contrato</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead className="text-right">Monto/mes (USD eq.)</TableHead>
                    <TableHead className="text-right">Posts/mes</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead className="text-right">Antigüedad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(grouped.entries()).flatMap(([billingId, list]) => {
                    const billingName = billingId === '__direct__' ? null : billingMap[billingId];
                    const groupTotal = list.filter(c => c.status === 'active').reduce((s, c) => s + monthlyEquivalent(c), 0);
                    const rows: JSX.Element[] = [];
                    if (billingName && list.length > 1) {
                      rows.push(
                        <TableRow key={`group-${billingId}`} className="bg-muted/30">
                          <TableCell colSpan={2} className="font-semibold">📦 {billingName} (paraguas)</TableCell>
                          <TableCell className="text-right font-semibold">{fmtUsd(groupTotal)}</TableCell>
                          <TableCell colSpan={5} className="text-xs text-muted-foreground">{list.length} sub-clientes</TableCell>
                        </TableRow>
                      );
                    }
                    list.forEach(c => {
                      const monthly = monthlyEquivalent(c);
                      const ltv = computeLtv(c);
                      const months = computeMonthsActive(c);
                      rows.push(
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{clientMap[c.client_id] || '—'}</TableCell>
                          <TableCell>{billingName || <span className="text-muted-foreground text-xs">Directo</span>}</TableCell>
                          <TableCell className="text-right font-mono">{fmtUsd(monthly)}</TableCell>
                          <TableCell className="text-right">{c.posts_per_month}</TableCell>
                          <TableCell className="text-right font-mono">{fmtUsd(ltv)}</TableCell>
                          <TableCell className="text-right">{months}m</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'active' ? 'default' : c.status === 'paused' ? 'secondary' : 'destructive'}>
                              {c.status === 'active' ? 'Activo' : c.status === 'paused' ? 'Pausado' : 'Churn'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar contrato?')) deleteContract.mutate(c.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    });
                    return rows;
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* At risk */}
        {atRisk.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Clientes en riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {atRisk.map(c => (
                  <li key={c.id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <div className="font-medium">{clientMap[c.client_id]}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.status === 'paused' && 'Pausado'}
                        {c.end_date && ` · vence ${new Date(c.end_date).toLocaleDateString('es-CR')}`}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(c)}>Revisar</Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <ContractFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clients={clients}
          billingAccounts={billingAccounts}
          initial={editing}
        />
      </div>
    </DashboardLayout>
  );
};

export default AgencyFinances;
