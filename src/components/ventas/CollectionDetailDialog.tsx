import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SaleGroup, EnrichedCollection } from '@/hooks/use-payment-collections';
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface CollectionDetailDialogProps {
  group: SaleGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkPaid: (collection: EnrichedCollection) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export const CollectionDetailDialog = ({
  group, open, onOpenChange, onMarkPaid, onDelete, isPending,
}: CollectionDetailDialogProps) => {
  const sym = group.currency === 'CRC' ? '₡' : '$';
  const paidCount = group.collections.filter(c => c.status === 'paid').length;
  const totalCount = group.collections.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Cobros — {group.customerName}</DialogTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
            {group.product && <span>Producto: <span className="font-medium text-foreground">{group.product}</span></span>}
            {group.totalAmount && (
              <span>Total: <span className="font-medium text-foreground">{sym}{Number(group.totalAmount).toLocaleString()}</span></span>
            )}
            <span>{paidCount}/{totalCount} pagadas</span>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {group.collections.map((c) => {
            const isPaid = c.status === 'paid';
            const dueDate = parseISO(c.due_date);
            const isOverdue = !isPaid && isPast(dueDate) && !isToday(dueDate);

            return (
              <div
                key={c.id}
                className={cn(
                  'rounded-lg border p-3 space-y-1.5',
                  isPaid && 'border-emerald-500/30 bg-emerald-500/5',
                  isOverdue && 'border-red-500/30 bg-red-500/5',
                  !isPaid && !isOverdue && 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">Cuota {c.installment_number}</span>
                  </div>
                  <span className="text-sm font-semibold">{sym}{Number(c.amount).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(dueDate, "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
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
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
