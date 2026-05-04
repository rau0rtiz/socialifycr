import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { CatalogItem } from '@/hooks/use-product-catalogs';
import { toast } from 'sonner';

interface CatalogChipsProps {
  title: string;
  items: CatalogItem[];
  onAdd: (name: string, extra?: { hex_code?: string }) => Promise<any> | any;
  onRemove: (id: string) => Promise<any> | any;
  withColor?: boolean;
}

export const CatalogChips = ({ title, items, onAdd, onRemove, withColor }: CatalogChipsProps) => {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onAdd(trimmed, withColor ? { hex_code: hex } : undefined);
      setName('');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo agregar');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-1.5 pr-1 group">
            {withColor && item.hex_code && (
              <span className="h-3 w-3 rounded-full border border-border" style={{ background: item.hex_code }} />
            )}
            <span>{item.name}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="opacity-50 hover:opacity-100 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground italic">Sin elementos</span>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Agregar ${title.toLowerCase()}…`}
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
        />
        {withColor && (
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
          />
        )}
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={handleAdd} disabled={adding || !name.trim()}>
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>
    </div>
  );
};
