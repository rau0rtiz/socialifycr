import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePaymentCollections, SaleGroup, EnrichedCollection } from '@/hooks/use-payment-collections';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, DollarSign, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CollectionDetailDialog } from './CollectionDetailDialog';

interface CollectionsWidgetProps {
  clientId: string;
}

type DateCategory = 'overdue' | 'today' | 'upcoming';

interface CategorizedGroup {
  group: SaleGroup;
  category: DateCategory;
  daysLabel: string;
}

export const CollectionsWidget = ({ clientId }: CollectionsWidgetProps) => {
  const { saleGroups, isLoading, updateCollection, deleteCollection } = usePaymentCollections(clientId);
  const [selectedGroup, setSelectedGroup] = useState<SaleGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Only show groups with pending collections
  const activeGroups = useMemo(() => saleGroups.filter(g => !g.allPaid), [saleGroups]);

  const categorized = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const result: CategorizedGroup[] = [];

    for (const group of activeGroups) {
      const next = group.nextPendingCollection;
      if (!next) continue;
      const dueDate = parseISO(next.due_date);
      const diff = differenceInDays(dueDate, today);

      if (next.due_date === todayStr || isToday(dueDate)) {
        result.push({ group, category: 'today', daysLabel: 'Hoy' });
      } else if (isPast(dueDate)) {
        const overdueDays = Math.abs(diff);
        result.push({ group, category: 'overdue', daysLabel: `${overdueDays}d vencido` });
      } else {
        result.push({ group, category: 'upcoming', daysLabel: `en ${diff}d` });
      }
    }
    return result;
  }, [activeGroups]);

  const overdue = categorized.filter(c => c.category === 'overdue');
  const todayItems = categorized.filter(c => c.category === 'today');
  const upcoming = categorized.filter(c => c.category === 'upcoming');

  const totalPending = activeGroups.reduce((sum, g) => {
    const pending = g.collections.filter(c => c.status !== 'paid');
    return sum + pending.reduce((s, c) => s + Number(c.amount), 0);
  }, 0);

  const mainCurrency = activeGroups[0]?.currency || 'USD';
  const currencySymbol = mainCurrency === 'CRC' ? '₡' : '$';

  const handleMarkPaid = async (collection: EnrichedCollection) => {
    try {
      await updateCollection.mutateAsync({
        id: collection.id,
        updates: { status: 'paid', paid_at: new Date().toISOString() },
      });
      toast.success(`Cuota ${collection.installment_number} marcada como pagada`);
    } catch {
      toast.error('Error al actualizar cobro');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCollection.mutateAsync(deleteTarget);
      toast.success('Cobro eliminado');
      setDeleteTarget(null);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Cobros</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Cargando...</p></CardContent>
      </Card>
    );
  }

  const renderPersonCard = ({ group, daysLabel, category }: CategorizedGroup) => {
    const next = group.nextPendingCollection!;
    const sym = group.currency === 'CRC' ? '₡' : '$';
    return (
      <button
        key={group.saleId}
        onClick={() => setSelectedGroup(group)}
        className={cn(
          'rounded-lg border p-3 text-left transition-all hover:shadow-md w-full',
          category === 'overdue' && 'border-red-500/40 bg-red-500/5',
          category === 'today' && 'border-amber-500/40 bg-amber-500/5',
          category === 'upcoming' && 'border-border bg-card hover:bg-muted/50',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{group.customerName}</span>
          <span className={cn(
            'text-[10px] font-medium shrink-0',
            category === 'overdue' && 'text-red-600 dark:text-red-400',
            category === 'today' && 'text-amber-600 dark:text-amber-400',
            category === 'upcoming' && 'text-muted-foreground',
          )}>
            {daysLabel}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground truncate">
            {group.product || 'Sin producto'}
          </span>
          <span className="text-sm font-semibold">
            {sym}{Number(next.amount).toLocaleString()}
          </span>
        </div>
      </button>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, items: CategorizedGroup[], color: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={cn('text-xs font-semibold uppercase tracking-wider', color)}>
            {title} ({items.length})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map(item => renderPersonCard(item))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Cobros
            </CardTitle>
            {activeGroups.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Pendiente: <span className="font-medium text-foreground">{currencySymbol}{totalPending.toLocaleString()}</span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay cobros pendientes 🎉
            </p>
          ) : (
            <>
              {renderSection(
                'Vencidos',
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
                overdue,
                'text-red-600 dark:text-red-400'
              )}
              {renderSection(
                'Hoy',
                <CalendarDays className="h-3.5 w-3.5 text-amber-500" />,
                todayItems,
                'text-amber-600 dark:text-amber-400'
              )}
              {renderSection(
                'Próximos',
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
                upcoming,
                'text-muted-foreground'
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Person detail dialog */}
      {selectedGroup && (
        <CollectionDetailDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => { if (!open) setSelectedGroup(null); }}
          onMarkPaid={handleMarkPaid}
          onDelete={(id) => setDeleteTarget(id)}
          isPending={updateCollection.isPending}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este cobro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
