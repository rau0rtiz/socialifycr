import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CloserCommission, useCommissions } from '@/hooks/use-commissions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';

interface RecordPayoutDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  closerName: string;
  closerUserId: string | null;
  closerManualId: string | null;
  pendingCommissions: CloserCommission[];
  currency: string;
}

export const RecordPayoutDialog = ({
  open,
  onOpenChange,
  clientId,
  closerName,
  closerUserId,
  closerManualId,
  pendingCommissions,
  currency,
}: RecordPayoutDialogProps) => {
  const { recordPayout } = useCommissions(clientId);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('transfer');
  const [paidAt, setPaidAt] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState<string>('');

  const totalPending = useMemo(
    () => pendingCommissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0),
    [pendingCommissions]
  );

  const totalSelected = useMemo(() => {
    return pendingCommissions
      .filter(c => selected[c.id])
      .reduce((s, c) => s + (allocations[c.id] ?? c.pending_to_pay ?? 0), 0);
  }, [selected, allocations, pendingCommissions]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    pendingCommissions.forEach(c => { next[c.id] = checked; });
    setSelected(next);
  };

  const handleSubmit = async () => {
    const allocs = pendingCommissions
      .filter(c => selected[c.id])
      .map(c => ({
        commissionId: c.id,
        amount: Number(allocations[c.id] ?? c.pending_to_pay ?? 0),
      }))
      .filter(a => a.amount > 0);

    if (allocs.length === 0) {
      toast.error('Selecciona al menos una comisión y monto válido');
      return;
    }

    const total = allocs.reduce((s, a) => s + a.amount, 0);

    try {
      await recordPayout.mutateAsync({
        closerName,
        closerUserId,
        closerManualId,
        amount: total,
        currency,
        paymentMethod,
        paidAt,
        notes: notes || null,
        commissionAllocations: allocs,
      });
      toast.success(`Pago de $${total.toFixed(2)} registrado para ${closerName}`);
      onOpenChange(false);
      setSelected({});
      setAllocations({});
      setNotes('');
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar pago de comisiones — {closerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total pendiente por pagar:</span>
              <span className="text-2xl font-bold">${totalPending.toFixed(2)}</span>
            </div>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Comisiones a cubrir</Label>
              <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                Seleccionar todas
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-md p-2">
              {pendingCommissions.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={!!selected[c.id]}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, [c.id]: !!v }))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {c.customer_name || 'Sin nombre'} {c.product && <span className="text-muted-foreground">— {c.product}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>Venta: ${Number(c.sale_total).toFixed(2)}</span>
                      <span>•</span>
                      <span>Cobrado: {((c.cash_collected_pct || 0) * 100).toFixed(0)}%</span>
                      <span>•</span>
                      <span>Devengado: ${(c.earned_to_date || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    placeholder={(c.pending_to_pay || 0).toFixed(2)}
                    value={allocations[c.id] ?? ''}
                    onChange={(e) => setAllocations(a => ({ ...a, [c.id]: parseFloat(e.target.value) || 0 }))}
                    disabled={!selected[c.id]}
                  />
                </div>
              ))}
              {pendingCommissions.length === 0 && (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  Sin comisiones pendientes
                </div>
              )}
            </div>
            <div className="text-right text-sm mt-2">
              <span className="text-muted-foreground">Total seleccionado: </span>
              <span className="font-bold">${totalSelected.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referencia, comprobante, etc." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={totalSelected <= 0}>
            Registrar pago de ${totalSelected.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
