import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCommissionPayout } from '@/hooks/use-seller-commissions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerName: string;
  periodStart: string;
  periodEnd: string;
  totalCommission: number;
  currency: string;
}

export const PayCommissionDialog = ({
  open,
  onOpenChange,
  sellerName,
  periodStart,
  periodEnd,
  totalCommission,
  currency,
}: Props) => {
  const create = useCreateCommissionPayout();
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(totalCommission);

  const handleSubmit = async () => {
    await create.mutateAsync({
      seller_name: sellerName,
      period_start: periodStart,
      period_end: periodEnd,
      total_commission: amount,
      currency,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago de comisión a {sellerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-0.5">
            <div>Período: <span className="text-foreground">{periodStart} → {periodEnd}</span></div>
            <div>Devengado en el período: <span className="text-foreground font-semibold">{currency} {totalCommission.toLocaleString()}</span></div>
          </div>
          <div className="space-y-2">
            <Label>Monto pagado *</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referencia de transferencia, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || amount <= 0}>
            {create.isPending ? 'Guardando...' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
