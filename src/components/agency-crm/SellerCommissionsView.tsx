import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle2,
  Circle,
  CalendarClock,
  DollarSign,
  X,
  History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  computeContractRateNow,
  computeServiceMonth,
  DEFAULT_SELLER,
  LEAD_SOURCES,
  SellerCollection,
  SellerContract,
  useChurnContract,
  useCommissionPayouts,
  useSellerCollections,
  useSellerContracts,
  useUnmarkCollectionPaid,
  useMarkCommissionPaid,
  useUnmarkCommissionPaid,
} from '@/hooks/use-seller-commissions';
import { NewSaleWizard } from './NewSaleWizard';
import { MarkPaidDialog } from './MarkPaidDialog';
import { PayCommissionDialog } from './PayCommissionDialog';


const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const fmtMoney = (amount: number, currency: string) =>
  `${currency === 'CRC' ? '₡' : '$'}${Math.round(amount).toLocaleString('en-US')}`;

export const SellerCommissionsView = () => {
  const seller = DEFAULT_SELLER;
  const { data: contracts = [], isLoading: loadingC } = useSellerContracts(seller);
  const { data: collections = [], isLoading: loadingCols } = useSellerCollections(seller);
  const { data: payouts = [] } = useCommissionPayouts(seller);
  const unmark = useUnmarkCollectionPaid();
  const markCommissionPaid = useMarkCommissionPaid();
  const unmarkCommissionPaid = useUnmarkCommissionPaid();
  const churn = useChurnContract();



  const [wizardOpen, setWizardOpen] = useState(false);
  const [markPaid, setMarkPaid] = useState<{ col: SellerCollection; contract: SellerContract | null } | null>(null);
  const [payDialog, setPayDialog] = useState(false);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today));

  const contractById = useMemo(() => {
    const m = new Map<string, SellerContract>();
    contracts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contracts]);

  // Cobros del mes seleccionado
  const monthStart = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [selectedMonth]);
  const monthEnd = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m, 0, 23, 59, 59);
  }, [selectedMonth]);

  const monthCollections = useMemo(
    () =>
      collections.filter((c) => {
        const ref = c.paid_at ? new Date(c.paid_at) : new Date(c.due_date + 'T12:00:00');
        return ref >= monthStart && ref <= monthEnd;
      }),
    [collections, monthStart, monthEnd],
  );

  const paidThisMonth = monthCollections.filter((c) => c.status === 'paid');
  const totalCollected = paidThisMonth.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
  const totalCommission = paidThisMonth.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const commissionPaidRows = paidThisMonth.filter((c) => c.commission_paid_at);
  const commissionPaidAmount = commissionPaidRows.reduce(
    (s, c) => s + Number(c.commission_paid_amount || c.commission_amount || 0),
    0,
  );
  const commissionPendingAmount = paidThisMonth
    .filter((c) => !c.commission_paid_at)
    .reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const currencyMix = new Set(paidThisMonth.map((c) => c.currency));
  const displayCurrency: string = currencyMix.size === 1 ? (Array.from(currencyMix)[0] as string) : 'USD';


  const activeContracts = contracts.filter((c) => c.status === 'active');
  const inInitialWindow = activeContracts.filter(
    (c) => computeServiceMonth(c.start_date) <= (c.commission_initial_months ?? 3),
  );

  // Breakdown de leads por origen (todos los contratos)
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, { active: number; total: number; mrr: number }> = {};
    for (const c of contracts) {
      const key = c.lead_source || 'other';
      if (!counts[key]) counts[key] = { active: 0, total: 0, mrr: 0 };
      counts[key].total += 1;
      if (c.status === 'active') {
        counts[key].active += 1;
        counts[key].mrr += Number(c.monthly_amount || 0);
      }
    }
    return LEAD_SOURCES
      .map((s) => ({ ...s, ...(counts[s.value] || { active: 0, total: 0, mrr: 0 }) }))
      .filter((s) => s.total > 0);
  }, [contracts]);


  // Próximo cobro por contrato
  const nextDueByContract = useMemo(() => {
    const map = new Map<string, SellerCollection>();
    const sortedPending = [...collections]
      .filter((c) => c.status === 'pending')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    for (const c of sortedPending) {
      if (c.contract_id && !map.has(c.contract_id)) map.set(c.contract_id, c);
    }
    return map;
  }, [collections]);

  const monthOptions = useMemo(() => {
    const arr: string[] = [];
    for (let i = -6; i <= 2; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      arr.push(monthKey(d));
    }
    return arr;
  }, [today]);

  const isLoading = loadingC || loadingCols;

  return (
    <div className="space-y-6">
      {/* Header + selector + new sale */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Comisiones
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            15% los primeros 3 meses de cada cliente, 8% perpetuo después.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(parseISO(m + '-01'), "MMMM yyyy", { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nueva venta
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Cobrado en el mes"
          value={fmtMoney(totalCollected, displayCurrency)}
          sub={`${paidThisMonth.length} cobro(s) confirmado(s)`}
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          label="Comisión devengada"
          value={fmtMoney(totalCommission, displayCurrency)}
          sub={`Para ${seller}`}
          highlight
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clientes activos"
          value={String(activeContracts.length)}
          sub={`${inInitialWindow.length} en ventana 15%`}
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Pendientes del mes"
          value={String(monthCollections.filter((c) => c.status === 'pending').length)}
          sub={fmtMoney(
            monthCollections.filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0),
            displayCurrency,
          )}
        />
      </div>

      {/* Crecimiento por origen de leads */}
      {sourceBreakdown.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Crecimiento por origen</h3>
            <p className="text-xs text-muted-foreground">
              De dónde están viniendo los clientes que generan comisión
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
            {sourceBreakdown.map((s) => (
              <div
                key={s.value}
                className="rounded-lg border border-border bg-background/50 p-3 space-y-1"
              >
                <Badge variant="outline" className={cn('text-[10px]', s.color)}>
                  {s.label}
                </Badge>
                <div className="text-lg font-bold">
                  {s.active}
                  <span className="text-xs font-normal text-muted-foreground"> / {s.total}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  MRR activo: {fmtMoney(s.mrr, displayCurrency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* Cobros del período */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Cobros del mes</h3>
            <p className="text-xs text-muted-foreground">
              {format(monthStart, "MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPayDialog(true)}
            disabled={totalCommission <= 0}
          >
            Registrar pago de comisión
          </Button>
        </div>
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
          </div>
        ) : monthCollections.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay cobros en este mes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-left px-4 py-2">Vence</th>
                  <th className="text-left px-4 py-2">Cobrado</th>
                  <th className="text-right px-4 py-2">Monto</th>
                  <th className="text-center px-4 py-2">Mes serv.</th>
                  <th className="text-center px-4 py-2">Tasa</th>
                  <th className="text-right px-4 py-2">Comisión</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {monthCollections
                  .sort((a, b) => a.due_date.localeCompare(b.due_date))
                  .map((c) => {
                    const contract = c.contract_id ? contractById.get(c.contract_id) : null;
                    const isPaid = c.status === 'paid';
                    return (
                      <tr key={c.id} className="border-t border-border/50">
                        <td className="px-4 py-2 font-medium">{c.customer_name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {format(parseISO(c.due_date), "d MMM", { locale: es })}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.paid_at ? format(parseISO(c.paid_at), "d MMM", { locale: es }) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {fmtMoney(Number(c.paid_amount ?? c.amount), c.currency)}
                        </td>
                        <td className="px-4 py-2 text-center text-xs">{c.service_month ?? '—'}</td>
                        <td className="px-4 py-2 text-center">
                          {c.commission_rate != null ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px]',
                                Number(c.commission_rate) >= 15
                                  ? 'border-green-500/40 text-green-400 bg-green-500/10'
                                  : 'border-blue-500/40 text-blue-400 bg-blue-500/10',
                              )}
                            >
                              {c.commission_rate}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {c.commission_amount != null
                            ? fmtMoney(Number(c.commission_amount), c.currency)
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isPaid ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => unmark.mutate(c.id)}
                            >
                              <X className="h-3 w-3 mr-1" /> Deshacer
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setMarkPaid({ col: c, contract: contract || null })}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar pagado
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right text-xs uppercase text-muted-foreground">
                    Total comisión del mes
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-primary">
                    {fmtMoney(totalCommission, displayCurrency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Clientes activos */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Clientes activos</h3>
          <p className="text-xs text-muted-foreground">
            {activeContracts.length} cliente(s) generando comisión
          </p>
        </div>
        {activeContracts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay clientes activos todavía. Crea la primera venta.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {activeContracts.map((c) => {
              const sm = computeServiceMonth(c.start_date);
              const rate = computeContractRateNow(c);
              const inInitial = sm <= (c.commission_initial_months ?? 3);
              const nextDue = nextDueByContract.get(c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-background/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Desde {format(parseISO(c.start_date), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] shrink-0',
                        inInitial
                          ? 'border-green-500/40 text-green-400 bg-green-500/10'
                          : 'border-blue-500/40 text-blue-400 bg-blue-500/10',
                      )}
                    >
                      Mes {sm} · {rate}%
                    </Badge>
                  </div>
                  {c.lead_source && (() => {
                    const src = LEAD_SOURCES.find((s) => s.value === c.lead_source);
                    if (!src) return null;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px]', src.color)}>
                          {src.label}
                        </Badge>
                        {c.lead_source_detail && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            · {c.lead_source_detail}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paquete</span>
                      <span className="font-medium">{fmtMoney(Number(c.monthly_amount), c.currency)}/mes</span>
                    </div>
                    {nextDue && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Próx. cobro</span>
                        <span>
                          {format(parseISO(nextDue.due_date), "d MMM", { locale: es })} ·{' '}
                          {fmtMoney(Number(nextDue.amount), nextDue.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {nextDue && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={() => setMarkPaid({ col: nextDue, contract: c })}
                      >
                        <Circle className="h-3 w-3 mr-1" /> Cobrar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const reason = prompt('Motivo de cancelación del cliente:');
                        if (reason) churn.mutate({ id: c.id, churn_reason: reason });
                      }}
                    >
                      Churn
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pagos a Lucía */}
      {payouts.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <History className="h-4 w-4" /> Historial de pagos a {seller}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Período</th>
                  <th className="text-left px-4 py-2">Pagado el</th>
                  <th className="text-right px-4 py-2">Monto</th>
                  <th className="text-left px-4 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 12).map((p) => (
                  <tr key={p.id} className="border-t border-border/50">
                    <td className="px-4 py-2 text-xs">
                      {format(parseISO(p.period_start), "d MMM", { locale: es })} →{' '}
                      {format(parseISO(p.period_end), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {format(parseISO(p.paid_at), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmtMoney(Number(p.total_commission), p.currency)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <NewSaleWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <MarkPaidDialog
        open={!!markPaid}
        onOpenChange={(v) => !v && setMarkPaid(null)}
        collection={markPaid?.col || null}
        contract={markPaid?.contract || null}
      />
      <PayCommissionDialog
        open={payDialog}
        onOpenChange={setPayDialog}
        sellerName={seller}
        periodStart={monthStart.toISOString().slice(0, 10)}
        periodEnd={monthEnd.toISOString().slice(0, 10)}
        totalCommission={totalCommission}
        currency={displayCurrency}
      />
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) => (
  <Card
    className={cn(
      'p-4',
      highlight && 'border-primary/40 bg-primary/5',
    )}
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <div className={cn('text-2xl font-bold', highlight && 'text-primary')}>{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
  </Card>
);
