import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [step, setStep] = useState(1);
  const [leadName, setLeadName] = useState('');
  const [leadGoal, setLeadGoal] = useState('');
  const [setterName, setSetterName] = useState('');
  const [showNewSetter, setShowNewSetter] = useState(false);
  const [newSetterName, setNewSetterName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [status, setStatus] = useState('scheduled');
  const [source, setSource] = useState('ads');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [notes, setNotes] = useState('');

  const needsAdStep = source === 'ads' && hasAdAccount;
  const maxStep = needsAdStep ? 2 : 1;

  const { data: adsResult, isLoading: adsLoading } = useAllAds(
    needsAdStep ? clientId || null : null,
    needsAdStep && open,
  );
  const adsList = adsResult?.ads || [];
  const adsCurrency = adsResult?.currency || 'USD';

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setShowNewSetter(false);
    setNewSetterName('');
    if (editing) {
      setLeadName(editing.lead_name);
      setLeadGoal((editing as any).lead_goal || '');
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
      setLeadGoal('');
      setSetterName('');
      setEstimatedValue('');
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

  const validateStep1 = () => !!leadName.trim();

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!leadName.trim()) return;
    onSubmit({
      lead_name: leadName.trim(),
      lead_goal: leadGoal.trim() || undefined,
      appointment_date: new Date().toISOString(),
      setter_name: setterName || undefined,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : 0,
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

  const isLastStep = step >= maxStep;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editing ? 'Editar Lead' : 'Nuevo Lead'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {maxStep > 1 ? `Paso ${step} de ${maxStep}` : 'Registra un lead para trackear el pipeline de ventas high-ticket.'}
          </DialogDescription>
          {maxStep > 1 && (
            <div className="flex gap-1.5 pt-1">
              {Array.from({ length: maxStep }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Step 1: Lead info */}
        {step === 1 && (
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del Cliente *</Label>
              <Input
                placeholder="Nombre completo del lead"
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Meta del Cliente</Label>
              <Input
                placeholder="Ej: Generar 50 leads mensuales, Escalar ventas..."
                value={leadGoal}
                onChange={e => setLeadGoal(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Vendedor Asignado</Label>
              {showNewSetter ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del vendedor"
                    value={newSetterName}
                    onChange={e => setNewSetterName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSetter(); }}
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddSetter} disabled={!newSetterName.trim()}>
                    Agregar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowNewSetter(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={setterName || '_none'} onValueChange={v => setSetterName(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                      {existingSetters.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewSetter(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Nuevo
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-1.5">
              <Label className="text-xs">Fuente</Label>
              <Select value={source} onValueChange={v => { setSource(v); setSelectedAd(null); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea placeholder="Notas adicionales..." value={notes} onChange={e => setNotes(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
          </div>
        )}

        {/* Step 2: Ad selection */}
        {step === 2 && needsAdStep && (
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm font-medium">Selecciona el anuncio vinculado</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Elige el anuncio que originó este lead</p>
            </div>
            <AdGridSelector
              ads={adsList}
              isLoading={adsLoading}
              selectedAd={selectedAd}
              onSelect={setSelectedAd}
              currency={adsCurrency}
            />
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs">
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancelar
            </Button>
          )}

          {isLastStep ? (
            <Button size="sm" onClick={handleSubmit} disabled={!leadName.trim() || isSubmitting} className="text-xs">
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext} className="text-xs">
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
