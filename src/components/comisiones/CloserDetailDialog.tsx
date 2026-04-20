import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloserCommission, CommissionPayout, useCommissions } from '@/hooks/use-commissions';
import { RecordPayoutDialog } from './RecordPayoutDialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, TrendingUp, CheckCircle2, DollarSign, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CloserDetailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  closerName: string;
  closerUserId: string | null;
  closerManualId: string | null;
  avatarUrl: string | null;
  monthCommissions: CloserCommission[];
  monthLabel: string;
  payouts: CommissionPayout[];
  currency: string;
}

const formatMoney = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);

const formatPercent = (n: number) => `${Number(n || 0).toFixed(0)}%`;

const formatMethodLabel = (method: string | null) =>
  method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : '—';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || '?';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  partial: { label: 'Parcial', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  paid: { label: 'Pagada', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
};

export const CloserDetailDialog = ({
  open,
  onOpenChange,
  clientId,
  closerName,
  closerUserId,
  closerManualId,
  avatarUrl,
  monthCommissions,
  monthLabel,
  payouts,
  currency,
}: CloserDetailDialogProps) => {
  const { deletePayout } = useCommissions(clientId);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const stats = useMemo(() => {
    const sales = monthCommissions.length;
    const totalSales = monthCommissions.reduce((s, c) => s + c.sale_total, 0);
    const totalCommission = monthCommissions.reduce((s, c) => s + c.total_commission, 0);
    const earned = monthCommissions.reduce((s, c) => s + (c.earned_to_date || 0), 0);
    const pending = monthCommissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0);
    return { sales, totalSales, totalCommission, earned, pending };
  }, [monthCommissions]);

  const closerPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (closerUserId && p.closer_user_id === closerUserId) return true;
      if (closerManualId && p.closer_manual_id === closerManualId) return true;
      return p.closer_name?.toLowerCase() === closerName.toLowerCase();
    });
  }, [payouts, closerName, closerUserId, closerManualId]);

  const sortedMonthCommissions = useMemo(
    () => [...monthCommissions].sort((a, b) => (b.sale_date || '').localeCompare(a.sale_date || '')),
    [monthCommissions]
  );

  const pendingCommissions = monthCommissions.filter(c => (c.pending_to_pay || 0) > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={closerName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials(closerName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{closerName}</div>
                <div className="text-xs font-normal text-muted-foreground capitalize">{monthLabel}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat icon={<DollarSign className="h-3.5 w-3.5" />} label="Ventas" value={String(stats.sales)} sub={formatMoney(stats.totalSales, currency)} />
            <Stat icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />} label="Comisión potencial" value={formatMoney(stats.totalCommission, currency)} />
            <Stat icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} label="Devengado" value={formatMoney(stats.earned, currency)} />
            <Stat
              icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
              label="Por pagar"
              value={formatMoney(stats.pending, currency)}
              highlight={stats.pending > 0}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setPayoutOpen(true)}
              disabled={pendingCommissions.length === 0}
              size="sm"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Registrar pago
            </Button>
          </div>

          <Tabs defaultValue="ventas" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ventas" className="flex-1">Ventas del mes ({monthCommissions.length})</TabsTrigger>
              <TabsTrigger value="pagos" className="flex-1">Historial de pagos ({closerPayouts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="ventas" className="mt-3">
              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {sortedMonthCommissions.length === 0 && (
                  <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                    Sin ventas en este mes
                  </div>
                )}

                {sortedMonthCommissions.map(c => {
                  const status = STATUS_LABELS[c.status];
                  const collectedPct = (c.cash_collected_pct || 0) * 100;
                  const formulaText = `${formatPercent(c.effective_rate)} × ${formatPercent(collectedPct)} cobrado`;

                  return (
                    <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-base truncate">{c.customer_name || 'Sin nombre'}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{c.sale_date ? format(parseISO(c.sale_date), 'dd MMM yyyy', { locale: es }) : '—'}</span>
                            {c.product && (
                              <>
                                <span>•</span>
                                <span className="truncate">{c.product}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className={`w-fit text-[10px] ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <MiniMetric label="Venta" value={formatMoney(c.sale_total, c.currency)} />
                        <MiniMetric label="Método" value={formatMethodLabel(c.payment_method)} />
                        <MiniMetric
                          label="Tasa"
                          value={formatPercent(c.effective_rate)}
                          hint={Number(c.method_adjustment || 0) > 0 ? `10% - ${formatPercent(c.method_adjustment)}` : 'Sin ajuste'}
                        />
                        <MiniMetric
                          label="Cobrado"
                          value={formatPercent(collectedPct)}
                          hint={formatMoney(c.cash_collected || 0, c.currency)}
                        />
                        <MiniMetric label="Comisión total" value={formatMoney(c.total_commission, c.currency)} />
                        <MiniMetric label="Devengado" value={formatMoney(c.earned_to_date || 0, c.currency)} tone="info" />
                        <MiniMetric label="Pagado" value={formatMoney(c.paid_amount, c.currency)} tone="success" />
                        <MiniMetric label="Por pagar" value={formatMoney(c.pending_to_pay || 0, c.currency)} tone="warning" />
                      </div>

                      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Fórmula:</span> {formulaText} = {formatMoney(c.earned_to_date || 0, c.currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="pagos" className="mt-3">
              <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closerPayouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Sin pagos registrados
                        </TableCell>
                      </TableRow>
                    )}
                    {closerPayouts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(parseISO(p.paid_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.payment_method || '—'}</Badge></TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</TableCell>
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
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {payoutOpen && (
        <RecordPayoutDialog
          open
          onOpenChange={(v) => !v && setPayoutOpen(false)}
          clientId={clientId}
          closerName={closerName}
          closerUserId={closerUserId}
          closerManualId={closerManualId}
          pendingCommissions={pendingCommissions}
          currency={currency}
        />
      )}
    </>
  );
};

const Stat = ({
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
  <div
    className={`rounded-lg border p-2.5 ${
      highlight ? 'border-amber-500/40 bg-amber-500/5' : 'bg-muted/30'
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      {icon}
      {label}
    </div>
    <div className={`text-base font-bold tabular-nums ${highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>
      {value}
    </div>
    {sub && <div className="text-[10px] text-muted-foreground tabular-nums">{sub}</div>}
  </div>
);

const MiniMetric = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'info' | 'success' | 'warning';
}) => {
  const toneClass = tone === 'info'
    ? 'text-blue-600 dark:text-blue-400'
    : tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-foreground';

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
};
