import { useState } from 'react';
import { ContentTag } from '@/hooks/use-content-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Tag, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiTagSelectorProps {
  tags: ContentTag[];
  selectedTagIds: string[];
  onSelect: (tagIds: string[]) => void;
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

export const MultiTagSelector = ({ 
  tags, 
  selectedTagIds, 
  onSelect, 
  onCreate,
  disabled 
}: MultiTagSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelect(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelect([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onSelect(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    const created = await onCreate(newTagName.trim(), newTagColor);
    setIsCreating(false);

    if (created) {
      onSelect([...selectedTagIds, created.id]);
      setNewTagName('');
      setNewTagColor(DEFAULT_COLORS[0].value);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Tag className="h-3 w-3" />
        Tipos de Contenido
      </Label>
      
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 rounded-md border border-input bg-background">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground px-1">Sin etiquetas</span>
        ) : (
          selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="gap-1 pr-1"
              style={{ 
                backgroundColor: `${tag.color}15`,
                color: tag.color,
                borderColor: `${tag.color}40`
              }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 justify-start text-muted-foreground"
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar etiqueta
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No hay etiquetas creadas
                </p>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isSelected 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-left">{tag.name}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" disabled={disabled}>
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
