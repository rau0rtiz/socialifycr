import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { SaleInput, MessageSale } from '@/hooks/use-sales-tracking';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { toast } from 'sonner';
import { Image as ImageIcon, Link2, X } from 'lucide-react';

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sale: SaleInput) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editingSale?: MessageSale | null;
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
}: RegisterSaleDialogProps) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<string>('');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [showAdPicker, setShowAdPicker] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [messagePlatform, setMessagePlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('completed');

  const { data: allAdsResult, isLoading: adsLoading } = useAllAds(
    clientId || null,
    hasAdAccount && open && source === 'ad'
  );
  const allAds = allAdsResult?.ads;

  // Populate form when editing
  useEffect(() => {
    if (editingSale && open) {
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
    } else if (!editingSale && open) {
      // Reset for new sale
      setAmount('');
      setCurrency('CRC');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSource('');
      setSelectedAd(null);
      setShowAdPicker(false);
      setCustomerName('');
      setProduct('');
      setMessagePlatform('');
      setNotes('');
      setStatus('completed');
    }
  }, [editingSale, open]);

  const handleSubmit = () => {
    if (!amount || !source) {
      toast.error('Monto y fuente son requeridos');
      return;
    }

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

    onSubmit(sale);
  };

  const isEditing = !!editingSale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Venta' : 'Registrar Venta'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Modifica los datos de la venta' : 'Ingresa los datos de la nueva venta'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount & Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Monto</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
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

          {/* Date */}
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>

          {/* Source */}
          <div>
            <Label>Fuente</Label>
            <Select value={source} onValueChange={(v) => { setSource(v); setSelectedAd(null); setShowAdPicker(false); }}>
              <SelectTrigger><SelectValue placeholder="¿De dónde vino?" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ad selector */}
          {source === 'ad' && hasAdAccount && (
            <div>
              <Label>Anuncio</Label>
              {selectedAd ? (
                <div className="flex items-center gap-2 rounded-lg border p-2 mt-1">
                  {selectedAd.thumbnailUrl ? (
                    <img src={selectedAd.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{selectedAd.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedAd.campaignName}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedAd(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="w-full mt-1 justify-start" onClick={() => setShowAdPicker(!showAdPicker)}>
                    <Link2 className="h-3 w-3 mr-2" />
                    Seleccionar anuncio
                  </Button>
                  {showAdPicker && (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1 rounded-md border p-1">
                      {adsLoading ? (
                        <div className="space-y-1">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                      ) : !allAds || allAds.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No hay anuncios activos</p>
                      ) : (
                        allAds.map(ad => (
                          <button
                            key={ad.id}
                            className="w-full flex items-center gap-2 rounded-md p-2 hover:bg-accent/50 transition-colors text-left"
                            onClick={() => { setSelectedAd(ad); setShowAdPicker(false); }}
                          >
                            {ad.thumbnailUrl ? (
                              <img src={ad.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{ad.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{ad.campaignName}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Status (only in edit mode) */}
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

          {/* Message Platform */}
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

          {/* Product */}
          <div>
            <Label>Producto / Servicio</Label>
            <Input placeholder="Opcional" value={product} onChange={(e) => setProduct(e.target.value)} />
          </div>

          {/* Customer */}
          <div>
            <Label>Cliente</Label>
            <Input placeholder="Opcional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};