import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePaymentCollections, PaymentCollection, FREQUENCY_LABELS } from '@/hooks/use-payment-collections';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, Pencil, Trash2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CollectionsWidgetProps {
  clientId: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  overdue: { label: 'Vencido', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: AlertTriangle },
};

export const CollectionsWidget = ({ clientId }: CollectionsWidgetProps) => {
  const { collections, isLoading, updateCollection, deleteCollection } = usePaymentCollections(clientId);
  const [activeTab, setActiveTab] = useState('pending');
  const [editingCollection, setEditingCollection] = useState<PaymentCollection | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Auto-mark overdue
  const enrichedCollections = useMemo(() => {
    return collections.map(c => {
      if (c.status === 'pending' && isPast(parseISO(c.due_date)) && !isToday(parseISO(c.due_date))) {
        return { ...c, status: 'overdue' as const };
      }
      return c;
    });
  }, [collections]);

  const pendingCollections = useMemo(() => enrichedCollections.filter(c => c.status === 'pending' || c.status === 'overdue'), [enrichedCollections]);
  const paidCollections = useMemo(() => enrichedCollections.filter(c => c.status === 'paid'), [enrichedCollections]);

  const totalPending = pendingCollections.reduce((sum, c) => sum + Number(c.amount), 0);
  const overdueCount = pendingCollections.filter(c => c.status === 'overdue').length;

  const handleMarkPaid = async (collection: PaymentCollection) => {
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

  const handleOpenEdit = (c: PaymentCollection) => {
    setEditingCollection(c);
    setEditAmount(String(c.amount));
    setEditDueDate(c.due_date);
    setEditNotes(c.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCollection) return;
    try {
      await updateCollection.mutateAsync({
        id: editingCollection.id,
        updates: {
          amount: parseFloat(editAmount) || editingCollection.amount,
          due_date: editDueDate,
          notes: editNotes || null,
        },
      });
      toast.success('Cobro actualizado');
      setEditingCollection(null);
    } catch {
      toast.error('Error al actualizar');
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

  if (collections.length === 0) return null;

  const renderCollection = (c: PaymentCollection) => {
    const statusConfig = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    const isOverdue = c.status === 'overdue';
    const currencySymbol = c.currency === 'CRC' ? '₡' : '$';

    return (
      <div
        key={c.id}
        className={cn(
          'rounded-lg border p-3 space-y-2 transition-all',
          isOverdue ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px] gap-1', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Cuota {c.installment_number}
            </span>
          </div>
          <span className="text-sm font-semibold">
            {currencySymbol}{Number(c.amount).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {format(parseISO(c.due_date), "d 'de' MMMM, yyyy", { locale: es })}
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

        <div className="flex items-center gap-1.5 pt-1">
          {c.status !== 'paid' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] gap-1 text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => handleMarkPaid(c)}
              disabled={updateCollection.isPending}
            >
              <CheckCircle2 className="h-3 w-3" /> Cobrado
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] gap-1"
            onClick={() => handleOpenEdit(c)}
          >
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteTarget(c.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
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
            <div className="flex items-center gap-3 text-xs">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
              <span className="text-muted-foreground">
                Pendiente: <span className="font-medium text-foreground">{pendingCollections.length > 0 ? `${pendingCollections[0].currency === 'CRC' ? '₡' : '$'}${totalPending.toLocaleString()}` : '$0'}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="text-xs">
                Pendientes ({pendingCollections.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-xs">
                Pagados ({paidCollections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingCollections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay cobros pendientes 🎉</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {pendingCollections.map(renderCollection)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paid">
              {paidCollections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay cobros pagados aún</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {paidCollections.map(renderCollection)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => { if (!open) setEditingCollection(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Cobro — Cuota {editingCollection?.installment_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Monto</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Fecha de cobro</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 justify-start text-left text-sm font-normal">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editDueDate
                      ? format(parseISO(editDueDate), "d 'de' MMMM, yyyy", { locale: es })
                      : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDueDate ? parseISO(editDueDate) : undefined}
                    onSelect={(date) => { if (date) setEditDueDate(format(date, 'yyyy-MM-dd')); }}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notas</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Notas opcionales..."
                className="text-sm min-h-[60px]"
              />
            </div>
            <Button onClick={handleSaveEdit} disabled={updateCollection.isPending} className="w-full text-xs">
              {updateCollection.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
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
