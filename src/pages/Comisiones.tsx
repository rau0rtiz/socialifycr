import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useCommissions, CloserCommission } from '@/hooks/use-commissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CloserCommissionCard } from '@/components/comisiones/CloserCommissionCard';
import { CloserDetailDialog } from '@/components/comisiones/CloserDetailDialog';
import { MonthSelector } from '@/components/comisiones/MonthSelector';
import { format, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: Clock },
  partial: { label: 'Parcial', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30', icon: TrendingUp },
  paid: { label: 'Pagada', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
};

const formatMoney = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);

const Comisiones = () => {
  const { selectedClient } = useBrand();
  const { systemRole, clientAccess, loading: roleLoading } = useUserRole();
  const clientId = selectedClient?.id ?? null;

  // Access: only owner/admin/account_manager
  const isOwnerOrAdmin = systemRole === 'owner' || systemRole === 'admin';
  const isAccountManager = clientId
    ? clientAccess.some(a => a.clientId === clientId && a.role === 'account_manager')
    : false;
  const hasAccess = isOwnerOrAdmin || isAccountManager;

  const isMindCoach = selectedClient?.name?.toLowerCase().includes('mind coach');

  const { commissions, payouts, closersDirectory, isLoading, markCommissionPaid, deletePayout } = useCommissions(hasAccess && isMindCoach ? clientId : null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [openCloser, setOpenCloser] = useState<{
    name: string;
    userId: string | null;
    manualId: string | null;
    avatarUrl: string | null;
    currency: string;
  } | null>(null);

  const monthStart = parseISO(`${filterMonth}-01`);
  const monthEnd = endOfMonth(monthStart);

  // Commissions inside the selected month
  const monthCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (!c.sale_date) return false;
      const d = parseISO(c.sale_date);
      return d >= monthStart && d <= monthEnd;
    });
  }, [commissions, monthStart, monthEnd]);

  // For "Detalle por venta" tab — month + status filter
  const filteredDetail = useMemo(() => {
    return monthCommissions.filter(c => filterStatus === 'all' || c.status === filterStatus);
  }, [monthCommissions, filterStatus]);

  // KPIs (based on selected month)
  const stats = useMemo(() => {
    const totalCommissions = monthCommissions.reduce((s, c) => s + c.total_commission, 0);
    const earnedToDate = monthCommissions.reduce((s, c) => s + (c.earned_to_date || 0), 0);
    const paidOut = monthCommissions.reduce((s, c) => s + c.paid_amount, 0);
    const pendingToPay = monthCommissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0);
    return { totalCommissions, earnedToDate, paidOut, pendingToPay };
  }, [monthCommissions]);

  // Build list of closer cards: merge directory + closers seen in commissions (both historical & this month)
  const closerCards = useMemo(() => {
    type CloserInfo = {
      key: string;
      name: string;
      userId: string | null;
      manualId: string | null;
      avatarUrl: string | null;
      commissions: CloserCommission[];
      currency: string;
    };
    const map = new Map<string, CloserInfo>();

    const keyFor = (userId: string | null, manualId: string | null, name: string) =>
      userId ? `user:${userId}` : manualId ? `manual:${manualId}` : `name:${name.toLowerCase()}`;

    // Seed with directory (so closers without sales still appear)
    closersDirectory.forEach(d => {
      map.set(d.key, {
        key: d.key,
        name: d.name,
        userId: d.userId,
        manualId: d.manualId,
        avatarUrl: d.avatarUrl,
        commissions: [],
        currency: 'USD',
      });
    });

    // Add commissions for the selected month
    monthCommissions.forEach(c => {
      const k = keyFor(c.closer_user_id, c.closer_manual_id, c.closer_name);
      const existing = map.get(k);
      if (existing) {
        existing.commissions.push(c);
        existing.currency = c.currency;
      } else {
        map.set(k, {
          key: k,
          name: c.closer_name,
          userId: c.closer_user_id,
          manualId: c.closer_manual_id,
          avatarUrl: null,
          commissions: [c],
          currency: c.currency,
        });
      }
    });

    // Also include closers that have historical commissions even if not in this month (so they always appear)
    commissions.forEach(c => {
      const k = keyFor(c.closer_user_id, c.closer_manual_id, c.closer_name);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          name: c.closer_name,
          userId: c.closer_user_id,
          manualId: c.closer_manual_id,
          avatarUrl: null,
          commissions: [],
          currency: c.currency,
        });
      }
    });

    // Sort: pending first (desc), then by sales count desc, then alphabetic
    return Array.from(map.values()).sort((a, b) => {
      const pa = a.commissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0);
      const pb = b.commissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0);
      if (pb !== pa) return pb - pa;
      if (b.commissions.length !== a.commissions.length) return b.commissions.length - a.commissions.length;
      return a.name.localeCompare(b.name);
    });
  }, [closersDirectory, monthCommissions, commissions]);

  // Commissions to pass to dialog when a closer is opened
  const openCloserMonthCommissions = useMemo(() => {
    if (!openCloser) return [];
    const k = openCloser.userId
      ? `user:${openCloser.userId}`
      : openCloser.manualId
      ? `manual:${openCloser.manualId}`
      : `name:${openCloser.name.toLowerCase()}`;
    return closerCards.find(c => c.key === k)?.commissions || [];
  }, [openCloser, closerCards]);

  if (roleLoading) {
    return <DashboardLayout><div className="p-8">Cargando...</div></DashboardLayout>;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Selecciona un cliente</div>
      </DashboardLayout>
    );
  }

  if (!isMindCoach) {
    return (
      <DashboardLayout>
        <Card className="max-w-xl mx-auto mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Comisiones no disponibles
            </CardTitle>
            <CardDescription>
              La sección de Comisiones está habilitada únicamente para The Mind Coach.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-7 w-7 text-emerald-500" />
              Comisiones
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tracking de comisiones de closers basado en cash collected
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <MonthSelector value={filterMonth} onChange={setFilterMonth} />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> Comisiones totales</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(stats.totalCommissions)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-blue-500" /> Devengado (cash collected)</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(stats.earnedToDate)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" /> Por pagar al closer</CardDescription>
              <CardTitle className="text-2xl text-amber-700 dark:text-amber-400">{formatMoney(stats.pendingToPay)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Pagado</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(stats.paidOut)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="por-pagar" className="w-full">
          <TabsList>
            <TabsTrigger value="por-pagar">Por pagar este mes</TabsTrigger>
            <TabsTrigger value="detalle">Detalle por venta</TabsTrigger>
            <TabsTrigger value="historial">Historial de pagos</TabsTrigger>
          </TabsList>

          {/* Por closer — Grid de cards 3:4 */}
          <TabsContent value="por-pagar">
            {closerCards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No hay closers registrados todavía.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {closerCards.map(g => (
                  <CloserCommissionCard
                    key={g.key}
                    closerName={g.name}
                    avatarUrl={g.avatarUrl}
                    commissions={g.commissions}
                    currency={g.currency}
                    onClick={() =>
                      setOpenCloser({
                        name: g.name,
                        userId: g.userId,
                        manualId: g.manualId,
                        avatarUrl: g.avatarUrl,
                        currency: g.currency,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Detail by sale */}
          <TabsContent value="detalle">
            <Card>
              <CardHeader>
                <CardTitle>Detalle por venta</CardTitle>
                <CardDescription>Cada comisión asociada a su venta original.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Closer</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-center">Método</TableHead>
                      <TableHead className="text-center">Tasa</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Cobrado</TableHead>
                      <TableHead className="text-right">Devengado</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetail.length === 0 && (
                      <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Sin comisiones</TableCell></TableRow>
                    )}
                    {filteredDetail.map(c => {
                      const status = STATUS_LABELS[c.status];
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {c.sale_date ? format(parseISO(c.sale_date), 'dd MMM', { locale: es }) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{c.customer_name || 'Sin nombre'}</div>
                            {c.product && <div className="text-xs text-muted-foreground">{c.product}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{c.closer_name}</TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(c.sale_total, c.currency)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">{c.payment_method || '—'}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="font-mono">{c.effective_rate}%</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Base {c.base_rate}% {c.method_adjustment > 0 && `− ${c.method_adjustment}% por método`}
                                  {c.full_payment_bonus && ' (pago único $3,400, sin descuento)'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatMoney(c.total_commission, c.currency)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {((c.cash_collected_pct || 0) * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right text-sm text-blue-600 dark:text-blue-400">
                            {formatMoney(c.earned_to_date || 0, c.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(c.paid_amount, c.currency)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs gap-1 ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await markCommissionPaid.mutateAsync(c.id);
                                  toast.success('Marcada como pagada');
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payout history */}
          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de pagos a closers</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Closer</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin pagos registrados</TableCell></TableRow>
                    )}
                    {payouts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(parseISO(p.paid_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell className="text-sm font-medium">{p.closer_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.payment_method || '—'}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(p.amount, p.currency)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{p.notes}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!confirm('¿Eliminar este pago? Las comisiones volverán a quedar pendientes.')) return;
                              await deletePayout.mutateAsync(p.id);
                              toast.success('Pago eliminado');
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {openCloser && clientId && (
        <CloserDetailDialog
          open
          onOpenChange={(v) => !v && setOpenCloser(null)}
          clientId={clientId}
          closerName={openCloser.name}
          closerUserId={openCloser.userId}
          closerManualId={openCloser.manualId}
          avatarUrl={openCloser.avatarUrl}
          monthCommissions={openCloserMonthCommissions}
          monthLabel={format(monthStart, 'MMMM yyyy', { locale: es })}
          payouts={payouts}
          currency={openCloser.currency}
        />
      )}
    </DashboardLayout>
  );
};

export default Comisiones;
