import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSetterAppointments, SetterAppointment, AppointmentStatus } from '@/hooks/use-setter-appointments';
import { AppointmentFormDialog } from './AppointmentFormDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarPlus, Phone, Mail, User, DollarSign,
  Trash2, Pencil, CalendarClock, TrendingUp,
  CheckCircle2, XCircle, Clock, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetterTrackerProps {
  clientId: string;
  hasAdAccount?: boolean;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: CheckCircle2 },
  completed: { label: 'Realizada', color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30', icon: CheckCircle2 },
  no_show: { label: 'No Show', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: XCircle },
  sold: { label: 'Venta', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: DollarSign },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-border', icon: AlertTriangle },
};

export const SetterTracker = ({ clientId, hasAdAccount }: SetterTrackerProps) => {
  const [period, setPeriod] = useState('last_30d');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SetterAppointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useSetterAppointments(clientId, period);

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const scheduled = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed' || a.status === 'sold').length;
    const noShows = appointments.filter(a => a.status === 'no_show').length;
    const sold = appointments.filter(a => a.status === 'sold').length;
    const totalEstimated = appointments.reduce((sum, a) => {
      const val = a.currency === 'USD' ? a.estimated_value : a.estimated_value / 520;
      return sum + val;
    }, 0);
    const soldValue = appointments.filter(a => a.status === 'sold').reduce((sum, a) => {
      const val = a.currency === 'USD' ? a.estimated_value : a.estimated_value / 520;
      return sum + val;
    }, 0);
    const showRate = total > 0 ? ((completed + sold) / (completed + sold + noShows)) * 100 : 0;
    const closeRate = (completed + sold) > 0 ? (sold / (completed + sold)) * 100 : 0;

    return { total, scheduled, completed, noShows, sold, totalEstimated, soldValue, showRate, closeRate };
  }, [appointments]);

  const handleSubmit = async (input: any) => {
    try {
      if (editing) {
        await updateAppointment.mutateAsync({ id: editing.id, ...input });
        toast.success('Agenda actualizada');
      } else {
        await addAppointment.mutateAsync(input);
        toast.success('Agenda registrada');
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error('Error guardando agenda');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment.mutateAsync(id);
      toast.success('Agenda eliminada');
      setConfirmDelete(null);
    } catch {
      toast.error('Error eliminando agenda');
    }
  };

  const handleStatusChange = async (appointment: SetterAppointment, newStatus: AppointmentStatus) => {
    try {
      await updateAppointment.mutateAsync({ id: appointment.id, status: newStatus } as any);
      toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Setter & Agendas
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
                <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                Nueva Agenda
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="Agendas" value={stats.total} sub={`${stats.scheduled} pendientes`} icon={CalendarClock} />
            <StatsCard label="Show Rate" value={`${stats.showRate.toFixed(0)}%`} sub={`${stats.noShows} no shows`} icon={TrendingUp} />
            <StatsCard label="Close Rate" value={`${stats.closeRate.toFixed(0)}%`} sub={`${stats.sold} ventas`} icon={CheckCircle2} />
            <StatsCard
              label="Pipeline"
              value={`$${stats.totalEstimated.toLocaleString('en', { maximumFractionDigits: 0 })}`}
              sub={`$${stats.soldValue.toLocaleString('en', { maximumFractionDigits: 0 })} cerrado`}
              icon={DollarSign}
            />
          </div>

          {/* Appointments list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">Cargando...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin agendas registradas</p>
              <p className="text-xs mt-1">Registra agendas para trackear tu pipeline de ventas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map(apt => {
                const cfg = STATUS_CONFIG[apt.status as AppointmentStatus] || STATUS_CONFIG.scheduled;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={apt.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card"
                  >
                    {/* Status icon */}
                    <div className={cn('p-1.5 rounded-md border', cfg.color)}>
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{apt.lead_name}</span>
                        <Badge variant="outline" className={cn('text-[10px] border', cfg.color)}>
                          {cfg.label}
                        </Badge>
                        {apt.setter_name && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" /> {apt.setter_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <CalendarClock className="h-2.5 w-2.5" />
                          {format(new Date(apt.appointment_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                        {apt.lead_phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-2.5 w-2.5" /> {apt.lead_phone}
                          </span>
                        )}
                        {apt.lead_email && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-2.5 w-2.5" /> {apt.lead_email}
                          </span>
                        )}
                      </div>
                      {apt.ad_name && (
                        <p className="text-[10px] text-muted-foreground">
                          📢 {apt.ad_name} — {apt.ad_campaign_name}
                        </p>
                      )}
                      {apt.estimated_value > 0 && (
                        <p className="text-xs font-medium text-foreground">
                          {apt.currency === 'CRC' ? '₡' : '$'}
                          {apt.estimated_value.toLocaleString()}
                        </p>
                      )}
                      {apt.notes && (
                        <p className="text-[10px] text-muted-foreground italic">{apt.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Quick status change */}
                      <Select
                        value={apt.status}
                        onValueChange={v => handleStatusChange(apt, v as AppointmentStatus)}
                      >
                        <SelectTrigger className="h-6 text-[10px] w-24 border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                            <SelectItem key={val} value={val} className="text-xs">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => { setEditing(apt); setShowForm(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {confirmDelete === apt.id ? (
                        <div className="flex gap-0.5">
                          <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDelete(apt.id)}>
                            Sí
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setConfirmDelete(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDelete(apt.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentFormDialog
        open={showForm}
        onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}
        onSubmit={handleSubmit}
        clientId={clientId}
        hasAdAccount={hasAdAccount}
        isSubmitting={addAppointment.isPending || updateAppointment.isPending}
        editing={editing}
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
