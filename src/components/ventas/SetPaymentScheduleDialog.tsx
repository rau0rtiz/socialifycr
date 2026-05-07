import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface PendingSale {
  id: string;
  client_id: string;
  customer_name: string | null;
  product: string | null;
  total_sale_amount: number | null;
  amount: number;
  currency: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: PendingSale | null;
}

interface Row {
  key: string;
  date: string;
  amount: string;
}

export const SetPaymentScheduleDialog = ({ open, onOpenChange, sale }: Props) => {
  const qc = useQueryClient();
  const balance = sale ? Math.max(Number(sale.total_sale_amount || 0) - Number(sale.amount || 0), 0) : 0;
  const symbol = sale?.currency === 'CRC' ? '₡' : '$';

  const [rows, setRows] = useState<Row[]>([
    { key: crypto.randomUUID(), date: '', amount: String(balance) },
  ]);
  const [saving, setSaving] = useState(false);

  const totalAssigned = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [rows]
  );
  const remaining = balance - totalAssigned;
  const canSave = Math.abs(remaining) < 0.01 && rows.every(r => r.date && parseFloat(r.amount) > 0);

  const update = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const addRow = () =>
    setRows(prev => [...prev, { key: crypto.randomUUID(), date: '', amount: String(Math.max(remaining, 0)) }]);

  const removeRow = (key: string) =>
    setRows(prev => prev.filter(r => r.key !== key));

  const handleSave = async () => {
    if (!sale || !canSave) return;
    setSaving(true);
    try {
      const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
      const records = sorted.map((r, idx) => ({
        sale_id: sale.id,
        client_id: sale.client_id,
        installment_number: idx + 2, // 1 = adelanto pagado
        amount: parseFloat(r.amount),
        currency: sale.currency,
        due_date: r.date,
        status: 'pending' as const,
        payment_frequency: 'custom',
      }));
      const { error: insErr } = await supabase.from('payment_collections').insert(records as any);
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from('message_sales')
        .update({
          num_installments: records.length + 1,
          installments_paid: 1,
          installment_amount: records[0]?.amount || 0,
          payment_schedule_pending: false,
        } as any)
        .eq('id', sale.id);
      if (updErr) throw updErr;

      toast.success('Cobros programados');
      qc.invalidateQueries({ queryKey: ['payment-collections', sale.client_id] });
      qc.invalidateQueries({ queryKey: ['message-sales', sale.client_id] });
      qc.invalidateQueries({ queryKey: ['pending-schedules', sale.client_id] });
      onOpenChange(false);
      setRows([{ key: crypto.randomUUID(), date: '', amount: String(balance) }]);
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'no se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Establecer fechas de pago</DialogTitle>
        </DialogHeader>

        {sale && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs">
              <div className="font-medium text-sm">{sale.customer_name || 'Sin nombre'}</div>
              {sale.product && <div className="text-muted-foreground">{sale.product}</div>}
              <div className="flex justify-between pt-1 border-t mt-1">
                <span className="text-muted-foreground">Saldo pendiente</span>
                <span className="font-semibold">{symbol}{balance.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((r, idx) => (
                <div key={r.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-5">{idx + 1}.</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('flex-1 justify-start font-normal h-9 text-xs', !r.date && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {r.date ? format(new Date(r.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={r.date ? new Date(r.date + 'T12:00:00') : undefined}
                        onSelect={(d) => update(r.key, { date: d ? d.toISOString().split('T')[0] : '' })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
                    <Input
                      type="number"
                      value={r.amount}
                      onChange={(e) => update(r.key, { amount: e.target.value })}
                      className="h-9 text-xs pl-5"
                      placeholder="0"
                    />
                  </div>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(r.key)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addRow} className="w-full text-xs h-9">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar otra fecha de pago
              </Button>
            </div>

            <div className={cn(
              'flex items-center justify-between rounded-lg p-2.5 text-xs font-medium',
              Math.abs(remaining) < 0.01
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            )}>
              <span className="flex items-center gap-1.5">
                {Math.abs(remaining) < 0.01
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />}
                Restante por asignar
              </span>
              <span>{symbol}{remaining.toLocaleString()}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Guardando...' : 'Guardar cobros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
