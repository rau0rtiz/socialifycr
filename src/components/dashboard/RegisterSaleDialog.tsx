import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SaleInput } from '@/hooks/use-sales-tracking';
import { CampaignInsights } from '@/hooks/use-ads-data';
import { toast } from 'sonner';

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sale: SaleInput) => void;
  campaigns?: CampaignInsights[];
  isSubmitting?: boolean;
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
  campaigns = [],
  isSubmitting,
}: RegisterSaleDialogProps) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<string>('');
  const [adCampaignId, setAdCampaignId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [messagePlatform, setMessagePlatform] = useState('');
  const [notes, setNotes] = useState('');
  

  const selectedCampaign = campaigns.find(c => c.id === adCampaignId);

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
      status,
    };

    if (source === 'ad' && selectedCampaign) {
      sale.ad_campaign_id = selectedCampaign.id;
      sale.ad_campaign_name = selectedCampaign.name;
    }

    onSubmit(sale);
    // Reset form
    setAmount('');
    setSource('');
    setAdCampaignId('');
    setCustomerName('');
    setProduct('');
    setMessagePlatform('');
    setNotes('');
    setStatus('completed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount & Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Monto</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
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
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="¿De dónde vino?" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign selector - only when source is ad */}
          {source === 'ad' && campaigns.length > 0 && (
            <div>
              <Label>Campaña</Label>
              <Select value={adCampaignId} onValueChange={setAdCampaignId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
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

          {/* Status */}
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'completed' | 'pending')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
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
            {isSubmitting ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
