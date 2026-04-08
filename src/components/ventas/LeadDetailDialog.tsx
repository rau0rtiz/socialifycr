import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { SetterAppointment, AppointmentStatus } from '@/hooks/use-setter-appointments';
import { User, Phone, Mail, Megaphone, CalendarDays, DollarSign, FileText, Clock, PhoneCall, ClipboardCheck, MessageSquare, Save, ShoppingCart, ThumbsDown, XCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdGridSelector } from './AdGridSelector';
import { useAllAds } from '@/hooks/use-ads-data';

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: SetterAppointment | null;
  onUpdateChecklist?: (id: string, updates: Record<string, any>) => void;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => Promise<void>;
  clientId?: string;
  hasAdAccount?: boolean;
  showChecklist?: boolean;
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
  landing_page: 'Landing Page',
  followup: 'Seguimiento',
  other: 'Otro',
};

const CHECKLIST_ITEMS = [
  { key: 'checklist_quiz', label: 'Ya realizó el quiz' },
  { key: 'checklist_video', label: 'Ya vio el video antes de la llamada' },
  { key: 'checklist_whatsapp', label: 'Ya se creó el grupo de WhatsApp' },
  { key: 'checklist_testimonials', label: 'Ya se enviaron los testimonios' },
];

export const LeadDetailDialog = ({ open, onOpenChange, appointment, onUpdateChecklist, onStatusChange, onDelete, clientId, hasAdAccount, showChecklist = true }: LeadDetailDialogProps) => {
  const [checklist, setChecklist] = useState({
    checklist_quiz: false,
    checklist_video: false,
    checklist_whatsapp: false,
    checklist_testimonials: false,
  });
  const [dirty, setDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdSelector, setShowAdSelector] = useState(false);

  const allAdsQuery = useAllAds(clientId || '', hasAdAccount || false);
  const ads = allAdsQuery.data?.ads || [];
  const adsLoading = allAdsQuery.isLoading;

  useEffect(() => {
    if (appointment) {
      setChecklist({
        checklist_quiz: appointment.checklist_quiz || false,
        checklist_video: appointment.checklist_video || false,
        checklist_whatsapp: appointment.checklist_whatsapp || false,
        checklist_testimonials: appointment.checklist_testimonials || false,
      });
      setDirty(false);
      setShowAdSelector(false);
    }
  }, [appointment?.id]);

  if (!appointment) return null;

  const apt = appointment;
  const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
  const salesCallDate = apt.sales_call_date;
  const leadContext = apt.lead_context || '';
  const notSoldReason = apt.not_sold_reason || '';

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    setDirty(true);
  };

  const saveChecklist = () => {
    if (onUpdateChecklist) {
      onUpdateChecklist(apt.id, checklist);
      setDirty(false);
    }
  };

  const handleAdChange = (ad: any) => {
    if (onUpdateChecklist) {
      if (ad) {
        onUpdateChecklist(apt.id, {
          ad_id: ad.id,
          ad_name: ad.name,
          ad_campaign_id: ad.campaignId,
          ad_campaign_name: ad.campaignName,
        });
      } else {
        onUpdateChecklist(apt.id, {
          ad_id: null,
          ad_name: null,
          ad_campaign_id: null,
          ad_campaign_name: null,
        });
      }
      setShowAdSelector(false);
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;

  const InfoRow = ({ icon: Icon, label, value, action }: { icon: React.ElementType; label: string; value: string | null | undefined; action?: React.ReactNode }) => {
    if (!value && !action) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm text-foreground">{value}</p>
        </div>
        {action}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {apt.lead_name}
            <Badge variant="outline" className={`text-[10px] border ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creado {format(new Date(apt.created_at), "dd MMM yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {leadContext && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <MessageSquare className="h-3.5 w-3.5" />
                Contexto del Lead
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{leadContext}</p>
            </div>
          )}

          {notSoldReason && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                <ThumbsDown className="h-3.5 w-3.5" />
                Motivo de no venta
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{notSoldReason}</p>
            </div>
          )}
          {showChecklist && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Checklist Pre-llamada
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {CHECKLIST_ITEMS.map(item => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={checklist[item.key as keyof typeof checklist]}
                      onCheckedChange={() => toggleCheck(item.key)}
                    />
                    <span className={`text-sm transition-colors ${checklist[item.key as keyof typeof checklist] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              {dirty && onUpdateChecklist && (
                <Button size="sm" className="w-full h-8 text-xs" onClick={saveChecklist}>
                  <Save className="h-3 w-3 mr-1" />
                  Guardar checklist
                </Button>
              )}
            </div>
          )}

          <div className="divide-y divide-border">
            <div className="pb-3 space-y-0.5">
              <InfoRow icon={Phone} label="Teléfono" value={apt.lead_phone} />
              <InfoRow icon={Mail} label="Email" value={apt.lead_email} />
              <InfoRow icon={User} label="Vendedor" value={apt.setter_name} />
            </div>

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

            {(apt.estimated_value || 0) > 0 && (
              <div className="py-3">
                <InfoRow
                  icon={DollarSign}
                  label="Valor estimado"
                  value={`${apt.currency === 'CRC' ? '₡' : '$'}${(apt.estimated_value || 0).toLocaleString()}`}
                />
              </div>
            )}

            {/* Ad section with edit */}
            <div className="py-3">
              {showAdSelector ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                      Cambiar anuncio
                    </p>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowAdSelector(false)}>
                      Cancelar
                    </Button>
                  </div>
                  <AdGridSelector
                    ads={ads}
                    isLoading={adsLoading}
                    selectedAd={ads.find(a => a.id === apt.ad_id) || null}
                    onSelect={handleAdChange}
                  />
                </div>
              ) : (
                <InfoRow
                  icon={Megaphone}
                  label="Anuncio"
                  value={apt.ad_name ? `${apt.ad_name} — ${apt.ad_campaign_name}` : 'Sin anuncio'}
                  action={
                    hasAdAccount && onUpdateChecklist ? (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => setShowAdSelector(true)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Cambiar
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </div>

            <div className="py-3">
              <InfoRow icon={Clock} label="Fuente" value={SOURCE_LABELS[apt.source] || apt.source} />
            </div>

            {apt.notes && (
              <div className="pt-3">
                <InfoRow icon={FileText} label="Notas" value={apt.notes} />
              </div>
            )}
          </div>

          {onStatusChange && (
            <div className="rounded-lg border border-border p-3 space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                {(apt.status === 'sold' || (apt.status as string) === 'not_sold' || apt.status === 'no_show')
                  ? 'Resultado registrado — toca otro botón para corregir'
                  : 'Resultado de la llamada'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  className={`h-9 text-xs ${apt.status === 'sold' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-emerald-600/20 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-400'}`}
                  onClick={() => { onStatusChange(apt.id, 'sold'); onOpenChange(false); }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  Venta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-9 text-xs ${(apt.status as string) === 'not_sold' ? 'bg-rose-500/20 border-rose-500 text-rose-700 ring-2 ring-rose-400 dark:text-rose-400' : 'border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400'}`}
                  onClick={() => { onStatusChange(apt.id, 'not_sold'); onOpenChange(false); }}
                >
                  <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                  No Venta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-9 text-xs ${apt.status === 'no_show' ? 'bg-red-500/20 border-red-500 text-red-700 ring-2 ring-red-400 dark:text-red-400' : 'border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400'}`}
                  onClick={() => { onStatusChange(apt.id, 'no_show'); onOpenChange(false); }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  No Show
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Venta y No Venta implican que sí hubo llamada
              </p>
            </div>
          )}

          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar agenda
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta agenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente el lead <strong>"{apt.lead_name}"</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault();
                setIsDeleting(true);
                try {
                  await onDelete(apt.id);
                  setShowDeleteConfirm(false);
                  onOpenChange(false);
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
