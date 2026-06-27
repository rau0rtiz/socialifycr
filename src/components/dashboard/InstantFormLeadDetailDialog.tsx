import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, CheckCircle2, DollarSign, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstantFormLead,
  useUpdateInstantFormLeadStatus,
  useRegisterSaleFromInstantFormLead,
} from '@/hooks/use-instant-form-leads';

interface Props {
  lead: InstantFormLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export const InstantFormLeadDetailDialog = ({ lead, open, onOpenChange, clientId }: Props) => {
  const [saleMode, setSaleMode] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [product, setProduct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const updateStatus = useUpdateInstantFormLeadStatus(clientId);
  const registerSale = useRegisterSaleFromInstantFormLead(clientId);

  const resetSale = () => {
    setSaleMode(false);
    setAmount('');
    setProduct('');
    setPaymentMethod('');
    setNotes('');
  };

  const handleClose = (next: boolean) => {
    if (!next) resetSale();
    onOpenChange(next);
  };

  const handleStatus = async (status: 'contactado' | 'seguimiento') => {
    if (!lead) return;
    try {
      await updateStatus.mutateAsync({ leadId: lead.id, status });
      toast.success(status === 'contactado' ? 'Marcado como contactado' : 'Marcado como seguimiento');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  const handleRegisterSale = async () => {
    if (!lead) return;
    const n = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!n || n <= 0) {
      toast.error('Monto inválido');
      return;
    }
    try {
      await registerSale.mutateAsync({
        lead,
        amount: n,
        currency,
        product: product || undefined,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
      });
      toast.success('Venta registrada y asociada al cliente');
      resetSale();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error al registrar venta', { description: e.message });
    }
  };

  if (!lead) return null;

  const answers = Object.entries(lead.custom_answers || {}).filter(([, v]) => v !== '' && v != null);
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {lead.full_name || 'Lead sin nombre'}
            {lead.lead_status && (
              <Badge variant="secondary" className="capitalize">
                {lead.lead_status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{formatDate(lead.created_time || lead.created_at)}</DialogDescription>
        </DialogHeader>

        {!saleMode ? (
          <>
            {/* Contact info */}
            <div className="space-y-3 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {(lead.campaign_name || lead.ad_name) && (
                <div className="rounded-md bg-muted/40 p-3 space-y-1 text-xs">
                  {lead.campaign_name && (
                    <div><span className="text-muted-foreground">Campaña:</span> {lead.campaign_name}</div>
                  )}
                  {lead.adset_name && (
                    <div><span className="text-muted-foreground">Conjunto:</span> {lead.adset_name}</div>
                  )}
                  {lead.ad_name && (
                    <div><span className="text-muted-foreground">Anuncio:</span> {lead.ad_name}</div>
                  )}
                  {lead.form_name && (
                    <div><span className="text-muted-foreground">Formulario:</span> {lead.form_name}</div>
                  )}
                </div>
              )}

              {answers.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Respuestas del formulario</div>
                  <div className="space-y-1.5">
                    {answers.map(([k, v]) => (
                      <div key={k} className="text-xs flex gap-2">
                        <span className="text-muted-foreground capitalize min-w-[120px]">
                          {k.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleStatus('contactado')}
                disabled={updateStatus.isPending}
                className="flex-col h-auto py-3"
              >
                <MessageSquare className="h-4 w-4 mb-1" />
                <span className="text-xs">CONTACTADO</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatus('seguimiento')}
                disabled={updateStatus.isPending}
                className="flex-col h-auto py-3"
              >
                <CheckCircle2 className="h-4 w-4 mb-1" />
                <span className="text-xs">SEGUIMIENTO</span>
              </Button>
              <Button
                onClick={() => setSaleMode(true)}
                className="flex-col h-auto py-3"
              >
                <DollarSign className="h-4 w-4 mb-1" />
                <span className="text-xs">VENTA</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setSaleMode(false)} className="w-fit -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Monto *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">CRC ₡</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Producto</Label>
                <Input
                  placeholder="Camisa Tipo Polo, etc."
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="SINPE">SINPE</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea
                  placeholder="Opcional..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleRegisterSale}
                disabled={registerSale.isPending}
                className="w-full"
              >
                {registerSale.isPending ? 'Guardando...' : 'Registrar venta'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
