import { useState } from 'react';
import { ContentTag } from '@/hooks/use-content-metadata';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Tag } from 'lucide-react';

interface TagSelectorProps {
  tags: ContentTag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
  onCreate: (name: string, color: string) => Promise<ContentTag | null>;
  disabled?: boolean;
}

const DEFAULT_COLORS = [
  { name: 'Verde', value: 'hsl(142, 76%, 36%)' },
  { name: 'Azul', value: 'hsl(221, 83%, 53%)' },
  { name: 'Violeta', value: 'hsl(262, 83%, 58%)' },
  { name: 'Naranja', value: 'hsl(25, 95%, 53%)' },
  { name: 'Rosa', value: 'hsl(330, 81%, 60%)' },
  { name: 'Cian', value: 'hsl(186, 100%, 42%)' },
];

export const TagSelector = ({ 
  tags, 
  selectedTagId, 
  onSelect, 
  onCreate,
  disabled 
}: TagSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTag = tags.find((t) => t.id === selectedTagId);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    const created = await onCreate(newTagName.trim(), newTagColor);
    setIsCreating(false);

    if (created) {
      onSelect(created.id);
      setNewTagName('');
      setNewTagColor(DEFAULT_COLORS[0].value);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Tag className="h-3 w-3" />
        Tipo de Contenido
      </Label>
      
      <div className="flex items-center gap-2">
        <Select 
          value={selectedTagId || ''} 
          onValueChange={(val) => onSelect(val || null)}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Sin etiqueta">
              {selectedTag && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: selectedTag.color }}
                  />
                  <span className="text-sm">{selectedTag.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <span className="text-muted-foreground">Sin etiqueta</span>
            </SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" disabled={disabled}>
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva Etiqueta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Nombre</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ej: Educativo, Promoción..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all ${
                        newTagColor === color.value 
                          ? 'ring-2 ring-offset-2 ring-primary' 
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewTagColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Vista previa</Label>
                <Badge 
                  className="mt-1" 
                  style={{ 
                    backgroundColor: `${newTagColor}20`,
                    color: newTagColor,
                    borderColor: `${newTagColor}40`
                  }}
                  variant="outline"
                >
                  {newTagName || 'Nombre de etiqueta'}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!newTagName.trim() || isCreating}
              >
                {isCreating ? 'Creando...' : 'Crear Etiqueta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
