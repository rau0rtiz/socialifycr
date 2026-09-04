import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Installment,
  PayClient,
  PAYMENT_METHODS,
  fmtMoney,
  isoDate,
  monthLabel,
} from '@/hooks/use-agency-payments';
import { MonthRow } from './PaymentClientRow';

interface Props {
  rows: MonthRow[];
  overdue: Installment[];
  logoOf: (c: PayClient) => string | null;
  monthDate: Date;
  onEdit: (id: string) => void;
  onTogglePaid: (inst: Installment) => void;
  onSetMethod: (inst: Installment, method: string) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

const todayIso = () => isoDate(new Date());

const sectionOf = (dueIso: string, paid: boolean) => {
  const today = todayIso();
  if (paid) return 'pagado';
  if (dueIso < today) return 'vencido';
  if (dueIso === today) return 'hoy';
  const due = new Date(`${dueIso}T12:00:00`);
  const now = new Date();
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 7) return 'semana';
  if (due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear()) return 'mes';
  return 'futuro';
};

const sectionMeta: Record<
  string,
  { label: string; icon: React.ElementType; color: string; border: string }
> = {
  vencido: {
    label: 'Vencidos',
    icon: AlertTriangle,
    color: 'text-destructive',
    border: 'border-destructive/30',
  },
  hoy: {
    label: 'Hoy',
    icon: Clock,
    color: 'text-amber-500',
    border: 'border-amber-500/30',
  },
  semana: {
    label: 'Próximos 7 días',
    icon: Calendar,
    color: 'text-primary',
    border: 'border-primary/30',
  },
  mes: {
    label: 'Este mes',
    icon: Calendar,
    color: 'text-sky-400',
    border: 'border-sky-400/30',
  },
  futuro: {
    label: 'Meses siguientes',
    icon: Calendar,
    color: 'text-muted-foreground',
    border: 'border-border',
  },
  pagado: {
    label: 'Pagados',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    border: 'border-emerald-500/30',
  },
};

export const PaymentTimeline = ({
  rows,
  overdue,
  logoOf,
  monthDate,
  onEdit,
  onTogglePaid,
  onSetMethod,
}: Props) => {
  const allItems: Installment[] = [
    ...overdue,
    ...rows.flatMap(r => r.items),
  ].sort((a, b) => {
    // Pagados al final; luego por fecha de vencimiento.
    const aPaid = !!a.record?.paid;
    const bPaid = !!b.record?.paid;
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    return a.dueIso.localeCompare(b.dueIso);
  });

  const grouped = allItems.reduce<Record<string, Installment[]>>((acc, inst) => {
    const key = sectionOf(inst.dueIso, !!inst.record?.paid);
    acc[key] ??= [];
    acc[key].push(inst);
    return acc;
  }, {});

  const sectionOrder = ['vencido', 'hoy', 'semana', 'mes', 'futuro', 'pagado'];

  return (
    <div className="space-y-5">
      {sectionOrder.map(key => {
        const items = grouped[key];
        if (!items?.length) return null;
        const meta = sectionMeta[key];
        const Icon = meta.icon;

        return (
          <div key={key}>
            <div className={cn('flex items-center gap-2 mb-2', meta.color)}>
              <Icon className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">{meta.label}</h3>
              <Badge variant="outline" className="text-[10px] h-5">
                {items.length}
              </Badge>
            </div>

            <Card className={cn('overflow-hidden border', meta.border)}>
              <div className="divide-y divide-border/50">
                {items.map(inst => {
                  const paid = !!inst.record?.paid;
                  const logo = logoOf(inst.client);
                  const dueDate = new Date(`${inst.dueIso}T12:00:00`);
                  const isOverdue = !paid && inst.dueIso < todayIso();

                  return (
                    <div
                      key={`${inst.client.id}-${inst.schedule.id}-${inst.dueIso}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 transition-colors',
                        paid ? 'bg-emerald-500/[0.03]' : 'hover:bg-accent/30'
                      )}
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {logo ? (
                          <img
                            src={logo}
                            alt={`Logo de ${inst.client.name}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {initials(inst.client.name)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => onEdit(inst.client.id)}
                            className="text-sm font-semibold truncate hover:text-primary transition-colors"
                          >
                            {inst.client.name}
                          </button>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {inst.client.currency}
                          </Badge>
                          {inst.client.billing_frequency === 'quarterly' && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              Trimestral
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                              Vencido
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {inst.schedule.label || `Tracto ${inst.schedule.sort_order + 1}`} · Vence{' '}
                          <span className="font-medium text-foreground">
                            {dueDate.toLocaleDateString('es-CR', {
                              day: '2-digit',
                              month: 'short',
                              year: dueDate.getFullYear() !== monthDate.getFullYear() ? '2-digit' : undefined,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-3">
                        <Select
                          value={inst.record?.payment_method || ''}
                          onValueChange={(v) => onSetMethod(inst, v)}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <SelectValue placeholder="Método" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="text-right min-w-[100px]">
                          <div className="text-sm font-mono font-semibold">
                            {fmtMoney(inst.record?.amount ?? inst.withIva, inst.client.currency)}
                          </div>
                          {Number(inst.client.iva_rate) > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              IVA {inst.client.iva_rate}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          checked={paid}
                          onCheckedChange={() => onTogglePaid(inst)}
                          aria-label="Marcar pagado"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEdit(inst.client.id)}
                          aria-label="Editar cliente"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        );
      })}

      {allItems.length === 0 && (
        <Card className="p-10 text-center">
          <Calendar className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sin pagos programados este mes.</p>
        </Card>
      )}
    </div>
  );
};
