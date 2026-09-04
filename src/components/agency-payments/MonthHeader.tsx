import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { fmtMoney, monthLabel, isoDate } from '@/hooks/use-agency-payments';

interface Props {
  monthDate: Date;
  onShift: (delta: number) => void;
  onToday: () => void;
  totals: Record<string, { billed: number; paid: number; pending: number }>;
  onNewClient: () => void;
  /** Desactiva la flecha de mes anterior (mes cero = setiembre 2026). */
  canPrev?: boolean;
}

const CURRENCIES = ['CRC', 'USD'];

export const MonthHeader = ({ monthDate, onShift, onToday, totals, onNewClient, canPrev = true }: Props) => {
  const isCurrent =
    isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)) ===
    isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Pagos de clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Facturación, tractos, cobros y datos de facturación por cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 border rounded-lg bg-card">
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onShift(-1)} disabled={!canPrev} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button onClick={onToday} className="px-3 min-w-[150px] text-center">
              <div className="text-sm font-semibold capitalize leading-tight">{monthLabel(monthDate)}</div>
              <div className="text-[10px] text-muted-foreground">{isCurrent ? 'Mes actual' : 'Ir al mes actual'}</div>
            </button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onShift(1)} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={onNewClient} className="gap-1.5">
            <Plus className="h-4 w-4" /> Cliente
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CURRENCIES.map(cur => {
          const t = totals[cur] || { billed: 0, paid: 0, pending: 0 };
          return (
            <Card key={cur} className="p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  MRR {cur}
                </p>
                <span className="text-2xl font-bold font-mono">{fmtMoney(t.billed, cur)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-emerald-500/10 px-2 py-1.5">
                  <span className="text-muted-foreground">Cobrado</span>
                  <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmtMoney(t.paid, cur)}
                  </div>
                </div>
                <div className="rounded-md bg-amber-500/10 px-2 py-1.5">
                  <span className="text-muted-foreground">Pendiente</span>
                  <div className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                    {fmtMoney(t.pending, cur)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
