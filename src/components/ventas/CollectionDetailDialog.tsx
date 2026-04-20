import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { SaleGroup, EnrichedCollection, usePaymentCollections } from '@/hooks/use-payment-collections';
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';

interface CollectionDetailDialogProps {
  group: SaleGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkPaid: (collection: EnrichedCollection) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
  clientId: string;
}

export const CollectionDetailDialog = ({
  group, open, onOpenChange, onMarkPaid, onDelete, isPending, clientId,
}: CollectionDetailDialogProps) => {
  const { updateCollection } = usePaymentCollections(clientId);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  const handleDateChange = (collection: EnrichedCollection, newDate: Date | undefined) => {
    if (!newDate) return;
    const dateStr = format(newDate, 'yyyy-MM-dd');
    if (dateStr === collection.due_date) {
      setEditingDateId(null);
      return;
    }
    updateCollection.mutate(
      { id: collection.id, updates: { due_date: dateStr }, saleId: collection.sale_id },
      {
        onSuccess: () => {
          toast.success('Fecha de cobro actualizada');
          setEditingDateId(null);
        },
        onError: () => toast.error('No se pudo actualizar la fecha'),
      }
    );
  };
  const sym = group.currency === 'CRC' ? '₡' : '$';
  const progressPct = group.totalCount > 0 ? (group.paidCount / group.totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{group.customerName}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="rounded-lg border p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Total contrato</p>
            <p className="text-sm font-bold">{sym}{Number(group.totalAmount || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Cobrado</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{sym}{group.totalCollected.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Pendiente</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{sym}{group.totalPending.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso de cobro</span>
            <span className="font-medium">{group.paidCount}/{group.totalCount} cuotas</span>
          </div>
          <Progress value={progressPct} className="h-2.5" />
        </div>

        {group.product && (
          <p className="text-xs text-muted-foreground">
            Producto: <span className="font-medium text-foreground">{group.product}</span>
          </p>
        )}

        {/* Timeline */}
        <div className="relative py-2">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border" />

          <div className="space-y-0">
            {group.collections.map((c, idx) => {
              const isPaid = c.status === 'paid';
              const dueDate = parseISO(c.due_date);
              const isOverdue = !isPaid && isPast(dueDate) && !isToday(dueDate);
              const isDueToday = !isPaid && isToday(dueDate);

              return (
                <div key={c.id} className="relative flex items-start gap-3 py-2">
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0',
                    isPaid && 'border-emerald-500 bg-emerald-500 text-white',
                    isOverdue && 'border-red-500 bg-red-500/10',
                    isDueToday && 'border-amber-500 bg-amber-500/10',
                    !isPaid && !isOverdue && !isDueToday && 'border-border bg-background',
                  )}>
                    {isPaid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    ) : isDueToday ? (
                      <Clock className="h-3 w-3 text-amber-500" />
                    ) : (
                      <span className="text-[9px] font-medium text-muted-foreground">{c.installment_number}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 rounded-lg border p-2.5 space-y-1',
                    isPaid && 'border-emerald-500/20 bg-emerald-500/5',
                    isOverdue && 'border-red-500/20 bg-red-500/5',
                    isDueToday && 'border-amber-500/20 bg-amber-500/5',
                    !isPaid && !isOverdue && !isDueToday && 'border-border',
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Cuota {c.installment_number}</span>
                      <span className="text-sm font-semibold">{sym}{Number(c.amount).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      {isPaid ? (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(dueDate, "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      ) : (
                        <Popover
                          open={editingDateId === c.id}
                          onOpenChange={(o) => setEditingDateId(o ? c.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors group"
                              disabled={isPending}
                            >
                              <CalendarDays className="h-3 w-3" />
                              <span className="underline decoration-dotted underline-offset-2">
                                {format(dueDate, "d 'de' MMMM, yyyy", { locale: es })}
                              </span>
                              <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dueDate}
                              onSelect={(d) => handleDateChange(c, d)}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      {c.paid_at && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Pagado {format(new Date(c.paid_at), 'dd/MM/yy')}
                        </span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-[11px] text-muted-foreground italic">{c.notes}</p>
                    )}

                    {!isPaid && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => onMarkPaid(c)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Cobrado
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(c.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
