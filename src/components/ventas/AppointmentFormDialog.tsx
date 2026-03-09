import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { Image as ImageIcon, X } from 'lucide-react';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AppointmentInput) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editing?: SetterAppointment | null;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Realizada' },
  { value: 'no_show', label: 'No Show' },
  { value: 'sold', label: 'Venta' },
  { value: 'cancelled', label: 'Cancelada' },
];

const SOURCE_OPTIONS = [
  { value: 'ads', label: 'Publicidad' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'referral', label: 'Referencia' },
  { value: 'other', label: 'Otro' },
];

export const AppointmentFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  clientId,
  hasAdAccount = false,
  isSubmitting,
  editing,
}: AppointmentFormDialogProps) => {
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [setterName, setSetterName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [status, setStatus] = useState('scheduled');
  const [source, setSource] = useState('ads');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [notes, setNotes] = useState('');

  const shouldFetchAds = source === 'ads' && hasAdAccount;
  const { data: adsResult, isLoading: adsLoading } = useAllAds(
    shouldFetchAds ? clientId || null : null,
    shouldFetchAds,
  );
  const adsList = adsResult?.ads || [];

  useEffect(() => {
    if (open) {
      if (editing) {
        setLeadName(editing.lead_name);
        setLeadPhone(editing.lead_phone || '');
        setLeadEmail(editing.lead_email || '');
        const d = new Date(editing.appointment_date);
        setAppointmentDate(d.toISOString().split('T')[0]);
        setAppointmentTime(d.toTimeString().slice(0, 5));
        setSetterName(editing.setter_name || '');
        setEstimatedValue(editing.estimated_value ? String(editing.estimated_value) : '');
        setCurrency(editing.currency as 'CRC' | 'USD');
        setStatus(editing.status);
        setSource(editing.source || 'ads');
        setNotes(editing.notes || '');
        if (editing.ad_id) {
          setSelectedAd({
            id: editing.ad_id,
            name: editing.ad_name || '',
            campaignId: editing.ad_campaign_id || '',
            campaignName: editing.ad_campaign_name || '',
            effectiveStatus: 'ACTIVE',
            thumbnailUrl: null,
            spend: 0,
          });
        } else {
          setSelectedAd(null);
        }
      } else {
        setLeadName('');
        setLeadPhone('');
        setLeadEmail('');
        setAppointmentDate(new Date().toISOString().split('T')[0]);
        setAppointmentTime('10:00');
        setSetterName('');
        setEstimatedValue('');
        setCurrency('CRC');
        setStatus('scheduled');
        setSource('ads');
        setSelectedAd(null);
        setNotes('');
      }
    }
  }, [open, editing]);

  const handleSubmit = () => {
    if (!leadName.trim() || !appointmentDate) return;
    const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString();
    onSubmit({
      lead_name: leadName.trim(),
      lead_phone: leadPhone.trim() || undefined,
      lead_email: leadEmail.trim() || undefined,
      appointment_date: dateTime,
      setter_name: setterName.trim() || undefined,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : 0,
      currency,
      status: status as any,
      source,
      ad_campaign_id: selectedAd?.campaignId || undefined,
      ad_campaign_name: selectedAd?.campaignName || undefined,
      ad_id: selectedAd?.id || undefined,
      ad_name: selectedAd?.name || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editing ? 'Editar Agenda' : 'Nueva Agenda'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registra una agenda de un lead para trackear el pipeline de ventas high-ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Lead info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del Lead *</Label>
              <Input
                placeholder="Nombre completo"
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input
                placeholder="+506 ..."
                value={leadPhone}
                onChange={e => setLeadPhone(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              placeholder="email@ejemplo.com"
              value={leadEmail}
              onChange={e => setLeadEmail(e.target.value)}
              className="h-8 text-xs"
              type="email"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha *</Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hora</Label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={e => setAppointmentTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Setter & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Setter</Label>
              <Input
                placeholder="Nombre del setter"
                value={setterName}
                onChange={e => setSetterName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Value */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Valor Estimado</Label>
              <Input
                type="number"
                placeholder="0"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                className="h-8 text-xs"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={v => setCurrency(v as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC" className="text-xs">CRC</SelectItem>
                  <SelectItem value="USD" className="text-xs">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source & Ad */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fuente</Label>
            <Select value={source} onValueChange={v => { setSource(v); setSelectedAd(null); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {source === 'ads' && hasAdAccount && (
            <div className="space-y-1.5">
              <Label className="text-xs">Anuncio vinculado</Label>
              {adsLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : selectedAd ? (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{selectedAd.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{selectedAd.campaignName}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedAd(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto border border-border rounded-md">
                  {adsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Sin anuncios activos</p>
                  ) : (
                    adsList.map(ad => (
                      <button
                        key={ad.id}
                        onClick={() => setSelectedAd(ad)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left border-b border-border last:border-0 transition-colors"
                      >
                        {ad.thumbnailUrl ? (
                          <img src={ad.thumbnailUrl} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{ad.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ad.campaignName}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea
              placeholder="Notas adicionales..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!leadName.trim() || !appointmentDate || isSubmitting}
            className="text-xs"
          >
            {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
