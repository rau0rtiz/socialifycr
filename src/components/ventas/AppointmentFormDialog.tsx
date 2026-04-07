import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useClientSetters } from '@/hooks/use-client-setters';
import { useClientClosers } from '@/hooks/use-client-closers';
import { useClientProducts } from '@/hooks/use-client-products';
import { useClientPaymentSchemes } from '@/hooks/use-payment-schemes';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Plus, ChevronLeft, ChevronRight, User, CalendarDays, Megaphone, PhoneCall, Clock, Package, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollTimePicker } from '@/components/ui/scroll-time-picker';
import { toast } from 'sonner';

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
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'followup', label: 'Seguimiento' },
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
  const [step, setStep] = useState(0);
  // Step 0: Lead info
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadContext, setLeadContext] = useState('');
  // Step 1: Product + Payment Scheme
  const [product, setProduct] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  // Step 2: Setter + call date
  const [setterName, setSetterName] = useState('');
  const [showNewSetter, setShowNewSetter] = useState(false);
  const [newSetterName, setNewSetterName] = useState('');
  const [salesCallDate, setSalesCallDate] = useState('');
  const [salesCallTime, setSalesCallTime] = useState('10:00');
  // Step 3: Source
  const [source, setSource] = useState('ads');
  // Step 4: Ad (conditional)
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);

  // Draft persistence
  const draftRef = useRef<{
    leadName: string; leadPhone: string; leadEmail: string; leadContext: string;
    product: string; selectedSchemeId: string; estimatedValue: number; currency: 'CRC' | 'USD';
    setterName: string; salesCallDate: string; salesCallTime: string;
    source: string; selectedAd: AllAdItem | null; step: number;
  } | null>(null);
  const didSubmitRef = useRef(false);

  const { addSetter: addSetterMutation } = useClientSetters(clientId || null);
  const { data: closers = [] } = useClientClosers(clientId || null);
  const { products: clientProducts, addProduct } = useClientProducts(clientId || null);
  const { data: allSchemes = [] } = useClientPaymentSchemes(clientId || null);

  const needsAdStep = source === 'ads' && hasAdAccount;
  // Steps: 0=Lead, 1=Setter, 2=Source, 3=Ad(conditional)
  const totalSteps = needsAdStep ? 4 : 3;
  const lastStep = totalSteps - 1;

  const { data: adsResult, isLoading: adsLoading } = useAllAds(
    needsAdStep ? clientId || null : null,
    needsAdStep && open,
  );
  const adsList = adsResult?.ads || [];
  const adsCurrency = adsResult?.currency || 'USD';

  const selectedProduct = clientProducts.find(p => p.name === product);
  const productSchemes = selectedProduct
    ? allSchemes.filter(s => s.product_id === selectedProduct.id)
    : [];

  const handleProductChange = (v: string) => {
    const selectedName = v === '_none' ? '' : v;
    setProduct(selectedName);
    setSelectedSchemeId('');
    if (selectedName) {
      const matched = clientProducts.find(p => p.name === selectedName);
      if (matched?.price != null) {
        setEstimatedValue(matched.price);
        setCurrency(matched.currency as 'CRC' | 'USD');
      } else {
        setEstimatedValue(0);
      }
    } else {
      setEstimatedValue(0);
    }
  };

  const handleSchemeChange = (schemeId: string) => {
    if (schemeId === '_none') {
      setSelectedSchemeId('');
      if (selectedProduct?.price != null) {
        setEstimatedValue(selectedProduct.price);
      }
      return;
    }
    const scheme = allSchemes.find(s => s.id === schemeId);
    if (!scheme) return;
    setSelectedSchemeId(schemeId);
    setEstimatedValue(scheme.total_price);
    setCurrency(scheme.currency as 'CRC' | 'USD');
  };

  // Save draft when closing without submitting
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && !didSubmitRef.current && !editing) {
      const hasData = leadName.trim() || leadPhone.trim() || leadEmail.trim() || leadContext.trim();
      if (hasData) {
        draftRef.current = { leadName, leadPhone, leadEmail, leadContext, product, selectedSchemeId, estimatedValue, currency, setterName, salesCallDate, salesCallTime, source, selectedAd, step };
      }
    }
    onOpenChange(nextOpen);
  }, [leadName, leadPhone, leadEmail, leadContext, product, selectedSchemeId, estimatedValue, currency, setterName, salesCallDate, salesCallTime, source, selectedAd, step, editing, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    didSubmitRef.current = false;
    setShowNewSetter(false);
    setNewSetterName('');
    if (editing) {
      setStep(0);
      setLeadName(editing.lead_name);
      setLeadPhone(editing.lead_phone || '');
      setLeadEmail(editing.lead_email || '');
      setLeadContext((editing as any).lead_context || '');
      setProduct((editing as any).product || '');
      setSelectedSchemeId('');
      setEstimatedValue(editing.estimated_value || 0);
      setCurrency(editing.currency || 'CRC');
      setSetterName(editing.setter_name || '');
      if (editing.sales_call_date) {
        const d = new Date(editing.sales_call_date);
        setSalesCallDate(d.toISOString().slice(0, 10));
        setSalesCallTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else {
        setSalesCallDate('');
        setSalesCallTime('10:00');
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
    } else if (draftRef.current) {
      const d = draftRef.current;
      setStep(d.step);
      setLeadName(d.leadName);
      setLeadPhone(d.leadPhone);
      setLeadEmail(d.leadEmail);
      setLeadContext(d.leadContext);
      setProduct(d.product);
      setSelectedSchemeId(d.selectedSchemeId);
      setEstimatedValue(d.estimatedValue);
      setCurrency(d.currency);
      setSetterName(d.setterName);
      setSalesCallDate(d.salesCallDate);
      setSalesCallTime(d.salesCallTime);
      setSource(d.source);
      setSelectedAd(d.selectedAd);
    } else {
      setStep(0);
      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadContext('');
      setProduct('');
      setSelectedSchemeId('');
      setEstimatedValue(0);
      setCurrency('CRC');
      setSetterName('');
      setSalesCallDate('');
      setSalesCallTime('10:00');
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

  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      const result = await addProduct.mutateAsync({ name: newProductName.trim() });
      setProduct(result.name);
      setShowNewProduct(false);
      setNewProductName('');
      toast.success('Producto creado');
    } catch {
      toast.error('Error creando producto');
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
    didSubmitRef.current = true;
    draftRef.current = null;
    onSubmit({
      lead_name: leadName.trim(),
      lead_phone: leadPhone.trim() || undefined,
      lead_email: leadEmail.trim() || undefined,
      lead_context: leadContext.trim() || undefined,
      appointment_date: new Date().toISOString(),
      sales_call_date: salesCallDate
        ? new Date(`${salesCallDate}T${salesCallTime}:00`).toISOString()
        : undefined,
      setter_name: setterName || undefined,
      estimated_value: estimatedValue,
      currency,
      source,
      ad_campaign_id: selectedAd?.campaignId || undefined,
      ad_campaign_name: selectedAd?.campaignName || undefined,
      ad_id: selectedAd?.id || undefined,
      ad_name: selectedAd?.name || undefined,
    } as any);
  };

  // Step indices (no product step — product is set when converting to sale)
  const setterStepIdx = 1;
  const sourceStepIdx = 2;
  const adStepIdx = needsAdStep ? 3 : -1;

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

  const allProductOptions = product && !clientProducts.some(p => p.name === product)
    ? [product, ...clientProducts.map(p => p.name)]
    : clientProducts.map(p => p.name);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0" onInteractOutside={(e) => e.preventDefault()}>
        <div className="px-6 pt-6 pb-2 space-y-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-center">
              {editing ? 'Editar Lead' : 'Nuevo Lead'}
              {!editing && draftRef.current && (
                <span className="ml-2 text-[10px] font-normal text-amber-500">(borrador recuperado)</span>
              )}
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
          {step === setterStepIdx && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Vendedor Asignado</Label>

                {/* Closers with avatars */}
                {closers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Closers</p>
                    <div className="grid grid-cols-2 gap-2">
                      {closers.map(c => (
                        <button
                          key={c.userId}
                          type="button"
                          onClick={() => setSetterName(c.fullName)}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-sm',
                            setterName === c.fullName
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.fullName} />}
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {c.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{c.fullName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing setters + manual add */}
                {(existingSetters.length > 0 || closers.length === 0) && (
                  <div className="space-y-1.5">
                    {closers.length > 0 && <p className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">Otros vendedores</p>}
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
                            {setterName && !existingSetters.includes(setterName) && !closers.some(c => c.fullName === setterName) && (
                              <SelectItem key={setterName} value={setterName} className="text-xs">{setterName}</SelectItem>
                            )}
                            {existingSetters.filter(s => !closers.some(c => c.fullName === s)).map(s => (
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
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Fecha y hora de la llamada
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-10 justify-start text-left text-sm font-normal',
                        !salesCallDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      {salesCallDate
                        ? format(new Date(salesCallDate), "EEEE d 'de' MMMM", { locale: es })
                        : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={salesCallDate ? new Date(salesCallDate) : undefined}
                      onSelect={(date) => {
                        if (date) setSalesCallDate(format(date, 'yyyy-MM-dd'));
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hora
                </Label>
                <ScrollTimePicker
                  value={salesCallTime}
                  onChange={setSalesCallTime}
                />
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                {stepDescriptions[step]}
              </p>
            </div>
          )}

          {/* Step 3: Source */}
          {step === sourceStepIdx && (
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

          {/* Step 4: Ad selection (conditional) */}
          {step === adStepIdx && needsAdStep && (
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
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} className="text-xs px-6">
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