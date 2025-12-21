import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Lightbulb, Instagram, Facebook, Youtube, Twitter, 
  Link2, Trash2, X, Check, ExternalLink, Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoIdea, TodoItem } from '@/hooks/use-video-ideas';

interface VideoIdeasSectionProps {
  ideas: VideoIdea[];
  isLoading: boolean;
  tags: { id: string; name: string; color: string | null }[];
  models: { id: string; name: string; photo_url: string | null }[];
  onAddIdea: (idea: any) => Promise<any>;
  onUpdateIdea: (id: string, updates: Partial<VideoIdea>) => Promise<boolean>;
  onDeleteIdea: (id: string) => Promise<boolean>;
  clientId: string;
}

const platformConfig = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  tiktok: { 
    label: 'TikTok', 
    icon: () => (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ), 
    color: 'bg-foreground/10 text-foreground border-foreground/20' 
  },
  youtube: { label: 'YouTube', icon: Youtube, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  twitter: { label: 'Twitter', icon: Twitter, color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  other: { label: 'Otro', icon: Link2, color: 'bg-muted text-muted-foreground border-muted-foreground/20' },
};

const detectPlatform = (url: string): VideoIdea['platform'] => {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  return 'other';
};

const IdeaSkeleton = () => (
  <div className="flex items-center gap-3 p-2">
    <Skeleton className="w-16 h-16 rounded-md" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
);

export const VideoIdeasSection = ({
  ideas,
  isLoading,
  tags,
  models,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  clientId,
}: VideoIdeasSectionProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit modal state
  const [editDescription, setEditDescription] = useState('');
  const [editTagId, setEditTagId] = useState<string>('');
  const [editModelId, setEditModelId] = useState<string>('');
  const [editTodos, setEditTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddIdea = async () => {
    if (!newUrl.trim()) return;
    
    setIsAdding(true);
    const platform = detectPlatform(newUrl);
    
    await onAddIdea({
      client_id: clientId,
      url: newUrl.trim(),
      platform,
      thumbnail_url: null,
      title: null,
      description: null,
      tag_id: null,
      model_id: null,
    });
    
    setNewUrl('');
    setIsAddModalOpen(false);
    setIsAdding(false);
  };

  const handleOpenIdea = (idea: VideoIdea) => {
    setSelectedIdea(idea);
    setEditDescription(idea.description || '');
    setEditTagId(idea.tag_id || '');
    setEditModelId(idea.model_id || '');
    setEditTodos(idea.todos || []);
  };

  const handleSaveIdea = async () => {
    if (!selectedIdea) return;
    
    await onUpdateIdea(selectedIdea.id, {
      description: editDescription || null,
      tag_id: editTagId || null,
      model_id: editModelId || null,
      todos: editTodos,
    });
    
    setSelectedIdea(null);
  };

  const handleDeleteIdea = async () => {
    if (!selectedIdea) return;
    await onDeleteIdea(selectedIdea.id);
    setSelectedIdea(null);
  };

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    setEditTodos(prev => [
      ...prev,
      { id: crypto.randomUUID(), text: newTodoText.trim(), completed: false }
    ]);
    setNewTodoText('');
  };

  const handleToggleTodo = (todoId: string) => {
    setEditTodos(prev => prev.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleRemoveTodo = (todoId: string) => {
    setEditTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-medium">Ideas de Videos</CardTitle>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs gap-1"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <IdeaSkeleton key={i} />)
            ) : ideas.length === 0 ? (
              <div className="text-center py-8">
                <Video className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay ideas guardadas
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-1"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Agregar tu primera idea
                </Button>
              </div>
            ) : (
              ideas.map((idea) => {
                const config = platformConfig[idea.platform];
                const PlatformIcon = config.icon;
                const tag = tags.find(t => t.id === idea.tag_id);

                return (
                  <div
                    key={idea.id}
                    onClick={() => handleOpenIdea(idea)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {idea.thumbnail_url ? (
                        <img 
                          src={idea.thumbnail_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlatformIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", config.color)}>
                          <PlatformIcon className="h-2.5 w-2.5" />
                          {config.label}
                        </Badge>
                        {tag && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color || undefined,
                              borderColor: `${tag.color}40`
                            }}
                          >
                            {tag.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 truncate">
                        {idea.description || idea.url}
                      </p>
                      {idea.todos.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Check className="h-2.5 w-2.5" />
                          {idea.todos.filter(t => t.completed).length}/{idea.todos.length} tareas
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Idea de Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>URL del video</Label>
              <Input
                placeholder="https://instagram.com/reel/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
              />
              <p className="text-xs text-muted-foreground">
                Soporta: Instagram, Facebook, TikTok, YouTube, Twitter
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddIdea} disabled={!newUrl.trim() || isAdding}>
                {isAdding ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Modal */}
      <Dialog open={!!selectedIdea} onOpenChange={(open) => !open && setSelectedIdea(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIdea && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    {(() => {
                      const config = platformConfig[selectedIdea.platform];
                      const PlatformIcon = config.icon;
                      return (
                        <Badge variant="outline" className={cn("gap-1", config.color)}>
                          <PlatformIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      );
                    })()}
                    Idea de Video
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(selectedIdea.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={handleDeleteIdea}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Video embed placeholder */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedIdea.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en {platformConfig[selectedIdea.platform].label}
                    </Button>
                  </div>
                </div>

                {/* Tag and Model selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Etiqueta</Label>
                    <Select value={editTagId || "none"} onValueChange={(val) => setEditTagId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar etiqueta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin etiqueta</SelectItem>
                        {tags.map(tag => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: tag.color || undefined }}
                              />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={editModelId || "none"} onValueChange={(val) => setEditModelId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin modelo</SelectItem>
                        {models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Descripción / Notas</Label>
                  <Textarea
                    placeholder="Agrega notas sobre esta idea de video..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* To-do list */}
                <div className="space-y-3">
                  <Label>Lista de Tareas</Label>
                  <div className="space-y-2">
                    {editTodos.map(todo => (
                      <div key={todo.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleToggleTodo(todo.id)}
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          todo.completed && "line-through text-muted-foreground"
                        )}>
                          {todo.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveTodo(todo.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nueva tarea..."
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddTodo} disabled={!newTodoText.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveIdea}>
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
