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
import { Phone, DollarSign, ArrowLeft, MessageCircle, Megaphone, FileText, User } from 'lucide-react';
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

const prettyLabel = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const InstantFormLeadDetailDialog = ({ lead, open, onOpenChange, clientId }: Props) => {
  const [mode, setMode] = useState<'info' | 'sale'>('info');
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
      setMode('info');
      // Pre-fill cantidad y bordado desde respuestas del form si están
      const ca = (lead?.custom_answers || {}) as Record<string, any>;
      const cantStr = String(ca.cantidad_de_camisas ?? '');
      const cantMatch = cantStr.match(/\d+/);
      setQuantity(cantMatch ? cantMatch[0] : '1');
      const bord = String(ca.bordado ?? '').toLowerCase();
      setEmbroidery(/^(si|sí|yes|true|1)/.test(bord));
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
  const alreadySold = lead.lead_status === 'venta';

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
            {mode === 'sale' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2" onClick={() => setMode('info')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {mode === 'sale' ? (
              <>
                <DollarSign className="h-5 w-5 text-primary" />
                Registrar venta
              </>
            ) : (
              <>
                <User className="h-5 w-5 text-primary" />
                {lead.full_name || 'Lead sin nombre'}
              </>
            )}
            {alreadySold && <Badge variant="default">Ya tiene venta</Badge>}
          </DialogTitle>
          <DialogDescription>{formatDate(lead.created_time || lead.created_at)}</DialogDescription>
        </DialogHeader>

        {mode === 'info' ? (
          <div className="space-y-4">
            {/* Contact */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacto</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lead.full_name || '—'}</span>
              </div>
              {lead.phone ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{lead.phone}</span>
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[hsl(var(--status-venta))] hover:underline"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin teléfono</p>
              )}
            </div>

            {/* Respuestas */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Respuestas del formulario
              </p>
              {answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin respuestas registradas.</p>
              ) : (
                <div className="divide-y">
                  {answers.map(([k, v]) => (
                    <div key={k} className="py-2 first:pt-0 last:pb-0">
                      <p className="text-xs text-muted-foreground">{prettyLabel(k)}</p>
                      <p className="text-sm font-medium break-words">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Atribución */}
            {(lead.campaign_name || lead.ad_name || lead.form_name) && (
              <div className="rounded-lg border p-3 space-y-1.5 text-xs">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" /> Atribución
                </p>
                {lead.campaign_name && (
                  <div><span className="text-muted-foreground">Campaña:</span> <span className="font-medium">{lead.campaign_name}</span></div>
                )}
                {lead.ad_name && (
                  <div><span className="text-muted-foreground">Anuncio:</span> <span className="font-medium">{lead.ad_name}</span></div>
                )}
                {lead.form_name && (
                  <div><span className="text-muted-foreground">Formulario:</span> <span className="font-medium">{lead.form_name}</span></div>
                )}
              </div>
            )}

            <Button
              onClick={() => setMode('sale')}
              size="lg"
              className="w-full"
              variant={alreadySold ? 'outline' : 'default'}
            >
              <DollarSign className="h-4 w-4 mr-1.5" />
              {alreadySold ? 'Registrar otra venta' : 'Registrar venta'}
            </Button>
          </div>
        ) : (
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

            <div className={`rounded-md border p-3 transition-colors ${needsShipping ? 'border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5' : ''}`}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={needsShipping} onCheckedChange={(v) => setNeedsShipping(!!v)} />
                <span className="font-medium">Necesita envío</span>
              </label>
              {needsShipping && (
                <div className="mt-2">
                  <Label className="text-xs">Monto de envío (CRC) *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={shippingStr}
                    onChange={(e) => setShippingStr(e.target.value)}
                  />
                </div>
              )}
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
              {needsShipping && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span className="tabular-nums">{formatCRC(shipping)}</span>
                </div>
              )}
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
        )}
      </DialogContent>
    </Dialog>
  );
};
