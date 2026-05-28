import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  computeServiceMonth,
  DEFAULT_INITIAL_MONTHS,
  DEFAULT_RATE_INITIAL,
  DEFAULT_RATE_PERPETUAL,
  SellerCollection,
  SellerContract,
  useMarkCollectionPaid,
} from '@/hooks/use-seller-commissions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection: SellerCollection | null;
  contract?: SellerContract | null;
}

export const MarkPaidDialog = ({ open, onOpenChange, collection, contract }: Props) => {
  const mark = useMarkCollectionPaid();
  const today = new Date().toISOString().slice(0, 10);
  const [paidAt, setPaidAt] = useState(today);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
    if (open && collection) {
      setPaidAt(collection.paid_at?.slice(0, 10) || today);
      setPaidAmount(Number(collection.paid_amount ?? collection.amount ?? 0));
    }
  }, [open, collection]);

  if (!collection) return null;

  // Preview comisión
  let previewRate = 0;
  let previewMonth = 0;
  if (contract) {
    previewMonth = computeServiceMonth(contract.start_date, new Date(paidAt));
    const window = contract.commission_initial_months ?? DEFAULT_INITIAL_MONTHS;
    previewRate = previewMonth <= window
      ? (contract.commission_rate_initial ?? DEFAULT_RATE_INITIAL)
      : (contract.commission_rate_perpetual ?? DEFAULT_RATE_PERPETUAL);
  }
  const previewCommission = Math.round(paidAmount * previewRate) / 100;

  const handleSubmit = async () => {
    await mark.mutateAsync({ id: collection.id, paid_at: paidAt, paid_amount: paidAmount });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar cobro como pagado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
            <div className="font-medium">{collection.customer_name}</div>
            <div className="text-xs text-muted-foreground">
              Vence: {collection.due_date} · Esperado: {collection.currency} {Number(collection.amount).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha de cobro *</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Monto cobrado *</Label>
              <Input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          {contract && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
              <div className="font-medium text-primary">Comisión calculada</div>
              <div>
                Mes de servicio: <span className="text-foreground">{previewMonth}</span> ·
                {' '}Tasa: <span className="text-foreground">{previewRate}%</span>
              </div>
              <div>
                Comisión:{' '}
                <span className="text-foreground font-semibold">
                  {collection.currency} {previewCommission.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mark.isPending || paidAmount <= 0}>
            {mark.isPending ? 'Guardando...' : 'Confirmar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
