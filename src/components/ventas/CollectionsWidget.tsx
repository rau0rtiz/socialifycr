import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePaymentCollections, SaleGroup, EnrichedCollection } from '@/hooks/use-payment-collections';
import { toast } from 'sonner';
import { Clock, AlertTriangle, DollarSign, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CollectionDetailDialog } from './CollectionDetailDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollectionsWidgetProps {
  clientId: string;
}

type ColumnType = 'overdue' | 'today' | 'upcoming';

interface ColumnItem {
  group: SaleGroup;
  daysLabel: string;
}

interface ColumnDef {
  key: ColumnType;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  headerBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'overdue',
    title: 'Vencido',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/30',
    headerBg: 'bg-red-500/10',
  },
  {
    key: 'today',
    title: 'Hoy',
    icon: <CalendarDays className="h-3.5 w-3.5" />,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
  },
  {
    key: 'upcoming',
    title: 'Próximo',
    icon: <Clock className="h-3.5 w-3.5" />,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/30',
    borderClass: 'border-border',
    headerBg: 'bg-muted/50',
  },
];

export const CollectionsWidget = ({ clientId }: CollectionsWidgetProps) => {
  const { saleGroups, isLoading, updateCollection, deleteCollection } = usePaymentCollections(clientId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Derive selectedGroup from latest data so it updates after mutations
  const selectedGroup = selectedGroupId
    ? saleGroups.find(g => g.saleId === selectedGroupId) || null
    : null;
  const isMobile = useIsMobile();

  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    const overdueItems: ColumnItem[] = [];
    const todayItems: ColumnItem[] = [];
    const upcomingItems: ColumnItem[] = [];

    for (const group of saleGroups) {
      // Skip completed groups — evidence stays on the sale card only
      if (group.allPaid) continue;

      const next = group.nextPendingCollection;
      if (!next) continue;
      const dueDate = parseISO(next.due_date);
      const diff = differenceInDays(dueDate, now);

      if (next.due_date === todayStr || isToday(dueDate)) {
        todayItems.push({ group, daysLabel: 'Hoy' });
      } else if (isPast(dueDate)) {
        overdueItems.push({ group, daysLabel: `${Math.abs(diff)}d vencido` });
      } else {
        upcomingItems.push({ group, daysLabel: `en ${diff}d` });
      }
    }

    return { overdue: overdueItems, today: todayItems, upcoming: upcomingItems };
  }, [saleGroups]);

  const columnData: Record<ColumnType, ColumnItem[]> = { overdue, today, upcoming };

  const getColumnTotal = (items: ColumnItem[]) => {
    return items.reduce((sum, item) => {
      const next = item.group.nextPendingCollection;
      return sum + (next ? Number(next.amount) : 0);
    }, 0);
  };

  const totalPending = saleGroups.filter(g => !g.allPaid).reduce((sum, g) => sum + g.totalPending, 0);
  const mainCurrency = saleGroups[0]?.currency || 'USD';
  const sym = mainCurrency === 'CRC' ? '₡' : '$';

  const handleMarkPaid = async (collection: EnrichedCollection) => {
    try {
      await updateCollection.mutateAsync({
        id: collection.id,
        updates: { status: 'paid', paid_at: new Date().toISOString() },
        saleId: collection.sale_id,
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

  const renderPersonCard = ({ group, daysLabel }: ColumnItem, colDef: ColumnDef) => {
    const next = group.nextPendingCollection;
    const cardSym = group.currency === 'CRC' ? '₡' : '$';
    const progressPct = group.totalCount > 0 ? (group.paidCount / group.totalCount) * 100 : 0;

    return (
      <button
        key={group.saleId}
        onClick={() => setSelectedGroupId(group.saleId)}
        className={cn(
          'rounded-lg border p-3 text-left transition-all hover:shadow-md w-full space-y-2',
          colDef.borderClass,
          colDef.bgClass,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{group.customerName}</span>
          <span className={cn('text-[10px] font-medium shrink-0', colDef.colorClass)}>
            {daysLabel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            {group.product || 'Sin producto'}
          </span>
          {next && (
            <span className="text-sm font-semibold">
              {cardSym}{Number(next.amount).toLocaleString()}
            </span>
          )}
        </div>
        {/* Progress */}
        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground">
            {group.paidCount}/{group.totalCount} cuotas
          </span>
        </div>
      </button>
    );
  };

  const renderColumn = (colDef: ColumnDef) => {
    const items = columnData[colDef.key];
    const colTotal = getColumnTotal(items);

    return (
      <div key={colDef.key} className="flex flex-col min-w-0 flex-1">
        {/* Column Header */}
        <div className={cn('rounded-t-lg px-3 py-2.5 border border-b-0', colDef.borderClass, colDef.headerBg)}>
          <div className="flex items-center gap-1.5">
            <span className={colDef.colorClass}>{colDef.icon}</span>
            <span className={cn('text-xs font-semibold uppercase tracking-wider', colDef.colorClass)}>
              {colDef.title}
            </span>
            <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
              {items.length}
            </Badge>
          </div>
          {colTotal > 0 && (
            <p className={cn('text-xs font-medium mt-1', colDef.colorClass)}>
              {sym}{colTotal.toLocaleString()}
            </p>
          )}
        </div>
        {/* Column Body */}
        <div className={cn('rounded-b-lg border border-t-0 flex-1', colDef.borderClass)}>
          <ScrollArea className="h-[280px]">
            <div className="p-2 space-y-2">
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  Sin cobros
                </p>
              ) : (
                items.map(item => renderPersonCard(item, colDef))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Mobile: tabs
  const renderMobileTabs = () => (
    <Tabs defaultValue="overdue" className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        {COLUMNS.map(col => (
          <TabsTrigger key={col.key} value={col.key} className="text-[10px] gap-1 px-1">
            <span className={col.colorClass}>{col.icon}</span>
            <span className="hidden xs:inline">{col.title}</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">
              {columnData[col.key].length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
      {COLUMNS.map(col => (
        <TabsContent key={col.key} value={col.key} className="mt-2">
          <div className="space-y-2">
            {columnData[col.key].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin cobros</p>
            ) : (
              columnData[col.key].map(item => renderPersonCard(item, col))
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );

  const hasAnyCollections = saleGroups.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Cobros
            </CardTitle>
            {hasAnyCollections && (
              <span className="text-xs text-muted-foreground">
                Pendiente: <span className="font-medium text-foreground">{sym}{totalPending.toLocaleString()}</span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasAnyCollections ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay cobros registrados
            </p>
          ) : isMobile ? (
            renderMobileTabs()
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {COLUMNS.map(col => renderColumn(col))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <CollectionDetailDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => { if (!open) setSelectedGroupId(null); }}
          onMarkPaid={handleMarkPaid}
          onDelete={(id) => setDeleteTarget(id)}
          isPending={updateCollection.isPending}
        />
      )}

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
