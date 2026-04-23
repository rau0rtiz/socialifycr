import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bookmark,
  CalendarDays,
  DollarSign,
  Phone,
  Mail,
  Pencil,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  Clock,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useLeadReservations,
  LeadReservation,
  getReservationUrgency,
  getDaysRemaining,
  ReservationUrgency,
} from '@/hooks/use-lead-reservations';
import { ReservationFormDialog } from './ReservationFormDialog';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';

interface ReservationsWidgetProps {
  clientId: string;
  /** Called when user wants to convert a reservation into a sale */
  onConvertToSale?: (reservation: LeadReservation) => void;
}

const URGENCY_STYLES: Record<ReservationUrgency, { border: string; bg: string; badge: string; label: string }> = {
  green: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    label: 'Activa',
  },
  yellow: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    label: 'Activa',
  },
  orange: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/5',
    badge: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40',
    label: 'Por vencer',
  },
  red: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40',
    label: 'Vencida',
  },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  converted: 'Convertida',
  lost: 'Perdida',
  expired: 'Vencida',
};

type FilterTab = 'active' | 'expired' | 'all';

const formatMoney = (amount: number, currency: string) =>
  `${currency === 'CRC' ? '₡' : '$'}${Number(amount).toLocaleString()}`;

export const ReservationsWidget = ({ clientId, onConvertToSale }: ReservationsWidgetProps) => {
  const { reservations, isLoading, update, remove } = useLeadReservations(clientId);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [editing, setEditing] = useState<LeadReservation | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LeadReservation | null>(null);
  const [lostCandidate, setLostCandidate] = useState<LeadReservation | null>(null);

  const filtered = useMemo(() => {
    const list = reservations.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'active') return r.status === 'active';
      if (filter === 'expired') return r.status === 'expired' || (r.status === 'active' && getDaysRemaining(r.expires_at) < 0);
      return true;
    });
    // Sort: active urgent first; for "all" keep recently updated on top within status group
    return list.sort((a, b) => {
      const da = getDaysRemaining(a.expires_at);
      const db = getDaysRemaining(b.expires_at);
      return da - db;
    });
  }, [reservations, filter]);

  const counts = useMemo(() => {
    const active = reservations.filter((r) => r.status === 'active').length;
    const expired = reservations.filter(
      (r) => r.status === 'expired' || (r.status === 'active' && getDaysRemaining(r.expires_at) < 0),
    ).length;
    return { active, expired, all: reservations.length };
  }, [reservations]);

  const totalDeposit = useMemo(() => {
    const usd = reservations
      .filter((r) => r.status === 'active' && r.currency === 'USD')
      .reduce((s, r) => s + Number(r.deposit_amount), 0);
    const crc = reservations
      .filter((r) => r.status === 'active' && r.currency === 'CRC')
      .reduce((s, r) => s + Number(r.deposit_amount), 0);
    return { usd, crc };
  }, [reservations]);

  const handleMarkLost = async (r: LeadReservation) => {
    try {
      await update.mutateAsync({ id: r.id, status: 'lost' } as any);
      toast.success('Reserva marcada como perdida');
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setLostCandidate(null);
    }
  };

  const handleDelete = async (r: LeadReservation) => {
    try {
      await remove.mutateAsync(r.id);
      toast.success('Reserva eliminada');
    } catch (e: any) {
      toast.error(e?.message || 'Error eliminando');
    } finally {
      setDeleteCandidate(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              Reservas
            </CardTitle>
            <CardDescription className="text-xs">
              Espacios apartados con depósito (3 meses máximo)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {(totalDeposit.usd > 0 || totalDeposit.crc > 0) && (
              <div className="text-right text-xs text-muted-foreground hidden md:block">
                <div className="text-[10px] uppercase tracking-wider">Depósitos activos</div>
                <div className="font-semibold text-foreground">
                  {totalDeposit.usd > 0 && <span>${totalDeposit.usd.toLocaleString()}</span>}
                  {totalDeposit.usd > 0 && totalDeposit.crc > 0 && <span className="mx-1">·</span>}
                  {totalDeposit.crc > 0 && <span>₡{totalDeposit.crc.toLocaleString()}</span>}
                </div>
              </div>
            )}
            <Button size="sm" onClick={() => setCreating(true)} className="h-9">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva reserva
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mt-3">
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-xs h-7">
              Activas ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="expired" className="text-xs h-7">
              Vencidas ({counts.expired})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-7">
              Todas ({counts.all})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Cargando reservas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter === 'active' && 'No hay reservas activas'}
              {filter === 'expired' && 'No hay reservas vencidas'}
              {filter === 'all' && 'Aún no se han creado reservas'}
            </p>
            {filter === 'active' && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Crear primera reserva
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((r) => {
              const urgency = getReservationUrgency(r.expires_at, r.status);
              const daysLeft = getDaysRemaining(r.expires_at);
              const styles = URGENCY_STYLES[urgency];
              const isClosed = r.status === 'converted' || r.status === 'lost';

              return (
                <div
                  key={r.id}
                  className={cn(
                    'relative rounded-xl border-2 p-4 transition-all hover:shadow-md',
                    isClosed
                      ? 'border-border bg-muted/30 opacity-75'
                      : `${styles.border} ${styles.bg}`,
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {r.customer_name}
                      </h4>
                      {r.product_name && (
                        <p className="text-xs text-muted-foreground truncate">{r.product_name}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] shrink-0 border',
                        isClosed
                          ? 'bg-muted text-muted-foreground border-border'
                          : styles.badge,
                      )}
                    >
                      {isClosed ? STATUS_LABELS[r.status] : styles.label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{formatMoney(r.deposit_amount, r.currency)}</span>
                      <span className="text-muted-foreground">de depósito</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>
                        Reservado: {format(new Date(r.reserved_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Vence: {format(new Date(r.expires_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                      {!isClosed && (
                        <span
                          className={cn(
                            'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                            urgency === 'red' && 'bg-red-500/15 text-red-700 dark:text-red-400',
                            urgency === 'orange' && 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
                            urgency === 'yellow' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                            urgency === 'green' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d vencida` : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                    {(r.customer_phone || r.customer_email) && (
                      <div className="flex items-center gap-2 text-muted-foreground pt-0.5">
                        {r.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{r.customer_phone}</span>
                          </span>
                        )}
                        {r.customer_email && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{r.customer_email}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-0.5 border-t border-border/50 mt-1.5 pt-1.5">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  {!isClosed && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                      {onConvertToSale && (
                        <Button
                          size="sm"
                          className="h-7 text-[11px] flex-1 min-w-[100px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onConvertToSale(r)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Convertir en venta
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => setEditing(r)}
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => setLostCandidate(r)}
                        title="Marcar como perdida"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteCandidate(r)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      {creating && (
        <ReservationFormDialog
          open={creating}
          onOpenChange={setCreating}
          clientId={clientId}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <ReservationFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          clientId={clientId}
          editing={editing}
        />
      )}

      {/* Mark lost confirm */}
      <AlertDialog open={!!lostCandidate} onOpenChange={(o) => !o && setLostCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar reserva como perdida?</AlertDialogTitle>
            <AlertDialogDescription>
              {lostCandidate && (
                <>
                  La reserva de <strong>{lostCandidate.customer_name}</strong> quedará marcada como perdida y desaparecerá de las activas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault();
                if (lostCandidate) handleMarkLost(lostCandidate);
              }}
            >
              Marcar como perdida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(o) => !o && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate && (
                <>
                  Se eliminará permanentemente la reserva de <strong>{deleteCandidate.customer_name}</strong>. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteCandidate) handleDelete(deleteCandidate);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
