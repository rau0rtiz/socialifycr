import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useClientProductCategories, ProductCategory } from '@/hooks/use-client-product-categories';
import { Plus, Pencil, Trash2, Tag as TagIcon, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLOR_PALETTE = [
  'hsl(220, 70%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(330, 81%, 60%)',
  'hsl(25, 95%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(186, 100%, 42%)',
  'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
}

export const ProductCategoriesDialog = ({ open, onOpenChange, clientId }: Props) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useClientProductCategories(clientId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [adding, setAdding] = useState(false);

  const reset = () => {
    setName(''); setColor(COLOR_PALETTE[0]); setEditingId(null); setAdding(false);
  };

  const startEdit = (c: ProductCategory) => {
    setEditingId(c.id); setName(c.name); setColor(c.color); setAdding(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, name, color });
        toast.success('Categoría actualizada');
      } else {
        await addCategory.mutateAsync({ name, color, sort_order: categories.length });
        toast.success('Categoría creada');
      }
      reset();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Categoría eliminada');
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" /> Categorías
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {categories.length === 0 && !adding && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <TagIcon className="h-6 w-6 mx-auto mb-2 opacity-30" />
              Sin categorías. Creá la primera.
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="group flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm flex-1 truncate">{c.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => startEdit(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="rounded-lg border border-border/50 p-3 space-y-2.5 bg-muted/20">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Tratamientos faciales" className="h-9 mt-1" autoFocus />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-7 h-7 rounded-full transition-all relative',
                        color === c ? 'ring-2 ring-offset-2 ring-foreground/40 scale-110' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="h-3 w-3 text-white absolute inset-0 m-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Vista previa</Label>
                <div className="mt-1.5">
                  <Badge
                    variant="outline"
                    style={{ backgroundColor: `${color}20`, color, borderColor: `${color}50` }}
                  >
                    {name || 'Nombre de categoría'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={addCategory.isPending || updateCategory.isPending}>
                  {editingId ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Nueva categoría
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
