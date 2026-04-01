import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useClientSetters } from '@/hooks/use-client-setters';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { X, Plus, ChevronLeft, ChevronRight, User, CalendarDays, Megaphone, PhoneCall, Clock } from 'lucide-react';
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

const SOURCE_OPTIONS = [
  { value: 'ads', label: 'Publicidad' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'referral', label: 'Referencia' },
  { value: 'other', label: 'Otro' },
];

const STEP_META = [
  { icon: User, label: 'Lead' },
  { icon: CalendarDays, label: 'Asignar' },
  { icon: Megaphone, label: 'Fuente' },
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
  // Step 0: Lead info
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadContext, setLeadContext] = useState('');
  // Step 1: Setter + call date
  const [setterName, setSetterName] = useState('');
  const [showNewSetter, setShowNewSetter] = useState(false);
  const [newSetterName, setNewSetterName] = useState('');
  const [salesCallDate, setSalesCallDate] = useState('');
  const [salesCallTime, setSalesCallTime] = useState('10:00');
  // Step 2: Source
  const [source, setSource] = useState('ads');
  // Step 3: Ad (conditional)
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);

  const { addSetter: addSetterMutation } = useClientSetters(clientId || null);

  const needsAdStep = source === 'ads' && hasAdAccount;
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
      setLeadPhone(editing.lead_phone || '');
      setLeadEmail(editing.lead_email || '');
      setLeadContext((editing as any).lead_context || '');
      setSetterName(editing.setter_name || '');
      if (editing.sales_call_date) {
        const d = new Date(editing.sales_call_date);
        setSalesCallDay(d);
        setSalesCallHour(String(d.getHours()).padStart(2, '0'));
        setSalesCallMinute(String(d.getMinutes()).padStart(2, '0'));
      } else {
        setSalesCallDay(undefined);
        setSalesCallHour('10');
        setSalesCallMinute('00');
      }
      setSource(editing.source || 'ads');
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
      setLeadContext('');
      setSetterName('');
      setSalesCallDay(undefined);
      setSalesCallHour('10');
      setSalesCallMinute('00');
      setSource('ads');
      setSelectedAd(null);
    }
  }, [open, editing]);

  const handleAddSetter = async () => {
    if (newSetterName.trim()) {
      const name = newSetterName.trim();
      setSetterName(name);
      setShowNewSetter(false);
      setNewSetterName('');
      try {
        await addSetterMutation.mutateAsync(name);
      } catch {
        // Ignore duplicate errors
      }
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
      lead_phone: leadPhone.trim() || undefined,
      lead_email: leadEmail.trim() || undefined,
      lead_context: leadContext.trim() || undefined,
      appointment_date: new Date().toISOString(),
      sales_call_date: salesCallDay
        ? (() => { const d = new Date(salesCallDay); d.setHours(parseInt(salesCallHour), parseInt(salesCallMinute), 0, 0); return d.toISOString(); })()
        : undefined,
      setter_name: setterName || undefined,
      estimated_value: 0,
      currency: 'CRC',
      source,
      ad_campaign_id: selectedAd?.campaignId || undefined,
      ad_campaign_name: selectedAd?.campaignName || undefined,
      ad_id: selectedAd?.id || undefined,
      ad_name: selectedAd?.name || undefined,
    } as any);
  };

  const stepTitles = [
    'Información del Lead',
    'Asignar Vendedor',
    'Fuente del Lead',
    ...(needsAdStep ? ['Vincular Anuncio'] : []),
  ];

  const stepDescriptions = [
    'Nombre, contacto y contexto del lead',
    'Asigna un vendedor y programa la llamada',
    '¿De dónde vino este lead?',
    ...(needsAdStep ? ['Selecciona el anuncio que originó este lead'] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        <div className="px-6 pt-6 pb-2 space-y-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-center">
              {editing ? 'Editar Lead' : 'Nuevo Lead'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {stepTitles[step]}
            </DialogDescription>
          </DialogHeader>

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

        <div className="px-6 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '50vh' }}>
          {/* Step 0: Lead info */}
          {step === 0 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nombre del Lead *</Label>
                <Input
                  placeholder="Nombre completo"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="h-10 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Teléfono</Label>
                <Input
                  placeholder="+506 8888-8888"
                  value={leadPhone}
                  onChange={e => setLeadPhone(e.target.value)}
                  className="h-10 text-sm"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Correo</Label>
                <Input
                  placeholder="correo@ejemplo.com"
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  className="h-10 text-sm"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Contexto del Lead</Label>
                <Textarea
                  placeholder="Info relevante para el closer: qué busca, situación actual, objeciones..."
                  value={leadContext}
                  onChange={e => setLeadContext(e.target.value)}
                  className="text-sm min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Step 1: Setter + Sales Call Date */}
          {step === 1 && (
            <div className="space-y-4 py-4">
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
                        {setterName && !existingSetters.includes(setterName) && (
                          <SelectItem key={setterName} value={setterName} className="text-xs">{setterName}</SelectItem>
                        )}
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

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Fecha de Llamada
                </Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={salesCallDay}
                    onSelect={setSalesCallDay}
                    locale={es}
                    className={cn("rounded-md border p-2 pointer-events-auto")}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
                {salesCallDay && (
                  <p className="text-xs text-center text-muted-foreground">
                    {format(salesCallDay, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hora de la Llamada
                </Label>
                <div className="flex items-center justify-center gap-2">
                  <Select value={salesCallHour} onValueChange={setSalesCallHour}>
                    <SelectTrigger className="w-20 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <Select value={salesCallMinute} onValueChange={setSalesCallMinute}>
                    <SelectTrigger className="w-20 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map(m => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                {stepDescriptions[step]}
              </p>
            </div>
          )}

          {/* Step 2: Source */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fuente del Lead</Label>
                <Select value={source} onValueChange={v => { setSource(v); setSelectedAd(null); }}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {stepDescriptions[step]}
              </p>
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

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-border">
          <div className="flex items-center justify-center gap-3">
            {step === 0 ? (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs px-6">
                Cancelar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs px-4">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
            )}

            {step < lastStep ? (
              <Button size="sm" onClick={handleNext} disabled={!canAdvance(step)} className="text-xs px-6">
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={!leadName.trim() || isSubmitting} className="text-xs px-6">
                {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Registrar Lead'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
