import { useState } from 'react';
import { ContentModel } from '@/hooks/use-content-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, User, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiModelSelectorProps {
  models: ContentModel[];
  selectedModelIds: string[];
  onSelect: (modelIds: string[]) => void;
  onCreate: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  disabled?: boolean;
}

export const MultiModelSelector = ({ 
  models, 
  selectedModelIds, 
  onSelect, 
  onCreate,
  disabled 
}: MultiModelSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelPhotoUrl, setNewModelPhotoUrl] = useState('');
  const [newModelNotes, setNewModelNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));

  const handleToggleModel = (modelId: string) => {
    if (selectedModelIds.includes(modelId)) {
      onSelect(selectedModelIds.filter(id => id !== modelId));
    } else {
      onSelect([...selectedModelIds, modelId]);
    }
  };

  const handleRemoveModel = (modelId: string) => {
    onSelect(selectedModelIds.filter(id => id !== modelId));
  };

  const handleCreate = async () => {
    if (!newModelName.trim()) return;

    setIsCreating(true);
    const created = await onCreate(
      newModelName.trim(), 
      newModelPhotoUrl.trim() || undefined, 
      newModelNotes.trim() || undefined
    );
    setIsCreating(false);

    if (created) {
      onSelect([...selectedModelIds, created.id]);
      setNewModelName('');
      setNewModelPhotoUrl('');
      setNewModelNotes('');
      setIsDialogOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <User className="h-3 w-3" />
        Modelos en Video
      </Label>
      
      {/* Selected models display */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 rounded-md border border-input bg-background">
        {selectedModels.length === 0 ? (
          <span className="text-sm text-muted-foreground px-1">Sin modelos asignados</span>
        ) : (
          selectedModels.map((model) => (
            <Badge
              key={model.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={model.photo_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(model.name)}
                </AvatarFallback>
              </Avatar>
              {model.name}
              <button
                onClick={() => handleRemoveModel(model.id)}
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
              Agregar modelo
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {models.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No hay modelos creados
                </p>
              ) : (
                models.map((model) => {
                  const isSelected = selectedModelIds.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleToggleModel(model.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isSelected 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarImage src={model.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(model.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-left">{model.name}</span>
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
              <DialogTitle>Nuevo Modelo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Nombre *</Label>
                <Input
                  id="model-name"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Nombre del modelo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-photo">URL de Foto (opcional)</Label>
                <Input
                  id="model-photo"
                  value={newModelPhotoUrl}
                  onChange={(e) => setNewModelPhotoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-notes">Notas (opcional)</Label>
                <Textarea
                  id="model-notes"
                  value={newModelNotes}
                  onChange={(e) => setNewModelNotes(e.target.value)}
                  placeholder="Notas sobre el modelo..."
                  rows={2}
                />
              </div>
              {(newModelName || newModelPhotoUrl) && (
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">Vista previa</Label>
                  <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={newModelPhotoUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {newModelName ? getInitials(newModelName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {newModelName || 'Nombre del modelo'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!newModelName.trim() || isCreating}
              >
                {isCreating ? 'Creando...' : 'Crear Modelo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
