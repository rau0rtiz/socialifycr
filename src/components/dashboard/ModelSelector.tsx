import { useState } from 'react';
import { ContentModel } from '@/hooks/use-content-metadata';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, User } from 'lucide-react';

interface ModelSelectorProps {
  models: ContentModel[];
  selectedModelId: string | null;
  onSelect: (modelId: string | null) => void;
  onCreate: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  disabled?: boolean;
}

export const ModelSelector = ({ 
  models, 
  selectedModelId, 
  onSelect, 
  onCreate,
  disabled 
}: ModelSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelPhotoUrl, setNewModelPhotoUrl] = useState('');
  const [newModelNotes, setNewModelNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedModel = models.find((m) => m.id === selectedModelId);

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
      onSelect(created.id);
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
        Modelo en Video
      </Label>
      
      <div className="flex items-center gap-2">
        <Select 
          value={selectedModelId || ''} 
          onValueChange={(val) => onSelect(val || null)}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Sin modelo asignado">
              {selectedModel && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedModel.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(selectedModel.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{selectedModel.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <span className="text-muted-foreground">Sin modelo asignado</span>
            </SelectItem>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={model.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(model.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{model.name}</span>
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
