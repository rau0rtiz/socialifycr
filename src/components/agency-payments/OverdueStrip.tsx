import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check } from 'lucide-react';
import { Installment, fmtMoney } from '@/hooks/use-agency-payments';

interface Props {
  items: Installment[];
  onMarkPaid: (inst: Installment) => void;
}

const daysLate = (iso: string) => {
  const due = new Date(`${iso}T12:00:00`);
  return Math.max(Math.floor((Date.now() - due.getTime()) / 86400000), 0);
};

const monthShort = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-01T12:00:00`).toLocaleDateString('es-CR', { month: 'short', year: '2-digit' });

export const OverdueStrip = ({ items, onMarkPaid }: Props) => {
  if (items.length === 0) return null;

  return (
    <Card className="p-3 border-destructive/40 bg-destructive/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-semibold">Pagos atrasados de meses anteriores ({items.length})</h3>
      </div>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {items.map(i => (
          <div
            key={`${i.schedule.id}-${i.dueIso}`}
            className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-background px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{i.client.name}</div>
              <div className="text-[11px] text-muted-foreground capitalize">
                {monthShort(i.dueIso)} · vence {i.dueIso.slice(8, 10)} · {daysLate(i.dueIso)} días de atraso
              </div>
            </div>
            <span className="text-sm font-mono font-semibold shrink-0">
              {fmtMoney(i.record?.amount ?? i.withIva, i.client.currency)}
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onMarkPaid(i)}>
              <Check className="h-3.5 w-3.5" /> Pagado
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
