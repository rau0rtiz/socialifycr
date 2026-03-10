import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SaleInput, MessageSale } from '@/hooks/use-sales-tracking';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { useClientProducts } from '@/hooks/use-client-products';
import { AdGridSelector } from '@/components/ventas/AdGridSelector';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, X, Package, User, Tag, Megaphone } from 'lucide-react';

export interface SalePrefill {
  customer_name?: string;
  product?: string;
  source?: string;
  ad_id?: string;
  ad_name?: string;
  ad_campaign_id?: string;
  ad_campaign_name?: string;
  appointmentId?: string;
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
  const [step, setStep] = useState(1);
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

  const { products, addProduct } = useClientProducts(clientId || null);
  const productNames = products.map(p => p.name);

  const isEditing = !!editingSale;
  const isPrefilled = !!prefill && !editingSale;

  // For prefilled mode, skip ad step since ad is already linked
  const needsAdStep = !isPrefilled && source === 'ad' && hasAdAccount;
  const maxStep = needsAdStep ? 2 : 1;

  const { data: allAdsResult, isLoading: adsLoading } = useAllAds(
    clientId || null,
    hasAdAccount && open && needsAdStep
  );
  const allAds = allAdsResult?.ads || [];
  const adsCurrency = allAdsResult?.currency || 'USD';

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setShowNewProduct(false);
    setNewProductName('');
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
      setMessagePlatform('');
      setNotes('');
      setStatus('completed');
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

  const validateForm = () => {
    if (!amount) {
      toast.error('El monto es requerido');
      return false;
    }
    if (!isPrefilled && !source) {
      toast.error('La fuente es requerida');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateForm()) return;
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!validateForm()) return;

    const sale: SaleInput = {
      sale_date: saleDate,
      amount: parseFloat(amount),
      currency,
      source: source as SaleInput['source'],
      customer_name: customerName || undefined,
      product: product || undefined,
      message_platform: messagePlatform || undefined,
      notes: notes || undefined,
      status: status as SaleInput['status'],
    };

    if (source === 'ad' && selectedAd) {
      sale.ad_id = selectedAd.id;
      sale.ad_name = selectedAd.name;
      sale.ad_campaign_id = selectedAd.campaignId;
      sale.ad_campaign_name = selectedAd.campaignName;
    }

    onSubmit(sale, prefill?.appointmentId);
  };

  const isLastStep = step >= maxStep;

  const allProductOptions = product && !productNames.includes(product)
    ? [product, ...productNames]
    : productNames;

  const sourceLabel = SOURCE_OPTIONS.find(o => o.value === source)?.label || source;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Venta' : isPrefilled ? 'Registrar Venta de Lead' : 'Registrar Venta'}
          </DialogTitle>
          <DialogDescription>
            {isPrefilled && prefill?.customer_name
              ? `Completa los datos faltantes para cerrar la venta`
              : maxStep > 1 ? `Paso ${step} de ${maxStep}` : (isEditing ? 'Modifica los datos de la venta' : 'Ingresa los datos de la nueva venta')}
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

        {/* Prefilled summary badges — show what's already known from the lead */}
        {isPrefilled && step === 1 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border border-border">
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

        {/* Step 1: Info */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Amount + Currency — always shown */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Monto *</Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </div>
              <div className="w-24">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as 'CRC' | 'USD')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡ CRC</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date — always shown */}
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>

            {/* Source — hide when prefilled (already shown in badges) */}
            {!isPrefilled && (
              <div>
                <Label>Fuente *</Label>
                <Select value={source} onValueChange={(v) => { setSource(v); setSelectedAd(null); }}>
                  <SelectTrigger><SelectValue placeholder="¿De dónde vino?" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status — only when editing */}
            {isEditing && (
              <div>
                <Label>Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Platform — always shown */}
            <div>
              <Label>Plataforma del mensaje</Label>
              <Select value={messagePlatform} onValueChange={setMessagePlatform}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product — hide when prefilled with product */}
            {!(isPrefilled && prefill?.product) && (
              <div>
                <Label className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Producto / Servicio
                </Label>
                {showNewProduct ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Nombre del producto"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); }}
                    />
                    <Button size="sm" onClick={handleAddProduct} disabled={!newProductName.trim() || addProduct.isPending}>
                      {addProduct.isPending ? '...' : 'OK'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewProduct(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Select value={product || '_none'} onValueChange={v => setProduct(v === '_none' ? '' : v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sin producto</SelectItem>
                        {allProductOptions.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setShowNewProduct(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Customer name — hide when prefilled with name */}
            {!(isPrefilled && prefill?.customer_name) && (
              <div>
                <Label>Cliente</Label>
                <Input placeholder="Opcional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            )}

            {/* Notes — always shown */}
            <div>
              <Label>Notas</Label>
              <Textarea placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {/* Step 2: Ad selection (only for non-prefilled ad source) */}
        {step === 2 && needsAdStep && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Selecciona el anuncio vinculado</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Elige el anuncio que originó esta venta</p>
            </div>
            <AdGridSelector
              ads={allAds}
              isLoading={adsLoading}
              selectedAd={selectedAd}
              onSelect={setSelectedAd}
              currency={adsCurrency}
            />
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          )}

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
