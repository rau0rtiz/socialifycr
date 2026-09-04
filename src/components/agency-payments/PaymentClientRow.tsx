import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, FileText, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Installment,
  PayClient,
  PAYMENT_METHODS,
  fmtMoney,
  monthLabel,
} from '@/hooks/use-agency-payments';

export interface MonthRow {
  client: PayClient;
  bills: boolean;
  nextMonth: Date | null;
  items: Installment[];
  subtotal: number;
  totalDue: number;
  ivaAmount: number;
  totalPaid: number;
}

interface Props {
  row: MonthRow;
  logo: string | null;
  monthDate: Date;
  onEdit: () => void;
  onTogglePaid: (inst: Installment) => void;
  onSetMethod: (inst: Installment, method: string) => void;
}

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const PaymentClientRow = ({ row, logo, monthDate, onEdit, onTogglePaid, onSetMethod }: Props) => {
  const { client, bills, items } = row;
  const invoiceDay = client.invoice_day || 1;
  const invoiceLabel = `${String(invoiceDay).padStart(2, '0')} ${monthDate
    .toLocaleDateString('es-CR', { month: 'short' })
    .replace('.', '')}`;
  const hasBilling = !!(client.billing_name || client.billing_tax_id || client.billing_email);

  return (
    <Card className={cn('p-3', !bills && 'opacity-55')}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {logo ? (
            <img src={logo} alt={`Logo de ${client.name}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">{initials(client.name)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{client.name}</span>
            <Badge variant="outline" className="text-[10px] h-5">{client.currency}</Badge>
            {client.billing_frequency === 'quarterly' && (
              <Badge variant="secondary" className="text-[10px] h-5">Trimestral</Badge>
            )}
            {Number(client.iva_rate) > 0 && (
              <Badge variant="outline" className="text-[10px] h-5">IVA {Number(client.iva_rate)}%</Badge>
            )}
            {hasBilling && (
              <span title="Datos de facturación registrados">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
          </div>

          {bills ? (
            <>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Factura el {invoiceLabel} · {items.length} {items.length === 1 ? 'tracto' : 'tractos'}
              </div>
              <div className="mt-2 space-y-1.5">
                {items.map(inst => {
                  const paid = !!inst.record?.paid;
                  const overdue = !paid && inst.dueIso < new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={inst.schedule.id}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5',
                        paid ? 'border-emerald-500/30 bg-emerald-500/5' : overdue ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30',
                      )}
                    >
                      <Checkbox checked={paid} onCheckedChange={() => onTogglePaid(inst)} />
                      <span className="text-xs font-medium w-24">
                        {inst.schedule.label || `Tracto ${inst.schedule.sort_order + 1}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground w-16">Día {inst.dueDay}</span>
                      <span className="text-xs font-mono font-semibold w-24">
                        {fmtMoney(inst.record?.amount ?? inst.withIva, client.currency)}
                      </span>
                      <Select
                        value={inst.record?.payment_method || ''}
                        onValueChange={(v) => onSetMethod(inst, v)}
                      >
                        <SelectTrigger className="h-7 w-[150px] text-xs">
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {paid && inst.record?.paid_at && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Pagado {new Date(inst.record.paid_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {overdue && <span className="text-[11px] text-destructive font-medium">Vencido</span>}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Sin tractos configurados</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              No factura este mes · Próximo pago:{' '}
              <span className="capitalize font-medium">{row.nextMonth ? monthLabel(row.nextMonth) : '—'}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-mono font-bold">{fmtMoney(row.totalDue, client.currency)}</div>
          {bills && (
            <div className="text-[11px] text-muted-foreground">
              Cobrado {fmtMoney(row.totalPaid, client.currency)}
            </div>
          )}
          <Button size="sm" variant="ghost" className="h-7 mt-1 text-xs gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        </div>
      </div>
    </Card>
  );
};
