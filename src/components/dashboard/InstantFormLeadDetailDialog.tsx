import { useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  InstantFormLead,
  useRegisterSaleFromInstantFormLead,
} from '@/hooks/use-instant-form-leads';

interface Props {
  lead: InstantFormLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const IVA_OPTIONS = [
  { value: '0', label: '0% (exento)' },
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '4', label: '4%' },
  { value: '13', label: '13% (general)' },
];

const formatCRC = (n: number) =>
  '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);

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
  const [quantity, setQuantity] = useState('1');
  const [embroidery, setEmbroidery] = useState(false);
  const [subtotalStr, setSubtotalStr] = useState('');
  const [ivaPct, setIvaPct] = useState('13');
  const [needsShipping, setNeedsShipping] = useState(false);
  const [shippingStr, setShippingStr] = useState('');
  const [notes, setNotes] = useState('');

  const registerSale = useRegisterSaleFromInstantFormLead(clientId);

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setEmbroidery(false);
      setSubtotalStr('');
      setIvaPct('13');
      setNeedsShipping(false);
      setShippingStr('');
      setNotes('');
    }
  }, [open, lead?.id]);

  const subtotal = useMemo(() => {
    const n = parseFloat(subtotalStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }, [subtotalStr]);

  const shipping = useMemo(() => {
    if (!needsShipping) return 0;
    const n = parseFloat(shippingStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }, [needsShipping, shippingStr]);

  const taxRate = parseInt(ivaPct, 10) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount + shipping) * 100) / 100;

  if (!lead) return null;

  const answers = Object.entries(lead.custom_answers || {}).filter(([, v]) => v !== '' && v != null);
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');

  const handleRegisterSale = async () => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (!subtotal) {
      toast.error('Ingresá un subtotal válido');
      return;
    }
    if (needsShipping && shipping <= 0) {
      toast.error('Ingresá el monto de envío');
      return;
    }
    try {
      await registerSale.mutateAsync({
        lead,
        quantity: qty,
        embroidery,
        subtotal,
        tax_rate: taxRate,
        shipping,
        notes: notes || undefined,
      });
      toast.success('Venta registrada', { description: formatCRC(total) });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error al registrar venta', { description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar venta — {lead.full_name || 'Lead'}
            {lead.lead_status === 'venta' && (
              <Badge variant="default">Ya tiene venta</Badge>
            )}
          </DialogTitle>
          <DialogDescription>{formatDate(lead.created_time || lead.created_at)}</DialogDescription>
        </DialogHeader>

        {/* Lead info */}
        <div className="space-y-2 text-sm rounded-md bg-muted/30 p-3">
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="hover:underline">
                {lead.phone}
              </a>
            </div>
          )}
          {(lead.campaign_name || lead.ad_name) && (
            <div className="text-xs space-y-0.5">
              {lead.campaign_name && <div><span className="text-muted-foreground">Campaña:</span> {lead.campaign_name}</div>}
              {lead.ad_name && <div><span className="text-muted-foreground">Anuncio:</span> {lead.ad_name}</div>}
              {lead.form_name && <div><span className="text-muted-foreground">Formulario:</span> {lead.form_name}</div>}
            </div>
          )}
          {answers.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Respuestas del formulario ({answers.length})</summary>
              <div className="mt-2 space-y-1">
                {answers.map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground capitalize min-w-[120px]">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Sale form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cantidad de camisas *</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={embroidery} onCheckedChange={(v) => setEmbroidery(!!v)} />
                Lleva bordado
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Subtotal (CRC) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={subtotalStr}
                onChange={(e) => setSubtotalStr(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">IVA</Label>
              <Select value={ivaPct} onValueChange={setIvaPct}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IVA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/20">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCRC(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({ivaPct}%)</span>
              <span className="tabular-nums">{formatCRC(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Total</span>
              <span className="tabular-nums">{formatCRC(total)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              placeholder="Detalles, talla, color, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            onClick={handleRegisterSale}
            disabled={registerSale.isPending || !subtotal}
            className="w-full"
            size="lg"
          >
            {registerSale.isPending ? 'Guardando...' : `Registrar venta — ${formatCRC(total)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
