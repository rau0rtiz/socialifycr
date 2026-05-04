import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useProductSizes, useProductColors } from '@/hooks/use-product-catalogs';
import { useProductVariants, ProductVariant } from '@/hooks/use-product-variants';
import { PhotoCapture } from '@/components/common/PhotoCapture';
import { toast } from 'sonner';

interface VariantEditorProps {
  clientId: string;
  productId: string;
  defaultPrice?: number | null;
}

export const VariantEditor = ({ clientId, productId, defaultPrice }: VariantEditorProps) => {
  const { items: sizes } = useProductSizes(clientId);
  const { items: colors } = useProductColors(clientId);
  const { variants, upsert, remove } = useProductVariants(clientId, productId);

  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const handleAdd = async () => {
    if (!size && !color) {
      toast.error('Elige al menos talla o color');
      return;
    }
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        product_id: productId,
        size: size || null,
        color: color || null,
        price: price ? Number(price) : (defaultPrice ?? null),
        stock_quantity: stock ? Number(stock) : 0,
      });
      setSize(''); setColor(''); setPrice(''); setStock('');
    } catch (e: any) {
      if (e.code === '23505') toast.error('Esa combinación ya existe');
      else toast.error(e.message || 'Error al guardar variante');
    }
  };

  const grouped = useMemo(() => variants, [variants]);

  return (
    <div className="space-y-3">
      {/* Add row */}
      <div className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-dashed border-border bg-muted/20">
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground">Talla</label>
          <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
            <option value="">—</option>
            {sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground">Color</label>
          <select value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
            <option value="">—</option>
            {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Precio</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="h-9" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Stock inicial</label>
          <Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" className="h-9" />
        </div>
        <div className="col-span-2">
          <Button type="button" size="sm" onClick={handleAdd} disabled={upsert.isPending} className="w-full gap-1">
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        </div>
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="text-sm text-muted-foreground italic text-center py-4">Sin variantes — el producto se vende como pieza única.</div>
      ) : (
        <div className="space-y-2">
          {grouped.map(v => (
            <VariantRow key={v.id} v={v} onRemove={() => remove.mutate(v.id)} onUpdate={(patch) => upsert.mutate({ ...patch, id: v.id, client_id: clientId, product_id: productId })} clientId={clientId} productId={productId} />
          ))}
        </div>
      )}
    </div>
  );
};

const VariantRow = ({ v, onRemove, onUpdate, clientId, productId }: { v: ProductVariant; onRemove: () => void; onUpdate: (patch: any) => void; clientId: string; productId: string }) => {
  const lowStock = v.stock_quantity <= v.low_stock_threshold;
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
      <PhotoCapture
        value={v.photo_url}
        onChange={(url) => onUpdate({ photo_url: url })}
        folder={`tissue/variants/${v.id}`}
        size="sm"
      />
      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
        {v.size && <Badge variant="outline">{v.size}</Badge>}
        {v.color && <Badge variant="outline">{v.color}</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          defaultValue={v.price ?? ''}
          type="number"
          placeholder="Precio"
          className="h-8 w-24 text-sm"
          onBlur={(e) => {
            const next = e.target.value ? Number(e.target.value) : null;
            if (next !== v.price) onUpdate({ price: next });
          }}
        />
        <div className="flex items-center gap-1">
          <Input
            defaultValue={v.stock_quantity}
            type="number"
            className="h-8 w-20 text-sm"
            onBlur={(e) => {
              const next = Number(e.target.value);
              if (next !== v.stock_quantity) onUpdate({ stock_quantity: next });
            }}
          />
          {lowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
