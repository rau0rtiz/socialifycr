import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isInRange } from '@/lib/comfortex-leads';
import { DollarSign, TrendingUp, Users, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstantFormSales,
  useInstantFormLeads,
  useUpdateInstantFormSale,
  useDeleteInstantFormSale,
  parseFormSaleNotes,
  InstantFormSale,
} from '@/hooks/use-instant-form-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const IVA_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '4', label: '4%' },
  { value: '13', label: '13%' },
];

const formatCRC = (n: number) =>
  '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);

const formatMoney = (amount: number, currency: string) => {
  const symbol = currency === 'USD' ? '$' : '₡';
  return symbol + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-CR', {
      timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short',
    });
  } catch { return '—'; }
};

export const InstantFormSalesWidget = ({ clientId }: Props) => {
  const { data: sales = [], isLoading } = useInstantFormSales(clientId);
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const updateSale = useUpdateInstantFormSale(clientId);
  const deleteSale = useDeleteInstantFormSale(clientId);

  const [rangeDays, setRangeDays] = useState('month');
  const [editing, setEditing] = useState<InstantFormSale | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [embroidery, setEmbroidery] = useState(false);
  const [subtotalStr, setSubtotalStr] = useState('');
  const [ivaPct, setIvaPct] = useState('13');
  const [needsShipping, setNeedsShipping] = useState(false);
  const [shippingStr, setShippingStr] = useState('');

  useEffect(() => {
    if (editing) {
      const meta = parseFormSaleNotes(editing.notes);
      setQuantity(String(meta.quantity ?? 1));
      setEmbroidery(!!meta.embroidery);
      const sub = editing.subtotal ?? (Number(editing.amount) / (1 + (meta.tax_rate ?? 0.13)));
      setSubtotalStr(String(Math.round(sub)));
      setIvaPct(String(Math.round((meta.tax_rate ?? 0.13) * 100)));
      const ship = Number(meta.shipping || 0);
      setNeedsShipping(ship > 0);
      setShippingStr(ship > 0 ? String(Math.round(ship)) : '');
    }
  }, [editing]);

  const filteredSales = useMemo(
    () => sales.filter((s) => isInRange(s.sale_date, rangeDays)),
    [sales, rangeDays],
  );

  const filteredLeads = useMemo(
    () => leads.filter((l) => isInRange(l.created_time || l.created_at, rangeDays)),
    [leads, rangeDays],
  );

  const totals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    filteredSales.forEach((s) => {
      byCurrency[s.currency] = (byCurrency[s.currency] || 0) + Number(s.amount || 0);
    });
    return byCurrency;
  }, [filteredSales]);

  const conversionRate = filteredLeads.length > 0
    ? Math.round((filteredSales.length / filteredLeads.length) * 1000) / 10
    : 0;

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

  const handleSave = async () => {
    if (!editing) return;
    if (!subtotal) { toast.error('Subtotal inválido'); return; }
    if (needsShipping && shipping <= 0) { toast.error('Ingresá el monto de envío'); return; }
    try {
      await updateSale.mutateAsync({
        saleId: editing.id,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        embroidery,
        subtotal,
        tax_rate: taxRate,
        shipping,
      });
      toast.success('Venta actualizada');
      setEditing(null);
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await deleteSale.mutateAsync({ saleId: editing.id, leadId: editing.lead_id });
      toast.success('Venta eliminada');
      setEditing(null);
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Ventas desde Instant Form
            <Badge variant="secondary">{filteredSales.length}</Badge>
          </CardTitle>
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success))] font-medium">
                <DollarSign className="h-3.5 w-3.5" /> Total ventas
              </div>
              <div className="mt-1 space-y-0.5">
                {Object.keys(totals).length === 0 ? (
                  <div className="text-lg font-semibold">—</div>
                ) : (
                  Object.entries(totals).map(([cur, amt]) => (
                    <div key={cur} className="text-lg font-bold tabular-nums text-[hsl(var(--success))]">{formatMoney(amt, cur)}</div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--info))] font-medium">
                <Users className="h-3.5 w-3.5" /> Cantidad
              </div>
              <div className="text-lg font-bold mt-1 text-[hsl(var(--info))]">{filteredSales.length}</div>
            </div>
            <div className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--warning))] font-medium">
                <TrendingUp className="h-3.5 w-3.5" /> Conversión
              </div>
              <div className="text-lg font-bold mt-1 text-[hsl(var(--warning))]">{conversionRate}%</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Ventas recientes</div>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : filteredSales.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Aún no hay ventas registradas desde formularios.</div>
            ) : (
              <div className="rounded-md border divide-y max-h-[320px] overflow-y-auto">
                {filteredSales.slice(0, 50).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.customer_name || 'Cliente'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatDate(s.sale_date)}</span>
                        {s.product && <span className="truncate">· {s.product}</span>}
                      </div>
                    </div>
                    <div className="font-semibold text-sm tabular-nums">{formatMoney(Number(s.amount), s.currency)}</div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar venta — {editing?.customer_name || 'Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={embroidery} onCheckedChange={(v) => setEmbroidery(!!v)} />
                  Bordado
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subtotal (CRC)</Label>
                <Input type="text" inputMode="decimal" value={subtotalStr} onChange={(e) => setSubtotalStr(e.target.value)} />
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
                  <Label className="text-xs">Monto de envío (CRC)</Label>
                  <Input type="text" inputMode="decimal" value={shippingStr} onChange={(e) => setShippingStr(e.target.value)} />
                </div>
              )}
            </div>
            <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/20">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCRC(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>IVA ({ivaPct}%)</span><span className="tabular-nums">{formatCRC(taxAmount)}</span></div>
              {needsShipping && (
                <div className="flex justify-between text-muted-foreground"><span>Envío</span><span className="tabular-nums">{formatCRC(shipping)}</span></div>
              )}
              <div className="flex justify-between font-semibold pt-1 border-t"><span>Total</span><span className="tabular-nums">{formatCRC(total)}</span></div>
            </div>

          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleteSale.isPending} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
            <Button onClick={handleSave} disabled={updateSale.isPending || !subtotal}>
              {updateSale.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
