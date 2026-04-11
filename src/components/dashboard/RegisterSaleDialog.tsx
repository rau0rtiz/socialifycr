import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBrand } from '@/contexts/BrandContext';
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
import { useStudentContacts, StudentContactInput } from '@/hooks/use-student-contacts';
import { useClientTeachers } from '@/hooks/use-client-teachers';
import { useClassGroups } from '@/hooks/use-class-groups';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { FREQUENCY_LABELS, CollectionFrequency } from '@/hooks/use-payment-collections';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, X, Package, User, Tag, Megaphone, CreditCard, Phone, Mail, Wallet, CalendarIcon, Banknote, Search, GraduationCap, Clock, UserCheck, Receipt, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

export interface SalePrefill {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
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
  { value: 'landing_page', label: 'Landing Page' },
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
  const { selectedClient } = useBrand();
  const isSilvia = selectedClient?.name?.toLowerCase().includes('silvia');
  const isSpkUp = selectedClient?.name?.toLowerCase().includes('speak up');
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
  const [hasDeposit, setHasDeposit] = useState(false);
  const [depositBalanceDueDate, setDepositBalanceDueDate] = useState('');

  // Speak Up state
  const [spkStudentSearch, setSpkStudentSearch] = useState('');
  const [spkSelectedStudentId, setSpkSelectedStudentId] = useState<string | null>(null);
  const [spkCreatingStudent, setSpkCreatingStudent] = useState(false);
  const [spkStudentName, setSpkStudentName] = useState('');
  const [spkStudentPhone, setSpkStudentPhone] = useState('');
  const [spkStudentEmail, setSpkStudentEmail] = useState('');
  const [spkStudentIdNumber, setSpkStudentIdNumber] = useState('');
  const [spkStudentAge, setSpkStudentAge] = useState('');
  const [spkStudentGender, setSpkStudentGender] = useState('');
  const [spkStudentNotes, setSpkStudentNotes] = useState('');
  const [spkGuardianName, setSpkGuardianName] = useState('');
  const [spkGuardianPhone, setSpkGuardianPhone] = useState('');
  const [spkGuardianIdNumber, setSpkGuardianIdNumber] = useState('');
  const [spkGuardianEmail, setSpkGuardianEmail] = useState('');
  const [spkSelectedTeacherId, setSpkSelectedTeacherId] = useState<string | null>(null);
  const [spkAssignedSchedule, setSpkAssignedSchedule] = useState<any[]>([]);
  const [spkApplyTax, setSpkApplyTax] = useState(false);
  const [spkDiscountAmount, setSpkDiscountAmount] = useState('');
  const [spkDiscountReason, setSpkDiscountReason] = useState('');
  const [spkPaymentDay, setSpkPaymentDay] = useState('');
  const [spkSelectedGroupId, setSpkSelectedGroupId] = useState<string | null>(null);
  const { products, addProduct } = useClientProducts(clientId || null);
  const { data: closers = [] } = useClientClosers(clientId || null);
  const { data: allSchemes = [] } = useClientPaymentSchemes(clientId || null);
  const { students, addStudent } = useStudentContacts(clientId || null);
  const { teachers } = useClientTeachers(clientId || null);
  const { groups, getGroupOccupancy, getGroupMembers, addMember: addGroupMember } = useClassGroups(clientId || null);
  const productNames = products.map(p => p.name);

  const isEditing = !!editingSale;
  const isPrefilled = !!prefill && !editingSale;

  // All flows use the same steps: Product → Info → Ad (optional) → Notes
  // Prefilled data just pre-populates fields
  const prefillHasAd = isPrefilled && !!prefill?.ad_id;
  const needsAdStep = source === 'ad' && hasAdAccount && !prefillHasAd;

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
    setHasDeposit(false);
    setDepositBalanceDueDate('');
    setShowNewPaymentMethod(false);
    setNewPaymentMethodName('');
    // Reset Speak Up state
    setSpkStudentSearch('');
    setSpkSelectedStudentId(null);
    setSpkCreatingStudent(false);
    setSpkStudentName('');
    setSpkStudentPhone('');
    setSpkStudentEmail('');
    setSpkStudentIdNumber('');
    setSpkStudentAge('');
    setSpkStudentGender('');
    setSpkStudentNotes('');
    setSpkGuardianName('');
    setSpkGuardianPhone('');
    setSpkGuardianIdNumber('');
    setSpkGuardianEmail('');
    setSpkSelectedTeacherId(null);
    setSpkAssignedSchedule([]);
    setSpkApplyTax(false);
    setSpkDiscountAmount('');
    setSpkDiscountReason('');
    setSpkPaymentDay('');
    setSpkSelectedGroupId(null);
    if (editingSale) {
      setAmount(String(editingSale.amount));
      setCurrency(editingSale.currency);
      setSaleDate(editingSale.sale_date);
      setSource(editingSale.source);
      setCustomerName(editingSale.customer_name || '');
      setCustomerPhone((editingSale as any).customer_phone || '');
      setProduct(editingSale.product || (editingSale as any).brand || '');
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
      setCustomerPhone(prefill.customer_phone || '');
      setCustomerEmail(prefill.customer_email || '');
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

    // Validate deposit
    if (hasDeposit && !selectedSchemeId) {
      if (!totalSaleAmount || totalSaleAmount <= 0) {
        toast.error('Ingresa el monto total del servicio');
        return;
      }
      if (parseFloat(amount || '0') >= totalSaleAmount) {
        toast.error('El adelanto debe ser menor al monto total');
        return;
      }
      if (!depositBalanceDueDate) {
        toast.error('Selecciona la fecha de cobro del saldo');
        return;
      }
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

    // For deposit flow without scheme, set installments to 2 (deposit + balance)
    const effectiveNumInstallments = hasDeposit && !selectedSchemeId && totalSaleAmount > parseFloat(amount || '0')
      ? 2 : numInstallments;
    const effectiveInstallmentsPaid = hasDeposit && !selectedSchemeId ? 1 : installmentsPaid;

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
      num_installments: effectiveNumInstallments,
      installments_paid: effectiveInstallmentsPaid,
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
      : hasDeposit && !selectedSchemeId && totalSaleAmount > parseFloat(amount || '0')
        ? {
            frequency: 'custom' as string,
            startInstallment: 2,
            totalInstallments: 2,
            installmentAmount: totalSaleAmount - parseFloat(amount || '0'),
            currency,
            customDates: depositBalanceDueDate ? [depositBalanceDueDate] : undefined,
            startDate: undefined,
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
    if (step === 0) return 'Selecciona el producto y variante';
    if (step === 1) return 'Nombre, contacto, closer y fuente de la venta';
    const adStepIdx = needsAdStep ? 2 : -1;
    if (step === adStepIdx) return 'Selecciona el anuncio que originó esta venta';
    return 'Plataforma, notas y fecha';
  };

  // Determine which step index is the "ad" step and which is "notes"
  const adStepIndex = needsAdStep ? 2 : -1;
  const notesStepIndex = needsAdStep ? 3 : 2;

  // Alma Bendita simplified edit view
  const isAlmaBendita = selectedClient?.name?.toLowerCase().includes('alma bendita');

  if (isEditing && isAlmaBendita) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-base">Editar Venta</DialogTitle>
              <DialogDescription className="text-xs">Modifica los campos de la venta</DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-4 overflow-y-auto space-y-3" style={{ maxHeight: '65vh' }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Cliente *</Label>
                <Input placeholder="Nombre del cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Teléfono</Label>
                <Input placeholder="8888-8888" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Marca</Label>
              <Input placeholder="Nombre de la marca" value={product} onChange={e => setProduct(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Monto (₡)</Label>
                <Input type="number" placeholder="15000" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm" min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fecha</Label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Vendedor</Label>
              <Input placeholder="Nombre del vendedor" value={closerName} onChange={e => setCloserName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Notas adicionales</Label>
              <Input placeholder="Detalles adicionales" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="px-6 pb-4">
            <Button className="w-full" onClick={() => {
              if (!amount) { toast.error('El monto es requerido'); return; }
              if (!customerName.trim()) { toast.error('El nombre del cliente es requerido'); return; }
              const sale: any = {
                sale_date: saleDate,
                amount: parseFloat(amount),
                currency: 'CRC',
                source: source || 'story',
                customer_name: customerName.trim() || undefined,
                customer_phone: customerPhone.trim() || undefined,
                brand: product.trim() || undefined,
                closer_name: closerName.trim() || undefined,
                notes: notes || undefined,
                status: 'completed',
              };
              onSubmit(sale);
            }} disabled={isSubmitting || !amount || !customerName.trim()}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Single-view edit mode (standard clients)
  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-base">Editar Venta</DialogTitle>
              <DialogDescription className="text-xs">Modifica los campos que necesites</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-2 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            <div className="space-y-5">
              {/* Section: Product */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Producto
                </p>
                <div className="space-y-2">
                  {showNewProduct ? (
                    <div className="flex gap-2">
                      <Input placeholder="Nombre del producto" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="h-9 text-sm flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); }} />
                      <Button size="sm" className="h-9 text-xs" onClick={handleAddProduct} disabled={!newProductName.trim() || addProduct.isPending}>{addProduct.isPending ? '...' : 'OK'}</Button>
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowNewProduct(false)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select value={product || '_none'} onValueChange={handleProductChange}>
                        <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                        <SelectContent className="max-w-[320px]">
                          <SelectItem value="_none">Sin producto</SelectItem>
                          {allProductOptions.map(name => {
                            const matched = products.find(p => p.name === name);
                            return (
                              <SelectItem key={name} value={name}>
                                <div className="flex items-center gap-2 max-w-[280px]">
                                  {matched?.photo_url && <img src={matched.photo_url} className="w-5 h-5 rounded object-cover flex-shrink-0" alt="" />}
                                  <span className="truncate">{name}</span>
                                  {matched?.price != null && <span className="text-muted-foreground ml-1 flex-shrink-0">({matched.currency === 'CRC' ? '₡' : '$'}{matched.price.toLocaleString()})</span>}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowNewProduct(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Nuevo</Button>
                    </div>
                  )}

                  {product && productSchemes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Variante</Label>
                      <Select value={selectedSchemeId || '_none'} onValueChange={handleSchemeChange}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar variante" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Pago directo (sin variante)</SelectItem>
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
                          <Select value={String(installmentsPaid)} onValueChange={v => { const paid = parseInt(v); setInstallmentsPaid(paid); setAmount(String(installmentAmount * paid)); }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: numInstallments }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} de {numInstallments} cuotas</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {selectedSchemeId && numInstallments > 1 && installmentsPaid < numInstallments && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px]">Frecuencia de cobro</Label>
                          <Select value={collectionFrequency} onValueChange={(v) => { setCollectionFrequency(v); if (v === 'custom') { setCustomCollectionDates(Array(numInstallments - installmentsPaid).fill('')); } else { setCustomCollectionDates([]); } }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {collectionFrequency === 'custom' ? (
                            <div className="space-y-2 mt-2">
                              <p className="text-[10px] text-muted-foreground">Define la fecha de cada cuota pendiente ({numInstallments - installmentsPaid} cobros)</p>
                              {customCollectionDates.map((date, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">Cuota {installmentsPaid + idx + 1}</span>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className={cn("h-7 text-xs flex-1 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                                        {date ? format(new Date(date + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={date ? new Date(date + 'T12:00:00') : undefined} onSelect={(d) => { const updated = [...customCollectionDates]; updated[idx] = d ? d.toISOString().split('T')[0] : ''; setCustomCollectionDates(updated); }} initialFocus className="p-3 pointer-events-auto" />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1.5 mt-1">
                              <Label className="text-[10px]">Fecha inicial de cobro</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("w-full h-7 text-xs justify-start text-left font-normal", !collectionStartDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                                    {collectionStartDate ? format(new Date(collectionStartDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Seleccionar fecha'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={collectionStartDate ? new Date(collectionStartDate + 'T12:00:00') : undefined} onSelect={(d) => setCollectionStartDate(d ? d.toISOString().split('T')[0] : '')} initialFocus className="p-3 pointer-events-auto" />
                                </PopoverContent>
                              </Popover>
                              <p className="text-[10px] text-muted-foreground">Se generarán {numInstallments - installmentsPaid} cobros pendientes</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-medium">Monto *</Label>
                      <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs font-medium">Moneda</Label>
                      <Select value={currency} onValueChange={(v) => setCurrency(v as 'CRC' | 'USD')}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRC">₡ CRC</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {totalSaleAmount > 0 && totalSaleAmount !== parseFloat(amount || '0') && (
                    <p className="text-[10px] text-muted-foreground">Total de la venta: {currency === 'CRC' ? '₡' : '$'}{totalSaleAmount.toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Section: Client Info */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Cliente
                </p>
                <div className="space-y-2">
                  <Input placeholder="Nombre completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-9 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Teléfono" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="Correo" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>

              {/* Section: Sale Details */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Detalles
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Closer</Label>
                      <Select value={closerName || '_none'} onValueChange={v => setCloserName(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                          {closerName && !closers.some(c => c.fullName === closerName) && <SelectItem value={closerName} className="text-xs">{closerName}</SelectItem>}
                          {closers.map(c => <SelectItem key={c.userId} value={c.fullName} className="text-xs">{c.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Fuente *</Label>
                      <Select value={source} onValueChange={(v) => { setSource(v); setSelectedAd(null); }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="¿De dónde?" /></SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Método de pago</Label>
                      {showNewPaymentMethod ? (
                        <div className="flex gap-1">
                          <Input placeholder="Método" value={newPaymentMethodName} onChange={e => setNewPaymentMethodName(e.target.value)} className="h-9 text-sm flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter' && newPaymentMethodName.trim()) { setPaymentMethod(newPaymentMethodName.trim()); setShowNewPaymentMethod(false); setNewPaymentMethodName(''); } }} />
                          <Button size="sm" className="h-9 text-xs px-2" onClick={() => { setPaymentMethod(newPaymentMethodName.trim()); setShowNewPaymentMethod(false); setNewPaymentMethodName(''); }} disabled={!newPaymentMethodName.trim()}>OK</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Select value={paymentMethod || '_none'} onValueChange={v => setPaymentMethod(v === '_none' ? '' : v)}>
                            <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">Sin especificar</SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                              <SelectItem value="sinpe">SINPE</SelectItem>
                              <SelectItem value="transferencia_bancaria">Transferencia</SelectItem>
                              <SelectItem value="stripe">Stripe</SelectItem>
                              {paymentMethod && !['efectivo', 'sinpe', 'stripe', 'transferencia_bancaria'].includes(paymentMethod) && <SelectItem value={paymentMethod}>{paymentMethod}</SelectItem>}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="h-9 text-xs px-2" onClick={() => setShowNewPaymentMethod(true)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Plataforma</Label>
                      <Select value={messagePlatform || '_none'} onValueChange={v => setMessagePlatform(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Sin especificar</SelectItem>
                          {PLATFORM_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Fecha de venta</Label>
                    <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9 text-sm" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Estado</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completada</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Notas</Label>
                    <Textarea placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
                  </div>
                </div>
              </div>

              {/* Ad attribution (if ad source) */}
              {source === 'ad' && hasAdAccount && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" /> Anuncio vinculado
                  </p>
                  {selectedAd ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <span className="text-xs flex-1 truncate">{selectedAd.name}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedAd(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <AdGridSelector ads={allAds} isLoading={adsLoading} selectedAd={selectedAd} onSelect={setSelectedAd} currency={adsCurrency} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="text-xs">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══════ SPEAK UP: 4-step sales flow ═══════
  if (isSpkUp && !isEditing) {
    const selectedProductObj = products.find(p => p.name === product);
    const isGroupProduct = selectedProductObj?.category === 'group';
    const spkStepNames = isGroupProduct
      ? ['Estudiante', 'Producto', 'Grupo', 'Horario', 'Pago']
      : ['Estudiante', 'Producto', 'Horario', 'Pago'];
    const spkTotalSteps = spkStepNames.length;
    const spkLastStep = spkTotalSteps - 1;

    const selectedStudent = students.find(s => s.id === spkSelectedStudentId);
    const productAudience = selectedProductObj?.audience || 'all';
    const isMinor = spkStudentAge ? parseInt(spkStudentAge) < 18 : false;

    // Groups for this product
    const productGroups = isGroupProduct && selectedProductObj
      ? groups.filter(g => g.product_id === selectedProductObj.id && g.status === 'active')
      : [];
    const selectedGroup = productGroups.find(g => g.id === spkSelectedGroupId);

    // Filter students by search
    const filteredStudents = spkStudentSearch.trim()
      ? students.filter(s => s.full_name.toLowerCase().includes(spkStudentSearch.toLowerCase()) || s.phone?.includes(spkStudentSearch) || s.email?.toLowerCase().includes(spkStudentSearch.toLowerCase()))
      : students.slice(0, 10);

    // Filter teachers by product and audience compatibility
    const compatibleTeachers = selectedProductObj
      ? teachers.filter(t => {
          if (t.status !== 'active') return false;
          const canTeachProduct = t.product_ids.length === 0 || t.product_ids.includes(selectedProductObj.id);
          const audienceMatch = t.audience_types.length === 0 ||
            t.audience_types.includes(productAudience) ||
            productAudience === 'all';
          return canTeachProduct && audienceMatch;
        })
      : [];

    // Calculate amounts
    const baseAmount = parseFloat(amount || '0');
    const discountAmt = parseFloat(spkDiscountAmount || '0');
    const taxRate = selectedProductObj?.tax_rate || 13;
    const subtotalCalc = baseAmount - discountAmt;
    const taxCalc = spkApplyTax ? Math.round(subtotalCalc * (taxRate / 100)) : 0;
    const totalCalc = subtotalCalc + taxCalc;

    // Step index mapping
    const groupStepIdx = isGroupProduct ? 2 : -1;
    const scheduleStepIdx = isGroupProduct ? 3 : 2;
    const paymentStepIdx = isGroupProduct ? 4 : 3;

    const spkCanAdvance = (s: number) => {
      if (s === 0) return !!spkSelectedStudentId || spkCreatingStudent;
      if (s === 1) return !!product;
      if (s === groupStepIdx) return !!spkSelectedGroupId; // Must select a group
      if (s === scheduleStepIdx) return true; // Schedule & teacher optional
      return true;
    };

    const handleSpkCreateStudent = async () => {
      if (!spkStudentName.trim()) { toast.error('El nombre es obligatorio'); return; }
      if (isMinor && !spkGuardianName.trim()) { toast.error('Se requiere un encargado para menores de 18'); return; }
      try {
        const input: StudentContactInput = {
          full_name: spkStudentName.trim(),
          phone: spkStudentPhone.trim() || null,
          email: spkStudentEmail.trim() || null,
          id_number: spkStudentIdNumber.trim() || null,
          age: spkStudentAge ? parseInt(spkStudentAge) : null,
          gender: spkStudentGender || null,
          notes: spkStudentNotes.trim() || null,
          guardian_name: isMinor ? spkGuardianName.trim() || null : null,
          guardian_phone: isMinor ? spkGuardianPhone.trim() || null : null,
          guardian_id_number: isMinor ? spkGuardianIdNumber.trim() || null : null,
          guardian_email: isMinor ? spkGuardianEmail.trim() || null : null,
        };
        const result = await addStudent.mutateAsync(input);
        setSpkSelectedStudentId(result.id);
        setSpkCreatingStudent(false);
        setCustomerName(spkStudentName.trim());
        setCustomerPhone(spkStudentPhone.trim());
        toast.success('Estudiante creado');
      } catch {
        toast.error('Error al crear estudiante');
      }
    };

    const handleSpkSubmit = () => {
      if (!amount || parseFloat(amount) <= 0) { toast.error('El monto es requerido'); return; }
      if (!source) { toast.error('La fuente es requerida'); return; }
      if (discountAmt > 0 && !spkDiscountReason.trim()) { toast.error('Indica la razón del descuento'); return; }

      const sale: any = {
        sale_date: saleDate,
        amount: totalCalc,
        currency,
        source: source as SaleInput['source'],
        customer_name: selectedStudent?.full_name || customerName || undefined,
        customer_phone: selectedStudent?.phone || customerPhone || undefined,
        product: product || undefined,
        notes: notes || undefined,
        status: 'completed',
        closer_name: closerName || undefined,
        payment_method: paymentMethod || undefined,
        payment_scheme_id: selectedSchemeId || undefined,
        total_sale_amount: totalSaleAmount || totalCalc || undefined,
        num_installments: numInstallments,
        installments_paid: installmentsPaid,
        installment_amount: installmentAmount || undefined,
        student_contact_id: spkSelectedStudentId || undefined,
        teacher_id: spkSelectedTeacherId === '_pending' ? undefined : spkSelectedTeacherId || undefined,
        assigned_schedule: spkAssignedSchedule.length > 0 ? spkAssignedSchedule : undefined,
        discount_amount: discountAmt || undefined,
        discount_reason: discountAmt > 0 ? spkDiscountReason.trim() : undefined,
        tax_amount: taxCalc || undefined,
        subtotal: subtotalCalc || undefined,
        payment_day: spkPaymentDay ? parseInt(spkPaymentDay) : undefined,
      };

      const hasRemainingInstallments = selectedSchemeId && numInstallments > 1 && installmentsPaid < numInstallments;
      const collectionMeta = hasRemainingInstallments
        ? { frequency: collectionFrequency, startInstallment: installmentsPaid + 1, totalInstallments: numInstallments, installmentAmount, currency }
        : selectedProductObj?.is_recurring && spkPaymentDay
          ? { frequency: 'monthly', startInstallment: 2, totalInstallments: 12, installmentAmount: totalCalc, currency, startDate: saleDate }
          : undefined;

      onSubmit(sale, undefined, collectionMeta);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
          <div className="px-6 pt-6 pb-2 space-y-3">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-base text-center">Registrar Venta</DialogTitle>
              <DialogDescription className="text-center text-xs">
                {spkStepNames[step]}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2">
              {spkStepNames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { if (i < step) setStep(i); }}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === step ? 'w-6 h-2 bg-primary' : i < step ? 'w-2 h-2 bg-primary/40 cursor-pointer' : 'w-2 h-2 bg-muted-foreground/20'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="px-6 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '55vh' }}>
            {/* Step 0: Student */}
            {step === 0 && (
              <div className="space-y-3 py-3">
                {!spkCreatingStudent ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar estudiante..."
                        value={spkStudentSearch}
                        onChange={e => setSpkStudentSearch(e.target.value)}
                        className="h-10 text-sm pl-9"
                        autoFocus
                      />
                    </div>
                    {selectedStudent && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                        <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedStudent.full_name}</p>
                          {selectedStudent.phone && <p className="text-[10px] text-muted-foreground">{selectedStudent.phone}</p>}
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSpkSelectedStudentId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {!selectedStudent && (
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {filteredStudents.map(s => (
                          <button
                            key={s.id}
                            className="w-full text-left p-2.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors"
                            onClick={() => { setSpkSelectedStudentId(s.id); setCustomerName(s.full_name); setCustomerPhone(s.phone || ''); }}
                          >
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
                          </button>
                        ))}
                        {filteredStudents.length === 0 && spkStudentSearch && (
                          <p className="text-xs text-muted-foreground text-center py-4">No se encontraron resultados</p>
                        )}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5" onClick={() => { setSpkCreatingStudent(true); setSpkStudentName(spkStudentSearch); }}>
                      <Plus className="h-3.5 w-3.5" /> Crear nuevo estudiante
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuevo estudiante</p>
                    <Input placeholder="Nombre completo *" value={spkStudentName} onChange={e => setSpkStudentName(e.target.value)} className="h-9 text-sm" autoFocus />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Teléfono" value={spkStudentPhone} onChange={e => setSpkStudentPhone(e.target.value)} className="h-9 text-sm" />
                      <Input placeholder="Correo" value={spkStudentEmail} onChange={e => setSpkStudentEmail(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Cédula" value={spkStudentIdNumber} onChange={e => setSpkStudentIdNumber(e.target.value)} className="h-9 text-sm" />
                      <Input placeholder="Edad" type="number" min={1} max={120} value={spkStudentAge} onChange={e => setSpkStudentAge(e.target.value)} className="h-9 text-sm" />
                      <Select value={spkStudentGender || '_none'} onValueChange={v => setSpkStudentGender(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Género" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Femenino</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isMinor && (
                      <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Encargado (menor de edad)</p>
                        <Input placeholder="Nombre del encargado *" value={spkGuardianName} onChange={e => setSpkGuardianName(e.target.value)} className="h-9 text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Teléfono encargado" value={spkGuardianPhone} onChange={e => setSpkGuardianPhone(e.target.value)} className="h-9 text-sm" />
                          <Input placeholder="Cédula encargado" value={spkGuardianIdNumber} onChange={e => setSpkGuardianIdNumber(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <Input placeholder="Correo encargado" value={spkGuardianEmail} onChange={e => setSpkGuardianEmail(e.target.value)} className="h-9 text-sm" />
                      </div>
                    )}
                    <Input placeholder="Notas adicionales" value={spkStudentNotes} onChange={e => setSpkStudentNotes(e.target.value)} className="h-9 text-sm" />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSpkCreatingStudent(false)}>Cancelar</Button>
                      <Button size="sm" className="text-xs flex-1" onClick={handleSpkCreateStudent} disabled={!spkStudentName.trim() || addStudent.isPending}>
                        {addStudent.isPending ? 'Creando...' : 'Crear y seleccionar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Product */}
            {step === 1 && (
              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Producto / Servicio
                  </Label>
                  <Select value={product || '_none'} onValueChange={handleProductChange}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                    <SelectContent className="max-w-[320px]">
                      <SelectItem value="_none">Sin producto</SelectItem>
                      {products.map(p => (
                        <SelectItem key={p.name} value={p.name}>
                          <div className="flex items-center gap-2 max-w-[280px]">
                            <span className="truncate">{p.name}</span>
                            {p.category && <Badge variant="outline" className="text-[9px] py-0 shrink-0">{p.category}</Badge>}
                            {p.price != null && <span className="text-muted-foreground text-[10px] shrink-0">{p.currency === 'CRC' ? '₡' : '$'}{p.price.toLocaleString()}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProductObj && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProductObj.category && <Badge variant="secondary" className="text-[10px]">{selectedProductObj.category}</Badge>}
                      {selectedProductObj.audience && selectedProductObj.audience !== 'all' && <Badge variant="outline" className="text-[10px]">{selectedProductObj.audience === 'children' ? 'Niños' : selectedProductObj.audience === 'adults' ? 'Adultos' : selectedProductObj.audience}</Badge>}
                      {selectedProductObj.is_recurring && <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">Mensual</Badge>}
                    </div>
                    {selectedProductObj.class_frequency && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(selectedProductObj.class_frequency as any).sessions_per_week}x/semana · {(selectedProductObj.class_frequency as any).hours_per_session}h/sesión
                      </p>
                    )}
                  </div>
                )}

                {/* Variant/scheme selector */}
                {product && productSchemes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Variante</Label>
                    <Select value={selectedSchemeId || '_none'} onValueChange={handleSchemeChange}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar variante" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Pago directo</SelectItem>
                        {productSchemes.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — {s.currency === 'CRC' ? '₡' : '$'}{s.total_price.toLocaleString()}
                            {s.num_installments > 1 && ` (${s.num_installments}x)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Schedule + Teacher */}
            {step === 2 && (
              <div className="space-y-4 py-3">
                {/* Schedule selection based on product available_schedules */}
                {selectedProductObj?.available_schedules && (selectedProductObj.available_schedules as any[]).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Horarios del servicio
                    </Label>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                      {(selectedProductObj.available_schedules as any[]).map((block: any, idx: number) => {
                        const isSelected = spkAssignedSchedule.some(s => s.day === block.day && s.start === block.start && s.end === block.end);
                        return (
                          <button
                            key={idx}
                            className={cn(
                              'w-full text-left p-2 rounded-lg border text-xs transition-colors',
                              isSelected ? 'bg-primary/10 border-primary/30 text-primary' : 'hover:bg-muted/50 border-border/50'
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setSpkAssignedSchedule(prev => prev.filter(s => !(s.day === block.day && s.start === block.start && s.end === block.end)));
                              } else {
                                setSpkAssignedSchedule(prev => [...prev, block]);
                              }
                            }}
                          >
                            <span className="font-medium capitalize">{block.day}</span>
                            <span className="text-muted-foreground ml-2">{block.start} – {block.end}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" /> Profesor
                  </Label>
                  <Select value={spkSelectedTeacherId || '_pending'} onValueChange={v => setSpkSelectedTeacherId(v)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar profesor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_pending">Por definir</SelectItem>
                      {compatibleTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                      {compatibleTeachers.length === 0 && teachers.length > 0 && (
                        <SelectItem value="_none" disabled className="text-muted-foreground text-xs">
                          No hay profesores compatibles con este producto
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {compatibleTeachers.length === 0 && teachers.length > 0 && (
                    <p className="text-[10px] text-amber-600">Ningún profesor configurado puede impartir este producto. Puedes asignar "Por definir".</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-3 py-3">
                {/* Amount */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-medium">Monto base *</Label>
                    <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-10 text-sm" autoFocus />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs font-medium">Moneda</Label>
                    <Select value={currency} onValueChange={v => setCurrency(v as 'CRC' | 'USD')}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRC">₡ CRC</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* IVA */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Aplicar IVA ({taxRate}%)</span>
                  </div>
                  <Switch checked={spkApplyTax} onCheckedChange={setSpkApplyTax} />
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" /> Descuento
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="0" min={0} value={spkDiscountAmount} onChange={e => setSpkDiscountAmount(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="Razón del descuento" value={spkDiscountReason} onChange={e => setSpkDiscountReason(e.target.value)} className="h-9 text-sm" disabled={!spkDiscountAmount || parseFloat(spkDiscountAmount) <= 0} />
                  </div>
                </div>

                {/* Amount summary */}
                {baseAmount > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                    <div className="flex justify-between text-xs"><span>Subtotal</span><span>{currency === 'CRC' ? '₡' : '$'}{subtotalCalc.toLocaleString()}</span></div>
                    {spkApplyTax && <div className="flex justify-between text-xs text-muted-foreground"><span>IVA ({taxRate}%)</span><span>+{currency === 'CRC' ? '₡' : '$'}{taxCalc.toLocaleString()}</span></div>}
                    {discountAmt > 0 && <div className="flex justify-between text-xs text-red-500"><span>Descuento</span><span>-{currency === 'CRC' ? '₡' : '$'}{discountAmt.toLocaleString()}</span></div>}
                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>Total</span><span>{currency === 'CRC' ? '₡' : '$'}{totalCalc.toLocaleString()}</span></div>
                  </div>
                )}

                {/* Payment day for recurring */}
                {selectedProductObj?.is_recurring && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Día de pago mensual</Label>
                    <Input type="number" min={1} max={31} placeholder="Ej: 15" value={spkPaymentDay} onChange={e => setSpkPaymentDay(e.target.value)} className="h-9 text-sm" />
                    <p className="text-[10px] text-muted-foreground">Se generarán cobros recurrentes mensuales</p>
                  </div>
                )}

                {/* Installments for scheme */}
                {selectedSchemeId && numInstallments > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Cuotas pagadas</Label>
                    <Select value={String(installmentsPaid)} onValueChange={v => { setInstallmentsPaid(parseInt(v)); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: numInstallments }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} de {numInstallments}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Payment method */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Método de pago</Label>
                  <Select value={paymentMethod || '_none'} onValueChange={v => setPaymentMethod(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sin especificar</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="sinpe">SINPE</SelectItem>
                      <SelectItem value="transferencia_bancaria">Transferencia</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Source */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Fuente *</Label>
                  <Select value={source || 'organic'} onValueChange={v => setSource(v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Notes */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Fecha</Label>
                    <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Vendedor</Label>
                    <Select value={closerName || '_none'} onValueChange={v => setCloserName(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sin asignar</SelectItem>
                        {closers.map(c => <SelectItem key={c.userId} value={c.fullName}>{c.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Notas</Label>
                  <Textarea placeholder="Opcional" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="text-xs">
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Cancelar</Button>
            )}
            {step < spkLastStep ? (
              <Button size="sm" onClick={() => {
                if (!spkCanAdvance(step)) {
                  if (step === 0) toast.error('Selecciona o crea un estudiante');
                  if (step === 1) toast.error('Selecciona un producto');
                  return;
                }
                // Auto-set source and amount defaults when going to payment step
                if (step === 2 && !source) setSource('organic');
                if (step === 2 && !amount && selectedProductObj?.price) {
                  setAmount(String(selectedProductObj.price));
                  setCurrency(selectedProductObj.currency as 'CRC' | 'USD');
                }
                if (step === 2 && selectedProductObj?.tax_applicable) setSpkApplyTax(true);
                setStep(s => s + 1);
              }} className="text-xs">
                Continuar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSpkSubmit} disabled={isSubmitting} className="text-xs">
                {isSubmitting ? 'Guardando...' : 'Registrar'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Multi-step creation flow (unchanged)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        {/* Header with dots indicator */}
        <div className="px-6 pt-6 pb-2 space-y-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-center">
              {isPrefilled ? 'Registrar Venta de Lead' : 'Registrar Venta'}
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
                    <CreditCard className="h-3.5 w-3.5" /> Variante
                  </Label>
                  <Select value={selectedSchemeId || '_none'} onValueChange={handleSchemeChange}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleccionar variante" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Pago directo (sin variante)</SelectItem>
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
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("h-7 text-xs flex-1 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                                    {date ? format(new Date(date + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={date ? new Date(date + 'T12:00:00') : undefined}
                                    onSelect={(d) => {
                                      const updated = [...customCollectionDates];
                                      updated[idx] = d ? d.toISOString().split('T')[0] : '';
                                      setCustomCollectionDates(updated);
                                    }}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-1">
                          <Label className="text-[10px]">Fecha inicial de cobro</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full h-7 text-xs justify-start text-left font-normal", !collectionStartDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-1.5 h-3 w-3" />
                                {collectionStartDate ? format(new Date(collectionStartDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Seleccionar fecha'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={collectionStartDate ? new Date(collectionStartDate + 'T12:00:00') : undefined}
                                onSelect={(d) => setCollectionStartDate(d ? d.toISOString().split('T')[0] : '')}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-[10px] text-muted-foreground">
                            Se generarán {numInstallments - installmentsPaid} cobros pendientes
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Amount summary (auto-filled or manual) — hidden when deposit mode is active */}
              {!hasDeposit && (
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
              )}

              {totalSaleAmount > 0 && totalSaleAmount !== parseFloat(amount || '0') && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Total de la venta: {currency === 'CRC' ? '₡' : '$'}{totalSaleAmount.toLocaleString()}
                </p>
              )}

              {/* Deposit toggle — only when no payment scheme selected */}
              {!selectedSchemeId && isSilvia && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDeposit}
                      onChange={(e) => {
                        setHasDeposit(e.target.checked);
                        if (e.target.checked) {
                          // Move current amount to total, clear amount for deposit entry
                          const currentAmount = parseFloat(amount || '0');
                          if (currentAmount > 0) {
                            setTotalSaleAmount(currentAmount);
                            setAmount('');
                          }
                        } else {
                          // Restore: move total back to amount
                          if (totalSaleAmount > 0) {
                            setAmount(String(totalSaleAmount));
                            setTotalSaleAmount(0);
                          }
                          setDepositBalanceDueDate('');
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5" /> Cobrar adelanto
                    </span>
                  </label>

                  {hasDeposit && (
                    <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Monto total del servicio</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={totalSaleAmount || ''}
                            onChange={(e) => setTotalSaleAmount(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-[10px]">Moneda</Label>
                          <Select value={currency} onValueChange={(v) => setCurrency(v as 'CRC' | 'USD')}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CRC">₡</SelectItem>
                              <SelectItem value="USD">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Monto del adelanto</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      {totalSaleAmount > 0 && parseFloat(amount || '0') > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Saldo pendiente: {currency === 'CRC' ? '₡' : '$'}
                          {(totalSaleAmount - parseFloat(amount || '0')).toLocaleString()}
                        </p>
                      )}
                      <div className="space-y-1">
                        <Label className="text-[10px]">Fecha de cobro del saldo</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-7 text-xs justify-start text-left font-normal", !depositBalanceDueDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-1.5 h-3 w-3" />
                              {depositBalanceDueDate ? format(new Date(depositBalanceDueDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Seleccionar fecha'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={depositBalanceDueDate ? new Date(depositBalanceDueDate + 'T12:00:00') : undefined}
                              onSelect={(d) => setDepositBalanceDueDate(d ? d.toISOString().split('T')[0] : '')}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
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
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="sinpe">SINPE</SelectItem>
                        <SelectItem value="transferencia_bancaria">Transferencia Bancaria</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        {paymentMethod && !['efectivo', 'sinpe', 'stripe', 'transferencia_bancaria'].includes(paymentMethod) && (
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
              {isSubmitting ? 'Guardando...' : 'Registrar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
