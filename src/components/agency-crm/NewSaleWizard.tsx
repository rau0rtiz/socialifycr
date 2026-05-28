import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_INITIAL_MONTHS,
  DEFAULT_RATE_INITIAL,
  DEFAULT_RATE_PERPETUAL,
  DEFAULT_SELLER,
  LEAD_SOURCES,
  useCreateSale,
} from '@/hooks/use-seller-commissions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults?: {
    customer_name?: string;
    crm_lead_id?: string;
    monthly_amount?: number;
    currency?: 'USD' | 'CRC';
    notes?: string;
  };
}

const COMMON_DAYS = [1, 5, 10, 15, 20, 25, 28, 30];

export const NewSaleWizard = ({ open, onOpenChange, defaults }: Props) => {
  const createSale = useCreateSale();
  const [step, setStep] = useState(1);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    customer_name: '',
    seller_name: DEFAULT_SELLER,
    start_date: today,
    monthly_amount: 0,
    currency: 'USD' as 'USD' | 'CRC',
    notes: '',
    crm_lead_id: null as string | null,
    lead_source: '' as string,
    lead_source_detail: '',
    services: [] as string[],
    // schedule
    payments_per_month: 1,
    payment_days: [1] as number[],
    months_to_generate: 12,
    // commission
    commission_rate_initial: DEFAULT_RATE_INITIAL,
    commission_rate_perpetual: DEFAULT_RATE_PERPETUAL,
    commission_initial_months: DEFAULT_INITIAL_MONTHS,
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm((f) => ({
        ...f,
        customer_name: defaults?.customer_name || '',
        crm_lead_id: defaults?.crm_lead_id || null,
        monthly_amount: defaults?.monthly_amount || 0,
        currency: defaults?.currency || 'USD',
        notes: defaults?.notes || '',
      }));
    }
  }, [open, defaults]);

  const amountPerPayment = useMemo(() => {
    if (!form.monthly_amount || !form.payments_per_month) return 0;
    return Math.round((form.monthly_amount / form.payments_per_month) * 100) / 100;
  }, [form.monthly_amount, form.payments_per_month]);

  const toggleDay = (day: number) => {
    setForm((f) => {
      const exists = f.payment_days.includes(day);
      const next = exists ? f.payment_days.filter((d) => d !== day) : [...f.payment_days, day].sort((a, b) => a - b);
      return { ...f, payment_days: next, payments_per_month: Math.max(1, next.length) };
    });
  };

  const canNext = useMemo(() => {
    if (step === 1) return form.customer_name.trim().length > 0 && form.monthly_amount > 0 && form.start_date;
    if (step === 2) return form.payment_days.length > 0 && amountPerPayment > 0;
    return true;
  }, [step, form, amountPerPayment]);

  const handleSubmit = async () => {
    await createSale.mutateAsync({
      customer_name: form.customer_name,
      seller_name: form.seller_name,
      start_date: form.start_date,
      monthly_amount: form.monthly_amount,
      currency: form.currency,
      services: form.services,
      notes: form.notes,
      crm_lead_id: form.crm_lead_id,
      lead_source: form.lead_source || null,
      lead_source_detail: form.lead_source_detail.trim() || null,
      commission_rate_initial: form.commission_rate_initial,
      commission_initial_months: form.commission_initial_months,
      payments_per_month: form.payment_days.length,
      payment_days: form.payment_days,
      amount_per_payment: amountPerPayment,
      months_to_generate: form.months_to_generate,
    });
    onOpenChange(false);
  };

  const previewCuotas = useMemo(() => {
    if (!form.start_date || form.payment_days.length === 0) return [];
    const [sy, sm, sd] = form.start_date.split('-').map(Number);
    const startMonth = new Date(sy, sm - 1, 1);
    const rows: string[] = [];
    for (let i = 0; i < Math.min(3, form.months_to_generate); i++) {
      const month = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (const day of [...form.payment_days].sort((a, b) => a - b)) {
        const dayC = Math.min(day, lastDay);
        const d = new Date(month.getFullYear(), month.getMonth(), dayC);
        if (d < new Date(sy, sm - 1, sd)) continue;
        rows.push(
          d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }),
        );
      }
    }
    return rows;
  }, [form.start_date, form.payment_days, form.months_to_generate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Nueva venta · {form.seller_name}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'flex-1 h-1.5 rounded-full transition',
                step >= s ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Paso {step} de 3 · {step === 1 ? 'Cliente y paquete' : step === 2 ? 'Cronograma de pagos' : 'Comisión'}
        </p>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Nombre del cliente o empresa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Inicio del servicio *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendedora</Label>
                <Input
                  value={form.seller_name}
                  onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Monto mensual del paquete *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.monthly_amount || ''}
                  onChange={(e) => setForm({ ...form, monthly_amount: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Servicios incluidos, acuerdos, etc."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Define en qué días del mes se cobra. Las cuotas se generan automáticamente para los próximos meses.
            </div>
            <div className="space-y-2">
              <Label>Días de cobro al mes</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs border transition',
                      form.payment_days.includes(d)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 border-border hover:bg-muted',
                    )}
                  >
                    Día {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Seleccionados: {form.payment_days.length > 0 ? form.payment_days.join(', ') : 'ninguno'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto por cuota</Label>
                <Input
                  type="number"
                  value={amountPerPayment || ''}
                  readOnly
                  className="bg-muted/30"
                />
                <p className="text-[11px] text-muted-foreground">
                  {form.currency} {form.monthly_amount} ÷ {form.payment_days.length || 1} cuota(s)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Meses a generar</Label>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={form.months_to_generate}
                  onChange={(e) => setForm({ ...form, months_to_generate: Number(e.target.value) || 1 })}
                />
              </div>
            </div>

            {previewCuotas.length > 0 && (
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-xs font-medium mb-2">Primeras cuotas que se generan:</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewCuotas.slice(0, 9).map((c, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">{c}</Badge>
                  ))}
                  {previewCuotas.length > 9 && (
                    <Badge variant="outline" className="text-[11px]">+más</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Regla de comisión de {form.seller_name}
              </div>
              <p className="text-xs text-muted-foreground">
                Editable solo si este cliente tiene una regla especial.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>% inicial</Label>
                <Input
                  type="number"
                  value={form.commission_rate_initial}
                  onChange={(e) => setForm({ ...form, commission_rate_initial: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Meses iniciales</Label>
                <Input
                  type="number"
                  value={form.commission_initial_months}
                  onChange={(e) => setForm({ ...form, commission_initial_months: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>% perpetuo</Label>
                <Input
                  type="number"
                  value={form.commission_rate_perpetual}
                  onChange={(e) => setForm({ ...form, commission_rate_perpetual: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <div className="font-medium text-foreground">Resumen</div>
              <div>Cliente: <span className="text-foreground">{form.customer_name}</span></div>
              <div>Paquete: <span className="text-foreground">{form.currency} {form.monthly_amount}/mes</span></div>
              <div>Cobros: <span className="text-foreground">{form.payment_days.length}× al mes ({form.payment_days.join(', ')})</span></div>
              <div>
                Comisión: <span className="text-foreground">{form.commission_rate_initial}% los primeros {form.commission_initial_months} meses</span>, luego{' '}
                <span className="text-foreground">{form.commission_rate_perpetual}% perpetuo</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
            disabled={createSale.isPending}
          >
            {step === 1 ? 'Cancelar' : (<><ArrowLeft className="h-4 w-4 mr-1" /> Atrás</>)}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Siguiente <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createSale.isPending}>
              {createSale.isPending ? 'Guardando...' : 'Crear venta'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
