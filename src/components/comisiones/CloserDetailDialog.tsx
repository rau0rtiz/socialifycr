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

  // Filter payouts to only this closer
  const closerPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (closerUserId && p.closer_user_id === closerUserId) return true;
      if (closerManualId && p.closer_manual_id === closerManualId) return true;
      return p.closer_name?.toLowerCase() === closerName.toLowerCase();
    });
  }, [payouts, closerName, closerUserId, closerManualId]);

  const pendingCommissions = monthCommissions.filter(c => (c.pending_to_pay || 0) > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
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

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat icon={<DollarSign className="h-3.5 w-3.5" />} label="Ventas" value={String(stats.sales)} sub={formatMoney(stats.totalSales, currency)} />
            <Stat icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />} label="Comisión total" value={formatMoney(stats.totalCommission, currency)} />
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
              <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">% Cobrado</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Por pagar</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthCommissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Sin ventas en este mes
                        </TableCell>
                      </TableRow>
                    )}
                    {monthCommissions.map(c => {
                      const status = STATUS_LABELS[c.status];
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {c.sale_date ? format(parseISO(c.sale_date), 'dd MMM', { locale: es }) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium truncate max-w-[180px]">{c.customer_name || 'Sin nombre'}</div>
                            {c.product && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{c.product}</div>}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatMoney(c.sale_total, c.currency)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                            {((c.cash_collected_pct || 0) * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">
                            {formatMoney(c.total_commission, c.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatMoney(c.pending_to_pay || 0, c.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
