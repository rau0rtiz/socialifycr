import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, PackagePlus } from 'lucide-react';
import { useProductVariants } from '@/hooks/use-product-variants';
import { toast } from 'sonner';

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  productId: string;
  productName: string;
}

export const ReceiveStockDialog = ({ open, onOpenChange, clientId, productId, productName }: ReceiveStockDialogProps) => {
  const { variants, receiveStock } = useProductVariants(clientId, productId);
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  const total = useMemo(
    () => Object.values(qtyMap).reduce((s, v) => s + (Number(v) || 0), 0),
    [qtyMap]
  );

  const handleSubmit = async () => {
    const entries = variants
      .map(v => ({ variant_id: v.id, product_id: v.product_id, quantity: Number(qtyMap[v.id] || 0) }))
      .filter(e => e.quantity > 0)
      .map(e => ({ ...e, reason }));
    if (entries.length === 0) {
      toast.error('Ingresa cantidad en al menos una variante');
      return;
    }
    try {
      await receiveStock.mutateAsync(entries);
      toast.success(`${total} unidades agregadas`);
      setQtyMap({});
      setReason('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al recibir mercadería');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" /> Recibir mercadería — {productName}
          </DialogTitle>
        </DialogHeader>

        {variants.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Crea variantes primero.</div>
        ) : (
          <div className="space-y-2 py-2">
            {variants.map(v => (
              <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                {v.photo_url ? (
                  <img src={v.photo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted" />
                )}
                <div className="flex flex-wrap gap-1 flex-1">
                  {v.size && <Badge variant="outline">{v.size}</Badge>}
                  {v.color && <Badge variant="outline">{v.color}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">Stock actual: <strong>{v.stock_quantity}</strong></div>
                <Input
                  type="number"
                  placeholder="+ cantidad"
                  className="h-9 w-28"
                  value={qtyMap[v.id] || ''}
                  onChange={(e) => setQtyMap({ ...qtyMap, [v.id]: e.target.value })}
                />
              </div>
            ))}
            <Input
              placeholder="Nota (proveedor, factura, etc.) — opcional"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        )}

        <DialogFooter>
          <div className="flex-1 text-sm text-muted-foreground">Total a ingresar: <strong className="text-foreground">{total}</strong></div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={receiveStock.isPending || total === 0}>
            {receiveStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
