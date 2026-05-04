import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, PackagePlus, AlertTriangle } from 'lucide-react';
import { useClientProducts } from '@/hooks/use-client-products';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { InventoryCatalogs } from './InventoryCatalogs';
import { TissueProductDialog } from './TissueProductDialog';
import { ReceiveStockDialog } from './ReceiveStockDialog';

export const TissueInventoryView = ({ clientId }: { clientId: string }) => {
  const { products, isLoading } = useClientProducts(clientId);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [receiveFor, setReceiveFor] = useState<{ id: string; name: string } | null>(null);

  // All variants for this client (for stock totals + low-stock alerts)
  const { data: allVariants = [] } = useQuery({
    queryKey: ['product_variants_all', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, size, color, stock_quantity, low_stock_threshold, price')
        .eq('client_id', clientId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });

  const variantsByProduct = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const v of allVariants) {
      (m[v.product_id] = m[v.product_id] || []).push(v);
    }
    return m;
  }, [allVariants]);

  const lowStock = useMemo(
    () => allVariants.filter(v => v.stock_quantity <= v.low_stock_threshold && v.low_stock_threshold > 0),
    [allVariants]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p =>
      !q || p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      ((p as any).brand || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const editingProduct = editingId && editingId !== 'new' ? products.find(p => p.id === editingId) : null;

  return (
    <div className="space-y-6">
      <InventoryCatalogs clientId={clientId} />

      {lowStock.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Stock bajo ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {lowStock.map(v => {
              const p = products.find(p => p.id === v.product_id);
              return (
                <Badge key={v.id} variant="outline" className="text-xs">
                  {p?.name} · {v.size || '—'}/{v.color || '—'}: {v.stock_quantity}
                </Badge>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Productos</CardTitle>
            <CardDescription>{products.length} productos</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setEditingId('new')}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, marca o categoría…" className="pl-8 h-9" />
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Sin productos. Crea el primero arriba.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(p => {
                const vs = variantsByProduct[p.id] || [];
                const totalStock = vs.length > 0
                  ? vs.reduce((s, v) => s + Number(v.stock_quantity || 0), 0)
                  : Number(p.stock_quantity || 0);
                const prices = vs.map(v => Number(v.price)).filter(n => !isNaN(n) && n > 0);
                const minP = prices.length ? Math.min(...prices) : Number(p.price || 0);
                const maxP = prices.length ? Math.max(...prices) : Number(p.price || 0);
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                    <button onClick={() => setEditingId(p.id)} className="text-left">
                      <div className="aspect-square bg-muted relative">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <Package className="h-10 w-10 text-muted-foreground/30 absolute inset-0 m-auto" />
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          <Badge variant="secondary" className="text-[10px]">{vs.length} var.</Badge>
                          <Badge variant={totalStock > 0 ? 'outline' : 'destructive'} className="text-[10px]">Stock: {totalStock}</Badge>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(p as any).brand && <Badge variant="outline" className="text-[10px]">{(p as any).brand}</Badge>}
                          {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ₡{minP.toLocaleString('es-CR')}{maxP > minP ? ` – ₡${maxP.toLocaleString('es-CR')}` : ''}
                        </div>
                      </div>
                    </button>
                    <div className="p-2 border-t bg-muted/20">
                      <Button size="sm" variant="ghost" className="w-full h-8 gap-1.5 text-xs" onClick={() => setReceiveFor({ id: p.id, name: p.name })}>
                        <PackagePlus className="h-3.5 w-3.5" /> Recibir mercadería
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {editingId && (
        <TissueProductDialog
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
          clientId={clientId}
          editing={editingProduct}
        />
      )}
      {receiveFor && (
        <ReceiveStockDialog
          open={!!receiveFor}
          onOpenChange={(o) => !o && setReceiveFor(null)}
          clientId={clientId}
          productId={receiveFor.id}
          productName={receiveFor.name}
        />
      )}
    </div>
  );
};
