import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { X, Plus, ChevronLeft, ChevronRight, User, Target, Settings, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AppointmentInput) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editing?: SetterAppointment | null;
  existingSetters?: string[];
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

const STEP_META = [
  { icon: User, label: 'Lead' },
  { icon: Target, label: 'Detalles' },
  { icon: Settings, label: 'Estado' },
  { icon: Megaphone, label: 'Anuncio' },
];

export const AppointmentFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  clientId,
  hasAdAccount = false,
  isSubmitting,
  editing,
  existingSetters = [],
}: AppointmentFormDialogProps) => {
  const [step, setStep] = useState(0);
  const [leadName, setLeadName] = useState('');
  const [leadGoal, setLeadGoal] = useState('');
  const [setterName, setSetterName] = useState('');
  const [showNewSetter, setShowNewSetter] = useState(false);
  const [newSetterName, setNewSetterName] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [status, setStatus] = useState('scheduled');
  const [source, setSource] = useState('ads');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [notes, setNotes] = useState('');

  const needsAdStep = source === 'ads' && hasAdAccount;
  // Steps: 0=Lead, 1=Details, 2=Status/Source, 3=Ad (conditional)
  const totalSteps = needsAdStep ? 4 : 3;
  const lastStep = totalSteps - 1;

  const { data: adsResult, isLoading: adsLoading } = useAllAds(
    needsAdStep ? clientId || null : null,
    needsAdStep && open,
  );
  const adsList = adsResult?.ads || [];
  const adsCurrency = adsResult?.currency || 'USD';

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setShowNewSetter(false);
    setNewSetterName('');
    if (editing) {
      setLeadName(editing.lead_name);
      setLeadGoal((editing as any).lead_goal || '');
      setSetterName(editing.setter_name || '');
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
      setLeadGoal('');
      setSetterName('');
      setCurrency('CRC');
      setStatus('scheduled');
      setSource('ads');
      setSelectedAd(null);
      setNotes('');
    }
  }, [open, editing]);

  const handleAddSetter = () => {
    if (newSetterName.trim()) {
      setSetterName(newSetterName.trim());
      setShowNewSetter(false);
      setNewSetterName('');
    }
  };

  const canAdvance = (s: number) => {
    if (s === 0) return !!leadName.trim();
    return true;
  };

  const handleNext = () => {
    if (!canAdvance(step)) return;
    if (step < lastStep) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = () => {
    if (!leadName.trim()) return;
    onSubmit({
      lead_name: leadName.trim(),
      lead_goal: leadGoal.trim() || undefined,
      appointment_date: new Date().toISOString(),
      setter_name: setterName || undefined,
      estimated_value: 0,
      currency,
      status: status as any,
      source,
      ad_campaign_id: selectedAd?.campaignId || undefined,
      ad_campaign_name: selectedAd?.campaignName || undefined,
      ad_id: selectedAd?.id || undefined,
      ad_name: selectedAd?.name || undefined,
      notes: notes.trim() || undefined,
    } as any);
  };

  const stepTitles = [
    '¿Quién es el lead?',
    'Detalles del lead',
    'Estado y fuente',
    ...(needsAdStep ? ['Vincular anuncio'] : []),
  ];

  const stepDescriptions = [
    'Ingresa el nombre del cliente potencial',
    'Meta del cliente y vendedor asignado',
    'Define el estado actual y origen del lead',
    ...(needsAdStep ? ['Selecciona el anuncio que originó este lead'] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        {/* Header with dots indicator */}
        <div className="px-6 pt-6 pb-2 space-y-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-center">
              {editing ? 'Editar Lead' : 'Nuevo Lead'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {stepTitles[step]}
            </DialogDescription>
          </DialogHeader>

          {/* Instagram-style dots */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                onClick={() => { if (i < step && canAdvance(i)) setStep(i); }}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-6 h-2 bg-primary'
                    : i < step
                      ? 'w-2 h-2 bg-primary/40 cursor-pointer hover:bg-primary/60'
                      : 'w-2 h-2 bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content area with fixed height for carousel feel */}
        <div className="px-6 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '50vh' }}>
          {/* Step 0: Lead name */}
          {step === 0 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nombre del Cliente *</Label>
                <Input
                  placeholder="Nombre completo del lead"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="h-10 text-sm"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {stepDescriptions[step]}
              </p>
            </div>
          )}

          {/* Step 1: Goal + Setter */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Meta del Cliente</Label>
                <Input
                  placeholder="Ej: Generar 50 leads mensuales, Escalar ventas..."
                  value={leadGoal}
                  onChange={e => setLeadGoal(e.target.value)}
                  className="h-10 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Vendedor Asignado</Label>
                {showNewSetter ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del vendedor"
                      value={newSetterName}
                      onChange={e => setNewSetterName(e.target.value)}
                      className="h-10 text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSetter(); }}
                    />
                    <Button size="sm" className="h-10 text-xs" onClick={handleAddSetter} disabled={!newSetterName.trim()}>
                      OK
                    </Button>
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowNewSetter(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={setterName || '_none'} onValueChange={v => setSetterName(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-10 text-sm flex-1">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                        {existingSetters.map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => setShowNewSetter(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Status + Source + Notes */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Fuente</Label>
                <Select value={source} onValueChange={v => { setSource(v); setSelectedAd(null); }}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Notas</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="text-sm min-h-[70px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Ad selection (conditional) */}
          {step === 3 && needsAdStep && (
            <div className="space-y-3 py-4">
              <AdGridSelector
                ads={adsList}
                isLoading={adsLoading}
                selectedAd={selectedAd}
                onSelect={setSelectedAd}
                currency={adsCurrency}
              />
            </div>
          )}
        </div>

        {/* Footer: centered navigation */}
        <div className="px-6 pb-6 pt-3 border-t border-border">
          <div className="flex items-center justify-center gap-3">
            {step === 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs px-6"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-xs px-4"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
            )}

            {step < lastStep ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canAdvance(step)}
                className="text-xs px-6"
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!leadName.trim() || isSubmitting}
                className="text-xs px-6"
              >
                {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Registrar Lead'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
