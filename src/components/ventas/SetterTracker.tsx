import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSetterAppointments, SetterAppointment, AppointmentStatus } from '@/hooks/use-setter-appointments';
import { useClientSetters } from '@/hooks/use-client-setters';
import { AppointmentFormDialog } from './AppointmentFormDialog';
import { LeadDetailDialog } from './LeadDetailDialog';
import { LeadSourceWidget } from './LeadSourceWidget';
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

import { toast } from 'sonner';
import {
  UserPlus, User, DollarSign,
  Trash2, Pencil, TrendingUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, ShoppingCart, ThumbsDown, PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


interface SetterTrackerProps {
  clientId: string;
  hasAdAccount?: boolean;
  onConvertToSale?: (appointment: SetterAppointment) => void;
  periodStartIso?: string;
}

const STATUS_CONFIG: Record<AppointmentStatus | 'not_sold', { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: CheckCircle2 },
  completed: { label: 'Realizada', color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30', icon: CheckCircle2 },
  no_show: { label: 'No Show', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: XCircle },
  sold: { label: 'Venta', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: DollarSign },
  not_sold: { label: 'No Vendido', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30', icon: ThumbsDown },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-border', icon: AlertTriangle },
};

export const SetterTracker = ({ clientId, hasAdAccount, onConvertToSale }: SetterTrackerProps) => {
  const [period, setPeriod] = useState('last_30d');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SetterAppointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [detailLead, setDetailLead] = useState<SetterAppointment | null>(null);

  // No-sale confirmation state
  const [noSaleTarget, setNoSaleTarget] = useState<SetterAppointment | null>(null);
  const [noSaleReason, setNoSaleReason] = useState('');

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useSetterAppointments(clientId, period);
  const { setterNames: existingSetters } = useClientSetters(clientId);

  // Split appointments
  const activeAppointments = useMemo(() => 
    appointments.filter(a => a.status !== 'not_sold' as any), 
    [appointments]
  );
  const lostAppointments = useMemo(() => 
    appointments.filter(a => (a.status as string) === 'not_sold'), 
    [appointments]
  );

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const scheduled = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed' || a.status === 'sold' || (a.status as string) === 'not_sold').length;
    const noShows = appointments.filter(a => a.status === 'no_show').length;
    const sold = appointments.filter(a => a.status === 'sold').length;
    const notSold = appointments.filter(a => (a.status as string) === 'not_sold').length;
    const soldValue = appointments.filter(a => a.status === 'sold').reduce((sum, a) => {
      const val = a.currency === 'USD' ? (a.estimated_value || 0) : (a.estimated_value || 0) / 520;
      return sum + val;
    }, 0);
    const closedCalls = sold + notSold;
    const showRate = total > 0 ? ((completed) / (completed + noShows)) * 100 : 0;
    const closeRate = closedCalls > 0 ? (sold / closedCalls) * 100 : 0;

    return { total, scheduled, completed, noShows, sold, notSold, soldValue, showRate, closeRate };
  }, [appointments]);


  const handleSubmit = async (input: any) => {
    try {
      if (editing) {
        await updateAppointment.mutateAsync({ id: editing.id, ...input });
        toast.success('Lead actualizado');
      } else {
        await addAppointment.mutateAsync(input);
        toast.success('Lead registrado');
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error('Error guardando lead');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment.mutateAsync(id);
      toast.success('Lead eliminado');
      setConfirmDelete(null);
    } catch {
      toast.error('Error eliminando lead');
    }
  };

  const handleStatusChange = async (appointment: SetterAppointment, newStatus: AppointmentStatus | 'not_sold') => {
    if (newStatus === 'sold') {
      if (onConvertToSale) onConvertToSale(appointment);
      return;
    }
    if (newStatus === 'not_sold') {
      setNoSaleTarget(appointment);
      setNoSaleReason('');
      return;
    }
    try {
      await updateAppointment.mutateAsync({ id: appointment.id, status: newStatus } as any);
      toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  const confirmNoSale = async () => {
    if (!noSaleTarget) return;
    try {
      await updateAppointment.mutateAsync({
        id: noSaleTarget.id,
        status: 'not_sold' as any,
        notes: noSaleReason ? `❌ Motivo: ${noSaleReason}` : noSaleTarget.notes,
      } as any);
      toast.success('Lead marcado como no vendido');
      setNoSaleTarget(null);
      setNoSaleReason('');
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  // Compact lead card - shows only name, sales call date, and status badge
  const renderCompactLeadCard = (apt: SetterAppointment) => {
    const status = apt.status as AppointmentStatus | 'not_sold';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
    const StatusIcon = cfg.icon;
    const salesCallDate = (apt as any).sales_call_date;
    const canConvertToSale = apt.status !== 'sold' && (apt.status as string) !== 'not_sold' && apt.status !== 'cancelled';

    return (
      <div
        key={apt.id}
        className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card group"
      >
        <div className={cn('p-1.5 rounded-md border', cfg.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
        </div>

        {/* Clickable name */}
        <button
          className="flex-1 min-w-0 text-left hover:underline"
          onClick={() => setDetailLead(apt)}
        >
          <span className="text-sm font-medium truncate block">{apt.lead_name}</span>
          {salesCallDate ? (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <PhoneCall className="h-2.5 w-2.5" />
              {format(new Date(salesCallDate), "dd MMM, HH:mm", { locale: es })}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(apt.appointment_date), "dd MMM", { locale: es })}
            </span>
          )}
        </button>

        <Badge variant="outline" className={cn('text-[10px] border shrink-0', cfg.color)}>
          {cfg.label}
        </Badge>

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canConvertToSale && onConvertToSale && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => onConvertToSale(apt)}
            >
              <ShoppingCart className="h-3 w-3" />
            </Button>
          )}
          {canConvertToSale && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-1.5 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
              onClick={() => handleStatusChange(apt, 'not_sold')}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          )}
          <Select
            value={apt.status}
            onValueChange={v => handleStatusChange(apt, v as any)}
          >
            <SelectTrigger className="h-6 text-[10px] w-20 border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                <SelectItem key={val} value={val} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditing(apt); setShowForm(true); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          {confirmDelete === apt.id ? (
            <div className="flex gap-0.5">
              <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDelete(apt.id)}>Sí</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setConfirmDelete(null)}>No</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(apt.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Setter & Pipeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7d" className="text-xs">Últimos 7 días</SelectItem>
                  <SelectItem value="last_30d" className="text-xs">Últimos 30 días</SelectItem>
                  <SelectItem value="this_month" className="text-xs">Este mes</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" onClick={() => { setEditing(null); setShowForm(true); }}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Nuevo Lead
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatsCard label="Leads" value={stats.total} sub={`${stats.scheduled} pendientes`} icon={UserPlus} />
            <StatsCard label="Show Rate" value={`${stats.showRate.toFixed(0)}%`} sub={`${stats.noShows} no shows`} icon={TrendingUp} />
            <StatsCard label="Close Rate" value={`${stats.closeRate.toFixed(0)}%`} sub={`${stats.sold} ventas`} icon={CheckCircle2} />
            <StatsCard label="No Vendidos" value={stats.notSold} sub={`de ${stats.sold + stats.notSold} cerrados`} icon={ThumbsDown} />
            <StatsCard
              label="Ventas Cerradas"
              value={`$${stats.soldValue.toLocaleString('en', { maximumFractionDigits: 0 })}`}
              sub={`${stats.sold} ventas`}
              icon={DollarSign}
            />
          </div>

          {/* Lead source breakdown */}
          <LeadSourceWidget appointments={appointments} />

          {/* Tabs: Pipeline / No vendidos / Cierre por vendedor */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8">
              <TabsTrigger value="pipeline" className="text-xs">Pipeline ({activeAppointments.length})</TabsTrigger>
              <TabsTrigger value="lost" className="text-xs">No vendidos ({lostAppointments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="mt-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-xs">Cargando...</div>
              ) : activeAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin leads registrados</p>
                  <p className="text-xs mt-1">Registra leads para trackear tu pipeline de ventas.</p>
                </div>
              ) : (
                <div className="space-y-1.5">{activeAppointments.map(renderCompactLeadCard)}</div>
              )}
            </TabsContent>

            <TabsContent value="lost" className="mt-3">
              {lostAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ThumbsDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin leads perdidos</p>
                  <p className="text-xs mt-1">Los leads marcados como "No vendido" aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-1.5">{lostAppointments.map(renderCompactLeadCard)}</div>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <LeadDetailDialog
        open={!!detailLead}
        onOpenChange={(open) => { if (!open) setDetailLead(null); }}
        appointment={detailLead}
        onUpdateChecklist={async (id, updates) => {
          try {
            await updateAppointment.mutateAsync({ id, ...updates } as any);
            toast.success('Checklist actualizado');
          } catch {
            toast.error('Error actualizando checklist');
          }
        }}
      />

      {/* No-sale confirmation dialog */}
      <AlertDialog open={!!noSaleTarget} onOpenChange={(open) => { if (!open) { setNoSaleTarget(null); setNoSaleReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como no vendido?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás marcando a <strong>{noSaleTarget?.lead_name}</strong> como no vendido. Por favor indica el motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="¿Por qué no se concretó la venta? (requerido)"
            value={noSaleReason}
            onChange={(e) => setNoSaleReason(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNoSale}
              disabled={!noSaleReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              Confirmar no vendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppointmentFormDialog
        open={showForm}
        onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}
        onSubmit={handleSubmit}
        clientId={clientId}
        hasAdAccount={hasAdAccount}
        isSubmitting={addAppointment.isPending || updateAppointment.isPending}
        editing={editing}
        existingSetters={existingSetters}
      />
    </>
  );
};

// Small stats card
const StatsCard = ({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub: string; icon: React.ElementType }) => (
  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);
