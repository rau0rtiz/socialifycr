import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SaleInput, MessageSale } from '@/hooks/use-sales-tracking';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { useClientProducts } from '@/hooks/use-client-products';
import { useClientClosers } from '@/hooks/use-client-closers';
import { useClientPaymentSchemes, PaymentScheme } from '@/hooks/use-payment-schemes';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, X, Package, User, Tag, Megaphone, DollarSign, Settings, CalendarDays, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SalePrefill {
  customer_name?: string;
  product?: string;
  source?: string;
  ad_id?: string;
  ad_name?: string;
  ad_campaign_id?: string;
  ad_campaign_name?: string;
  appointmentId?: string;
  closer_name?: string;
  message_platform?: string;
}

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sale: SaleInput, appointmentId?: string) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editingSale?: MessageSale | null;
  prefill?: SalePrefill | null;
}

const SOURCE_OPTIONS = [
  { value: 'story', label: 'Historia' },
  { value: 'ad', label: 'Publicidad' },
  { value: 'referral', label: 'Referencia' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'other', label: 'Otro' },
];

const PLATFORM_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram_dm', label: 'Instagram DM' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'other', label: 'Otro' },
];

const STEP_META = [
  { icon: DollarSign, label: 'Monto' },
  { icon: Settings, label: 'Detalles' },
  { icon: CalendarDays, label: 'Contexto' },
  { icon: Megaphone, label: 'Anuncio' },
];

export const RegisterSaleDialog = ({
  open,
  onOpenChange,
  onSubmit,
  clientId,
  hasAdAccount = false,
  isSubmitting,
  editingSale,
  prefill,
}: RegisterSaleDialogProps) => {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<string>('');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [messagePlatform, setMessagePlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('completed');
  const [closerName, setCloserName] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [numInstallments, setNumInstallments] = useState(1);
  const [installmentsPaid, setInstallmentsPaid] = useState(1);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [totalSaleAmount, setTotalSaleAmount] = useState(0);

  const { products, addProduct } = useClientProducts(clientId || null);
  const { data: closers = [] } = useClientClosers(clientId || null);
  const { data: allSchemes = [] } = useClientPaymentSchemes(clientId || null);
  const productNames = products.map(p => p.name);

  const isEditing = !!editingSale;
  const isPrefilled = !!prefill && !editingSale;

  // For prefilled mode, skip source/details step and ad step
  const needsAdStep = !isPrefilled && source === 'ad' && hasAdAccount;
  // Steps: 0=Amount, 1=Details (source, product, customer), 2=Context (platform, notes), 3=Ad (optional)
  // Prefilled: 0=Amount, 1=Context (platform, notes) — skip details & ad
  const buildSteps = () => {
    if (isPrefilled) return ['Monto', 'Notas'];
    const steps = ['Monto', 'Detalles', 'Contexto'];
    if (needsAdStep) steps.push('Anuncio');
    return steps;
  };
  const stepNames = buildSteps();
  const totalSteps = stepNames.length;
  const lastStep = totalSteps - 1;

  const { data: allAdsResult, isLoading: adsLoading } = useAllAds(
    clientId || null,
    hasAdAccount && open && needsAdStep
  );
  const allAds = allAdsResult?.ads || [];
  const adsCurrency = allAdsResult?.currency || 'USD';

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setShowNewProduct(false);
    setNewProductName('');
    setSelectedSchemeId('');
    setNumInstallments(1);
    setInstallmentsPaid(1);
    setInstallmentAmount(0);
    setTotalSaleAmount(0);
    if (editingSale) {
      setAmount(String(editingSale.amount));
      setCurrency(editingSale.currency);
      setSaleDate(editingSale.sale_date);
      setSource(editingSale.source);
      setCustomerName(editingSale.customer_name || '');
      setProduct(editingSale.product || '');
      setMessagePlatform(editingSale.message_platform || '');
      setNotes(editingSale.notes || '');
      setStatus(editingSale.status);
      setCloserName((editingSale as any).closer_name || '');
      setSelectedSchemeId((editingSale as any).payment_scheme_id || '');
      setNumInstallments((editingSale as any).num_installments || 1);
      setInstallmentsPaid((editingSale as any).installments_paid || 1);
      setInstallmentAmount((editingSale as any).installment_amount || 0);
      setTotalSaleAmount((editingSale as any).total_sale_amount || 0);
      if (editingSale.ad_id) {
        setSelectedAd({
          id: editingSale.ad_id,
          name: editingSale.ad_name || '',
          campaignId: editingSale.ad_campaign_id || '',
          campaignName: editingSale.ad_campaign_name || '',
          thumbnailUrl: null,
          spend: 0,
          effectiveStatus: '',
        });
      } else {
        setSelectedAd(null);
      }
    } else if (prefill) {
      setAmount('');
      setCurrency('CRC');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSource(prefill.ad_id ? 'ad' : prefill.source || '');
      setCustomerName(prefill.customer_name || '');
      setProduct(prefill.product || '');
      setMessagePlatform(prefill.message_platform || '');
      setNotes('');
      setStatus('completed');
      setCloserName(prefill.closer_name || '');
      if (prefill.ad_id) {
        setSelectedAd({
          id: prefill.ad_id,
          name: prefill.ad_name || '',
          campaignId: prefill.ad_campaign_id || '',
          campaignName: prefill.ad_campaign_name || '',
          thumbnailUrl: null,
          spend: 0,
          effectiveStatus: '',
        });
      } else {
        setSelectedAd(null);
      }
    } else {
      setAmount('');
      setCurrency('CRC');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSource('');
      setSelectedAd(null);
      setCustomerName('');
      setProduct('');
      setMessagePlatform('');
      setNotes('');
      setStatus('completed');
      setCloserName('');
    }
  }, [editingSale, prefill, open]);

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
    if (isPrefilled) {
      // Step 0: amount required
      if (s === 0) return !!amount;
      return true;
    }
    // Step 0: amount required
    if (s === 0) return !!amount;
    // Step 1: source required
    if (s === 1) return !!source;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance(step)) {
      if (step === 0 && !amount) toast.error('El monto es requerido');
      if (step === 1 && !source) toast.error('La fuente es requerida');
      return;
    }
    if (step < lastStep) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = () => {
    if (!amount) {
      toast.error('El monto es requerido');
      return;
    }
    if (!isPrefilled && !source) {
      toast.error('La fuente es requerida');
      return;
    }

    const sale: any = {
      sale_date: saleDate,
      amount: parseFloat(amount),
      currency,
      source: source as SaleInput['source'],
      customer_name: customerName || undefined,
      product: product || undefined,
      message_platform: messagePlatform || undefined,
      notes: notes || undefined,
      status: status as SaleInput['status'],
      closer_name: closerName || undefined,
    };

    if (source === 'ad' && selectedAd) {
      sale.ad_id = selectedAd.id;
      sale.ad_name = selectedAd.name;
      sale.ad_campaign_id = selectedAd.campaignId;
      sale.ad_campaign_name = selectedAd.campaignName;
    }

    onSubmit(sale, prefill?.appointmentId);
  };

  const allProductOptions = product && !productNames.includes(product)
    ? [product, ...productNames]
    : productNames;

  // Auto-fill amount when selecting a product with a price
  const handleProductChange = (v: string) => {
    const selectedName = v === '_none' ? '' : v;
    setProduct(selectedName);
    if (selectedName) {
      const matched = products.find(p => p.name === selectedName);
      if (matched?.price != null && !amount) {
        setAmount(String(matched.price));
        setCurrency(matched.currency as 'CRC' | 'USD');
      }
    }
  };

  const sourceLabel = SOURCE_OPTIONS.find(o => o.value === source)?.label || source;

  // Step titles and descriptions
  const getStepTitle = () => {
    if (isPrefilled) {
      return step === 0 ? '¿Cuánto fue la venta?' : 'Notas adicionales';
    }
    if (step === 0) return '¿Cuánto fue la venta?';
    if (step === 1) return 'Detalles de la venta';
    if (step === 2) return 'Contexto adicional';
    return 'Vincular anuncio';
  };

  const getStepDescription = () => {
    if (isPrefilled) {
      return step === 0 ? 'Ingresa el monto y la fecha de la venta' : 'Plataforma del mensaje y notas';
    }
    if (step === 0) return 'Ingresa el monto y la fecha';
    if (step === 1) return 'Fuente, producto y cliente';
    if (step === 2) return 'Plataforma del mensaje y notas';
    return 'Selecciona el anuncio que originó esta venta';
  };

  const stepIcons = isPrefilled
    ? [STEP_META[0], STEP_META[2]]
    : needsAdStep
      ? STEP_META
      : STEP_META.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        {/* Header with dots indicator */}
        <div className="px-6 pt-6 pb-2 space-y-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-center">
              {isEditing ? 'Editar Venta' : isPrefilled ? 'Registrar Venta de Lead' : 'Registrar Venta'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {getStepTitle()}
            </DialogDescription>
          </DialogHeader>

          {/* Prefilled summary badges */}
          {isPrefilled && step === 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {prefill?.customer_name && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <User className="h-3 w-3" /> {prefill.customer_name}
                </Badge>
              )}
              {prefill?.product && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Package className="h-3 w-3" /> {prefill.product}
                </Badge>
              )}
              {source && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Tag className="h-3 w-3" /> {sourceLabel}
                </Badge>
              )}
              {selectedAd && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Megaphone className="h-3 w-3" /> {selectedAd.name}
                </Badge>
              )}
            </div>
          )}

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

        {/* Content area */}
        <div className="px-6 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '50vh' }}>
          {/* === PREFILLED FLOW === */}
          {isPrefilled && step === 0 && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Monto *</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 text-sm" autoFocus />
                </div>
                <div className="w-24 space-y-2">
                  <Label className="text-xs font-medium">Moneda</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as 'CRC' | 'USD')}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">₡ CRC</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fecha</Label>
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-10 text-sm" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {isPrefilled && step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Closer / Vendedor</Label>
                <Select value={closerName || '_none'} onValueChange={v => setCloserName(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="¿Quién cerró la venta?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                    {closerName && !closers.some(c => c.fullName === closerName) && (
                      <SelectItem value={closerName} className="text-xs">{closerName}</SelectItem>
                    )}
                    {closers.map(c => (
                      <SelectItem key={c.userId} value={c.fullName} className="text-xs">{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-xs font-medium">Plataforma del mensaje</Label>
                <Select value={messagePlatform} onValueChange={setMessagePlatform}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Notas</Label>
                <Textarea placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-sm" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {/* === STANDARD FLOW === */}
          {/* Step 0: Amount + Date */}
          {!isPrefilled && step === 0 && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Monto *</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 text-sm" autoFocus />
                </div>
                <div className="w-24 space-y-2">
                  <Label className="text-xs font-medium">Moneda</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as 'CRC' | 'USD')}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">₡ CRC</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fecha</Label>
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-10 text-sm" />
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {/* Step 1: Source + Product + Customer */}
          {!isPrefilled && step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fuente *</Label>
                <Select value={source} onValueChange={(v) => { setSource(v); setSelectedAd(null); }}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="¿De dónde vino?" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Producto / Servicio
                </Label>
                {showNewProduct ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del producto"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      className="h-10 text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); }}
                    />
                    <Button size="sm" className="h-10 text-xs" onClick={handleAddProduct} disabled={!newProductName.trim() || addProduct.isPending}>
                      {addProduct.isPending ? '...' : 'OK'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowNewProduct(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={product || '_none'} onValueChange={handleProductChange}>
                      <SelectTrigger className="h-10 text-sm flex-1"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sin producto</SelectItem>
                        {allProductOptions.map(name => {
                          const matched = products.find(p => p.name === name);
                          return (
                            <SelectItem key={name} value={name}>
                              {name}
                              {matched?.price != null && (
                                <span className="text-muted-foreground ml-1">
                                  ({matched.currency === 'CRC' ? '₡' : '$'}{matched.price.toLocaleString()})
                                </span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => setShowNewProduct(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo
                    </Button>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cliente</Label>
                <Input placeholder="Opcional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-10 text-sm" />
              </div>

              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {/* Step 2: Platform + Notes */}
          {!isPrefilled && step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Closer / Vendedor</Label>
                <Select value={closerName || '_none'} onValueChange={v => setCloserName(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="¿Quién cerró la venta?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                    {closerName && !closers.some(c => c.fullName === closerName) && (
                      <SelectItem value={closerName} className="text-xs">{closerName}</SelectItem>
                    )}
                    {closers.map(c => (
                      <SelectItem key={c.userId} value={c.fullName} className="text-xs">{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Plataforma del mensaje</Label>
                <Select value={messagePlatform} onValueChange={setMessagePlatform}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Notas</Label>
                <Textarea placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-sm" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {/* Step 3: Ad selection (only for non-prefilled ad source) */}
          {!isPrefilled && step === 3 && needsAdStep && (
            <div className="space-y-3 py-4">
              <AdGridSelector
                ads={allAds}
                isLoading={adsLoading}
                selectedAd={selectedAd}
                onSelect={setSelectedAd}
                currency={adsCurrency}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs">
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancelar
            </Button>
          )}

          {step < lastStep ? (
            <Button size="sm" onClick={handleNext} className="text-xs">
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="text-xs">
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
