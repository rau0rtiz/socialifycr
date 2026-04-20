import { useProductPriceHistory } from '@/hooks/use-product-price-history';
import { History, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (amount: number | null | undefined, currency: string) => {
  if (amount == null) return '—';
  if (currency === 'CRC') return `₡${Number(amount).toLocaleString('es-CR')}`;
  return `$${Number(amount).toLocaleString('en-US')}`;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface Props {
  productId: string;
}

export const ProductPriceHistory = ({ productId }: Props) => {
  const { data: history = [], isLoading } = useProductPriceHistory(productId);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Cargando historial...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
        <History className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          El historial se registra automáticamente cuando edites el precio o costo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
      {history.map(h => {
        const priceChanged = h.old_price !== h.new_price;
        const costChanged = h.old_cost !== h.new_cost;
        const pricePct = priceChanged && h.old_price && h.old_price > 0 && h.new_price != null
          ? Math.round(((h.new_price - h.old_price) / h.old_price) * 100)
          : null;
        const up = pricePct != null && pricePct > 0;
        const down = pricePct != null && pricePct < 0;

        return (
          <div key={h.id} className="rounded-md bg-muted/30 border border-border/30 p-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] text-muted-foreground">{fmtDate(h.changed_at)}</span>
              {h.changed_by_name && (
                <span className="text-[10px] text-muted-foreground truncate">por {h.changed_by_name}</span>
              )}
            </div>
            {priceChanged && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground w-12">Precio:</span>
                <span className="text-muted-foreground line-through text-[11px]">{fmt(h.old_price, h.currency)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="font-semibold text-[11px]">{fmt(h.new_price, h.currency)}</span>
                {pricePct != null && (
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5',
                    up ? 'bg-emerald-500/10 text-emerald-600' : down ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'
                  )}>
                    {up && <TrendingUp className="h-2.5 w-2.5" />}
                    {down && <TrendingDown className="h-2.5 w-2.5" />}
                    {pricePct > 0 ? '+' : ''}{pricePct}%
                  </span>
                )}
              </div>
            )}
            {costChanged && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground w-12">Costo:</span>
                <span className="text-muted-foreground line-through text-[11px]">{fmt(h.old_cost, h.currency)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="font-semibold text-[11px]">{fmt(h.new_cost, h.currency)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
