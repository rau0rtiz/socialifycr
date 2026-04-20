import { useState } from 'react';
import { useClientProductTags, ProductTag } from '@/hooks/use-client-product-tags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Tag as TagIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TAG_COLORS = [
  'hsl(262, 83%, 58%)', 'hsl(220, 70%, 50%)', 'hsl(142, 76%, 36%)',
  'hsl(25, 95%, 53%)', 'hsl(330, 81%, 60%)', 'hsl(186, 100%, 42%)',
];

interface Props {
  clientId: string;
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const ProductTagSelector = ({ clientId, selectedTagIds, onChange, disabled }: Props) => {
  const { tags, addTag } = useClientProductTags(clientId);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const selected = tags.filter(t => selectedTagIds.includes(t.id));

  const toggle = (id: string) => {
    if (selectedTagIds.includes(id)) onChange(selectedTagIds.filter(x => x !== id));
    else onChange([...selectedTagIds, id]);
  };

  const remove = (id: string) => onChange(selectedTagIds.filter(x => x !== id));

  const create = async () => {
    if (!newName.trim()) return;
    try {
      const t = await addTag.mutateAsync({ name: newName, color: newColor });
      onChange([...selectedTagIds, t.id]);
      setNewName(''); setNewColor(TAG_COLORS[0]); setCreateOpen(false);
      toast.success('Etiqueta creada');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        <TagIcon className="h-3 w-3 text-muted-foreground" />
        Etiquetas
      </Label>

      <div className="flex flex-wrap gap-1 min-h-[28px] p-1.5 rounded-md border border-input bg-background">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground px-1">Sin etiquetas</span>
        ) : (
          selected.map(t => (
            <Badge
              key={t.id}
              variant="outline"
              className="gap-1 pr-1 text-[10px] py-0 px-1.5 h-5"
              style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}40` }}
            >
              {t.name}
              <button onClick={() => remove(t.id)} disabled={disabled} className="ml-0.5 hover:bg-black/10 rounded-full">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] justify-start text-muted-foreground" disabled={disabled}>
              <Plus className="h-3 w-3 mr-1" /> Agregar etiqueta
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sin etiquetas</p>
              ) : (
                tags.map(t => {
                  const sel = selectedTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        sel ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="flex-1 text-left truncate">{t.name}</span>
                      {sel && <Check className="h-3 w-3" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCreateOpen(true)} disabled={disabled}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva etiqueta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Promoción, Vegano" className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn('w-7 h-7 rounded-full', newColor === c ? 'ring-2 ring-offset-2 ring-foreground/40' : '')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={!newName.trim() || addTag.isPending}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
