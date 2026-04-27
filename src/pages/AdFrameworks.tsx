import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Layers, MoreVertical, Trash2, Edit, Copy as CopyIcon } from 'lucide-react';
import { useAdFrameworks, useCreateAdFramework, useDeleteAdFramework, type AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { useUserRole } from '@/hooks/use-user-role';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

const AdFrameworks = () => {
  const navigate = useNavigate();
  const { data: frameworks, isLoading } = useAdFrameworks();
  const createFramework = useCreateAdFramework();
  const deleteFramework = useDeleteAdFramework();
  const { canManage } = useUserRole();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const fw = await createFramework.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setCreateOpen(false);
    setName(''); setDescription('');
    if (fw) navigate(`/ad-frameworks/${fw.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Ad Frameworks
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Diseña frameworks reutilizables para construir matrices de anuncios (ángulos × formatos × hooks)
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo framework
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Cargando frameworks...</div>
        ) : !frameworks || frameworks.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold">Sin frameworks todavía</h3>
            <p className="text-sm text-muted-foreground">Crea tu primer framework para empezar a planificar campañas estructuradas.</p>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> Crear framework
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {frameworks.map((fw) => (
              <FrameworkCard
                key={fw.id}
                fw={fw}
                onOpen={() => navigate(`/ad-frameworks/${fw.id}`)}
                onDelete={canManage ? () => {
                  if (confirm(`¿Eliminar "${fw.name}"? Esto borra también todas sus campañas y variantes.`)) {
                    deleteFramework.mutate(fw.id);
                  }
                } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo framework</DialogTitle>
            <DialogDescription>Después de crearlo podrás definir sus dimensiones (ángulos, formatos, hooks).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fw-name">Nombre</Label>
              <Input id="fw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ad Framework v2" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fw-desc">Descripción (opcional)</Label>
              <Textarea id="fw-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createFramework.isPending}>
              {createFramework.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const FrameworkCard = ({ fw, onOpen, onDelete }: { fw: AdFrameworkWithDimensions; onOpen: () => void; onDelete?: () => void }) => {
  const angles = fw.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = fw.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = fw.dimensions.filter((d) => d.dimension_type === 'hook');
  const total = angles.length * formats.length * hooks.length;

  return (
    <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{fw.name}</h3>
          {fw.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{fw.description}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
              <Edit className="h-4 w-4 mr-2" /> Abrir
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-sm space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ángulos</span>
          <span className="font-mono">{angles.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Formatos</span>
          <span className="font-mono">{formats.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Hooks</span>
          <span className="font-mono">{hooks.length}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <Badge variant="secondary" className="font-mono text-xs">
          {angles.length} × {formats.length} × {hooks.length} = {total}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {fw.campaign_count ?? 0} campaña{(fw.campaign_count ?? 0) === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Actualizado {formatDistanceToNow(new Date(fw.updated_at), { addSuffix: true, locale: es })}
      </p>
    </Card>
  );
};

export default AdFrameworks;
