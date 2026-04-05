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
import { useClientPaymentSchemes } from '@/hooks/use-payment-schemes';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { FREQUENCY_LABELS, CollectionFrequency } from '@/hooks/use-payment-collections';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, X, Package, User, Tag, Megaphone, CreditCard, Phone, Mail, Wallet, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  onSubmit: (sale: SaleInput, appointmentId?: string, collectionMeta?: { frequency: string; startInstallment: number; totalInstallments: number; installmentAmount: number; currency: string; customDates?: string[]; startDate?: string }) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editingSale?: MessageSale | null;
  prefill?: SalePrefill | null;
}

const SOURCE_OPTIONS = [
  { value: 'ad', label: 'Publicidad' },
  { value: 'story', label: 'Historia' },
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [product, setProduct] = useState('');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [messagePlatform, setMessagePlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('completed');
  const [closerName, setCloserName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showNewPaymentMethod, setShowNewPaymentMethod] = useState(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [numInstallments, setNumInstallments] = useState(1);
  const [installmentsPaid, setInstallmentsPaid] = useState(1);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [totalSaleAmount, setTotalSaleAmount] = useState(0);
  const [collectionFrequency, setCollectionFrequency] = useState<string>('monthly');
  const [customCollectionDates, setCustomCollectionDates] = useState<string[]>([]);
  const [collectionStartDate, setCollectionStartDate] = useState('');

  const { products, addProduct } = useClientProducts(clientId || null);
  const { data: closers = [] } = useClientClosers(clientId || null);
  const { data: allSchemes = [] } = useClientPaymentSchemes(clientId || null);
  const productNames = products.map(p => p.name);

  const isEditing = !!editingSale;
  const isPrefilled = !!prefill && !editingSale;

  // All flows use the same steps: Product → Info → Ad (optional) → Notes
  // Prefilled data just pre-populates fields
  const needsAdStep = source === 'ad' && hasAdAccount;

  const buildSteps = () => {
    const steps = ['Producto', 'Información'];
    if (needsAdStep) steps.push('Anuncio');
    steps.push('Notas');
    return steps;
  };
  const stepNames = buildSteps();
  const totalSteps = stepNames.length;
  const lastStep = totalSteps - 1;

  const { data: allAdsResult, isLoading: adsLoading } = useAllAds(
    clientId || null,
    hasAdAccount && open && source === 'ad'
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
    setCustomerPhone('');
    setCustomerEmail('');
    setPaymentMethod('');
    setShowNewPaymentMethod(false);
    setNewPaymentMethodName('');
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
      setPaymentMethod((editingSale as any).payment_method || '');
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
    // Step 0: product not strictly required but encouraged
    if (s === 0) return true;
    // Step 1: source required, amount required
    if (s === 1) return !!source && !!amount;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance(step)) {
      if (step === 1 && !source) toast.error('La fuente es requerida');
      if (step === 1 && !amount) toast.error('El monto es requerido');
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
    if (!source) {
      toast.error('La fuente es requerida');
      return;
    }

    // Validate custom collection dates
    const hasRemainingCheck = selectedSchemeId && numInstallments > 1 && installmentsPaid < numInstallments;
    if (hasRemainingCheck && collectionFrequency === 'custom') {
      const filledDates = customCollectionDates.filter(d => d !== '');
      if (filledDates.length < (numInstallments - installmentsPaid)) {
        toast.error('Completa todas las fechas de cobro');
        return;
      }
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
      payment_scheme_id: selectedSchemeId || undefined,
      total_sale_amount: totalSaleAmount || parseFloat(amount) || undefined,
      num_installments: numInstallments,
      installments_paid: installmentsPaid,
      installment_amount: installmentAmount || undefined,
      payment_method: paymentMethod || undefined,
    };

    if (source === 'ad' && selectedAd) {
      sale.ad_id = selectedAd.id;
      sale.ad_name = selectedAd.name;
      sale.ad_campaign_id = selectedAd.campaignId;
      sale.ad_campaign_name = selectedAd.campaignName;
    }

    const hasRemainingInstallments = selectedSchemeId && numInstallments > 1 && installmentsPaid < numInstallments;
    const collectionMeta = hasRemainingInstallments
      ? {
          frequency: collectionFrequency,
          startInstallment: installmentsPaid + 1,
          totalInstallments: numInstallments,
          installmentAmount,
          currency,
          customDates: collectionFrequency === 'custom' ? customCollectionDates.filter(d => d !== '') : undefined,
          startDate: collectionFrequency !== 'custom' && collectionStartDate ? collectionStartDate : undefined,
        }
      : undefined;

    onSubmit(sale, prefill?.appointmentId, collectionMeta);
  };

  const allProductOptions = product && !productNames.includes(product)
    ? [product, ...productNames]
    : productNames;

  const selectedProduct = products.find(p => p.name === product);
  const productSchemes = selectedProduct
    ? allSchemes.filter(s => s.product_id === selectedProduct.id)
    : [];

  const handleProductChange = (v: string) => {
    const selectedName = v === '_none' ? '' : v;
    setProduct(selectedName);
    setSelectedSchemeId('');
    setNumInstallments(1);
    setInstallmentsPaid(1);
    setInstallmentAmount(0);
    setTotalSaleAmount(0);
    if (selectedName) {
      const matched = products.find(p => p.name === selectedName);
      if (matched?.price != null) {
        setAmount(String(matched.price));
        setCurrency(matched.currency as 'CRC' | 'USD');
        setTotalSaleAmount(matched.price);
      }
    }
  };

  const handleSchemeChange = (schemeId: string) => {
    if (schemeId === '_none') {
      setSelectedSchemeId('');
      if (selectedProduct?.price != null) {
        setAmount(String(selectedProduct.price));
        setTotalSaleAmount(selectedProduct.price);
      }
      setNumInstallments(1);
      setInstallmentsPaid(1);
      setInstallmentAmount(0);
      return;
    }
    const scheme = allSchemes.find(s => s.id === schemeId);
    if (!scheme) return;
    setSelectedSchemeId(schemeId);
    setTotalSaleAmount(scheme.total_price);
    setNumInstallments(scheme.num_installments);
    setInstallmentAmount(scheme.installment_amount);
    setInstallmentsPaid(1);
    setAmount(String(scheme.installment_amount));
    setCurrency(scheme.currency as 'CRC' | 'USD');
  };

  const getStepTitle = () => {
    if (step === 0) return '¿Qué se vendió?';
    if (step === 1) return 'Información del cliente';
    const adStepIdx = needsAdStep ? 2 : -1;
    if (step === adStepIdx) return 'Vincular anuncio';
    return 'Detalles finales';
  };

  const getStepDescription = () => {
    if (step === 0) return 'Selecciona el producto y esquema de pago';
    if (step === 1) return 'Nombre, contacto, closer y fuente de la venta';
    const adStepIdx = needsAdStep ? 2 : -1;
    if (step === adStepIdx) return 'Selecciona el anuncio que originó esta venta';
    return 'Plataforma, notas y fecha';
  };

  // Determine which step index is the "ad" step and which is "notes"
  const adStepIndex = needsAdStep ? 2 : -1;
  const notesStepIndex = needsAdStep ? 3 : 2;

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
          {isPrefilled && (
            <div className="flex flex-wrap justify-center gap-2">
              {prefill?.customer_name && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <User className="h-3 w-3" /> {prefill.customer_name}
                </Badge>
              )}
              {prefill?.ad_name && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Megaphone className="h-3 w-3" /> {prefill.ad_name}
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
          {/* Step 0: Product + Payment Scheme */}
          {step === 0 && (
            <div className="space-y-4 py-4">
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
                      <SelectTrigger className="h-10 text-sm flex-1 min-w-0 overflow-hidden"><SelectValue placeholder="Seleccionar producto" className="truncate block max-w-[200px]" /></SelectTrigger>
                      <SelectContent className="max-w-[320px]">
                        <SelectItem value="_none">Sin producto</SelectItem>
                        {allProductOptions.map(name => {
                          const matched = products.find(p => p.name === name);
                          return (
                            <SelectItem key={name} value={name}>
                              <div className="flex items-center gap-2 max-w-[280px]">
                                {matched?.photo_url && (
                                  <img src={matched.photo_url} className="w-5 h-5 rounded object-cover flex-shrink-0" alt="" />
                                )}
                                <span className="truncate">{name}</span>
                                {matched?.price != null && (
                                  <span className="text-muted-foreground ml-1 flex-shrink-0">
                                    ({matched.currency === 'CRC' ? '₡' : '$'}{matched.price.toLocaleString()})
                                  </span>
                                )}
                              </div>
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

              {/* Payment scheme selector */}
              {product && productSchemes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Esquema de pago
                  </Label>
                  <Select value={selectedSchemeId || '_none'} onValueChange={handleSchemeChange}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar esquema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Pago directo (sin esquema)</SelectItem>
                      {productSchemes.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {s.currency === 'CRC' ? '₡' : '$'}{s.total_price.toLocaleString()}
                          {s.num_installments > 1 && ` (${s.num_installments}x ${s.currency === 'CRC' ? '₡' : '$'}${s.installment_amount.toLocaleString()})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSchemeId && numInstallments > 1 && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Cuotas pagadas al registrar</Label>
                      <Select value={String(installmentsPaid)} onValueChange={v => {
                        const paid = parseInt(v);
                        setInstallmentsPaid(paid);
                        setAmount(String(installmentAmount * paid));
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: numInstallments }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1} de {numInstallments} cuotas
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedSchemeId && numInstallments > 1 && installmentsPaid < numInstallments && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Frecuencia de cobro</Label>
                      <Select value={collectionFrequency} onValueChange={(v) => {
                        setCollectionFrequency(v);
                        if (v === 'custom') {
                          const remaining = numInstallments - installmentsPaid;
                          setCustomCollectionDates(Array(remaining).fill(''));
                        } else {
                          setCustomCollectionDates([]);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {collectionFrequency === 'custom' ? (
                        <div className="space-y-2 mt-2">
                          <p className="text-[10px] text-muted-foreground">
                            Define la fecha de cada cuota pendiente ({numInstallments - installmentsPaid} cobros)
                          </p>
                          {customCollectionDates.map((date, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">
                                Cuota {installmentsPaid + idx + 1}
                              </span>
                              <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                  const updated = [...customCollectionDates];
                                  updated[idx] = e.target.value;
                                  setCustomCollectionDates(updated);
                                }}
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-1">
                          <Label className="text-[10px]">Fecha inicial de cobro</Label>
                          <Input
                            type="date"
                            value={collectionStartDate}
                            onChange={(e) => setCollectionStartDate(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Se generarán {numInstallments - installmentsPaid} cobros pendientes
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Amount summary (auto-filled or manual) */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Monto a cobrar *</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 text-sm" />
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

              {totalSaleAmount > 0 && totalSaleAmount !== parseFloat(amount || '0') && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Total de la venta: {currency === 'CRC' ? '₡' : '$'}{totalSaleAmount.toLocaleString()}
                </p>
              )}

              <p className="text-[11px] text-muted-foreground text-center">{getStepDescription()}</p>
            </div>
          )}

          {/* Step 1: Lead info — name, phone, email, closer, source, date */}
          {step === 1 && (
            <div className="space-y-3 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Nombre del cliente
                </Label>
                <Input placeholder="Nombre completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-10 text-sm" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Teléfono
                  </Label>
                  <Input placeholder="Opcional" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Correo
                  </Label>
                  <Input placeholder="Opcional" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="h-10 text-sm" />
                </div>
              </div>

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
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Método de pago
                </Label>
                {showNewPaymentMethod ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del método"
                      value={newPaymentMethodName}
                      onChange={e => setNewPaymentMethodName(e.target.value)}
                      className="h-10 text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && newPaymentMethodName.trim()) { setPaymentMethod(newPaymentMethodName.trim()); setShowNewPaymentMethod(false); setNewPaymentMethodName(''); } }}
                    />
                    <Button size="sm" className="h-10 text-xs" onClick={() => { setPaymentMethod(newPaymentMethodName.trim()); setShowNewPaymentMethod(false); setNewPaymentMethodName(''); }} disabled={!newPaymentMethodName.trim()}>
                      OK
                    </Button>
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setShowNewPaymentMethod(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={paymentMethod || '_none'} onValueChange={v => setPaymentMethod(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-10 text-sm flex-1"><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-xs">Sin especificar</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="transferencia_bancaria">Transferencia Bancaria</SelectItem>
                        {paymentMethod && !['stripe', 'transferencia_bancaria'].includes(paymentMethod) && (
                          <SelectItem value={paymentMethod}>{paymentMethod}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => setShowNewPaymentMethod(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Otro
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Fuente de la venta *</Label>
                <Select value={source} onValueChange={(v) => { setSource(v); setSelectedAd(null); }}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="¿De dónde vino?" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Fecha de venta</Label>
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

          {/* Ad selection step (only if source=ad) */}
          {step === adStepIndex && needsAdStep && (
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

          {/* Notes step (last step for standard flow) */}
          {step === notesStepIndex && (
            <div className="space-y-4 py-4">
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
