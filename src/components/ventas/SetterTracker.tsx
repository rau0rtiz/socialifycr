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

export const SetterTracker = ({ clientId, hasAdAccount, onConvertToSale, periodStartIso }: SetterTrackerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SetterAppointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [detailLead, setDetailLead] = useState<SetterAppointment | null>(null);

  // No-sale confirmation state
  const [noSaleTarget, setNoSaleTarget] = useState<SetterAppointment | null>(null);
  const [noSaleReason, setNoSaleReason] = useState('');

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useSetterAppointments(clientId, undefined, periodStartIso);
  const { setterNames: existingSetters } = useClientSetters(clientId);

  // Split appointments into sections
  const activeAppointments = useMemo(() => 
    appointments.filter(a => a.status !== 'not_sold' as any && a.status !== 'sold' && a.status !== 'no_show'), 
    [appointments]
  );
  const lostAppointments = useMemo(() => 
    appointments.filter(a => (a.status as string) === 'not_sold'), 
    [appointments]
  );
  const noShowAppointments = useMemo(() => 
    appointments.filter(a => a.status === 'no_show'), 
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
        not_sold_reason: noSaleReason || null,
      } as any);
      toast.success('Lead marcado como no vendido');
      setNoSaleTarget(null);
      setNoSaleReason('');
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  // Checklist readiness: count completed items out of 4
  const getChecklistReadiness = (apt: SetterAppointment) => {
    const items = [apt.checklist_quiz, apt.checklist_video, apt.checklist_whatsapp, apt.checklist_testimonials];
    const done = items.filter(Boolean).length;
    if (done === 4) return { level: 'ready' as const, label: 'Preparado', done, border: 'border-emerald-500/50', bg: 'bg-emerald-500/8', dot: 'bg-emerald-500' };
    if (done === 0) return { level: 'none' as const, label: 'Sin preparar', done, border: 'border-red-500/50', bg: 'bg-red-500/8', dot: 'bg-red-500' };
    return { level: 'partial' as const, label: `${done}/4 listo`, done, border: 'border-amber-500/50', bg: 'bg-amber-500/8', dot: 'bg-amber-500' };
  };

  // Grid card - shows only name and date with checklist color coding
  const renderLeadGridCard = (apt: SetterAppointment) => {
    const status = apt.status as AppointmentStatus | 'not_sold';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
    const StatusIcon = cfg.icon;
    const salesCallDate = (apt as any).sales_call_date;
    const readiness = getChecklistReadiness(apt);

    return (
      <div
        key={apt.id}
        className={cn(
          'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 hover:shadow-sm transition-all bg-card text-left group',
          readiness.border, readiness.bg
        )}
      >
        {/* Edit button - top right on hover */}
        <button
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
          onClick={(e) => { e.stopPropagation(); setEditing(apt); setShowForm(true); }}
          title="Editar lead"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Main clickable area */}
        <button
          className="flex flex-col items-start gap-1.5 w-full text-left"
          onClick={() => setDetailLead(apt)}
        >
          <div className="flex items-center justify-between w-full pr-5">
            <div className={cn('p-1 rounded-md border', cfg.color)}>
              <StatusIcon className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full shrink-0', readiness.dot)} title={readiness.label} />
              <Badge variant="outline" className={cn('text-[9px] border shrink-0 px-1.5 py-0', cfg.color)}>
                {cfg.label}
              </Badge>
            </div>
          </div>
          <span className="text-sm font-semibold truncate w-full">{apt.lead_name}</span>
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {salesCallDate ? (
                <>
                  <PhoneCall className="h-2.5 w-2.5" />
                  {format(new Date(salesCallDate), "dd MMM, HH:mm", { locale: es })}
                </>
              ) : (
                <>
                  <Clock className="h-2.5 w-2.5" />
                  {format(new Date(apt.appointment_date), "dd MMM", { locale: es })}
                </>
              )}
            </span>
            <span className={cn(
              'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
              readiness.level === 'ready' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
              readiness.level === 'partial' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
              readiness.level === 'none' && 'bg-red-500/15 text-red-700 dark:text-red-400',
            )}>
              {readiness.label}
            </span>
          </div>
        </button>
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
              Agendas
            </CardTitle>
            <div className="flex items-center gap-2">
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
             <TabsTrigger value="pipeline" className="text-xs">Agenda ({activeAppointments.length})</TabsTrigger>
              <TabsTrigger value="no_show" className="text-xs">No Show ({noShowAppointments.length})</TabsTrigger>
              <TabsTrigger value="lost" className="text-xs">No vendidos ({lostAppointments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="mt-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-xs">Cargando...</div>
              ) : activeAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin leads activos</p>
                  <p className="text-xs mt-1">Registra leads para trackear tu pipeline de ventas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{activeAppointments.map(renderLeadGridCard)}</div>
              )}
            </TabsContent>

            <TabsContent value="no_show" className="mt-3">
              {noShowAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin no shows</p>
                  <p className="text-xs mt-1">Los leads que no asistieron aparecerán aquí.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{noShowAppointments.map(renderLeadGridCard)}</div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{lostAppointments.map(renderLeadGridCard)}</div>
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
        onStatusChange={(id, status) => {
          setDetailLead(null);
          if (status === 'sold' && detailLead && onConvertToSale) {
            onConvertToSale(detailLead);
          } else if (status === 'not_sold' && detailLead) {
            setNoSaleTarget(detailLead);
            setNoSaleReason('');
          } else {
            handleStatusChange({ id } as any, status as any);
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
