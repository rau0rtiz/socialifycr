import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SetterAppointment, AppointmentStatus } from '@/hooks/use-setter-appointments';
import { User, Phone, Mail, Package, Target, Megaphone, CalendarDays, DollarSign, FileText, Clock, PhoneCall } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: SetterAppointment | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  confirmed: { label: 'Confirmada', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  completed: { label: 'Realizada', color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  no_show: { label: 'No Show', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  sold: { label: 'Venta', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  not_sold: { label: 'No Vendido', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-border' },
};

const SOURCE_LABELS: Record<string, string> = {
  ads: 'Publicidad',
  organic: 'Orgánico',
  referral: 'Referencia',
  other: 'Otro',
};

export const LeadDetailDialog = ({ open, onOpenChange, appointment }: LeadDetailDialogProps) => {
  if (!appointment) return null;

  const apt = appointment;
  const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
  const product = (apt as any).product;
  const leadGoal = (apt as any).lead_goal;
  const salesCallDate = (apt as any).sales_call_date;

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm text-foreground">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {apt.lead_name}
            <Badge variant="outline" className={`text-[10px] border ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Detalle del lead — Creado {format(new Date(apt.created_at), "dd MMM yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          {/* Contact info */}
          <div className="pb-3 space-y-0.5">
            <InfoRow icon={Phone} label="Teléfono" value={apt.lead_phone} />
            <InfoRow icon={Mail} label="Email" value={apt.lead_email} />
            <InfoRow icon={User} label="Vendedor" value={apt.setter_name} />
          </div>

          {/* Product & Goal */}
          <div className="py-3 space-y-0.5">
            <InfoRow icon={Package} label="Producto" value={product} />
            <InfoRow icon={Target} label="Meta del cliente" value={leadGoal} />
          </div>

          {/* Dates */}
          <div className="py-3 space-y-0.5">
            <InfoRow
              icon={CalendarDays}
              label="Fecha de cita"
              value={format(new Date(apt.appointment_date), "dd MMM yyyy, HH:mm", { locale: es })}
            />
            {salesCallDate && (
              <InfoRow
                icon={PhoneCall}
                label="Llamada de venta"
                value={format(new Date(salesCallDate), "dd MMM yyyy, HH:mm", { locale: es })}
              />
            )}
          </div>

          {/* Value */}
          {(apt.estimated_value || 0) > 0 && (
            <div className="py-3">
              <InfoRow
                icon={DollarSign}
                label="Valor estimado"
                value={`${apt.currency === 'CRC' ? '₡' : '$'}${(apt.estimated_value || 0).toLocaleString()}`}
              />
            </div>
          )}

          {/* Ad attribution */}
          {apt.ad_name && (
            <div className="py-3">
              <InfoRow icon={Megaphone} label="Anuncio" value={`${apt.ad_name} — ${apt.ad_campaign_name}`} />
            </div>
          )}

          {/* Source */}
          <div className="py-3">
            <InfoRow icon={Clock} label="Fuente" value={SOURCE_LABELS[apt.source] || apt.source} />
          </div>

          {/* Notes */}
          {apt.notes && (
            <div className="pt-3">
              <InfoRow icon={FileText} label="Notas" value={apt.notes} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
