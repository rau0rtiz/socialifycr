import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Plus, Layers, Sparkles, Trash2, MoreVertical } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import {
  useAdFrameworks,
  useCreateAdFramework,
  useDeleteAdFramework,
  type AdFrameworkWithDimensions,
  type TemplateKind,
} from '@/hooks/use-ad-frameworks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FRAMEWORK_MOLDS } from '@/lib/framework-molds';
import { FRAMEWORK_TEMPLATES } from '@/lib/framework-templates';

const PRIMARY_FRAMEWORK = 'MASTERCLASS';

const MindCoachFrameworks = () => {
  const navigate = useNavigate();
  const { selectedClient } = useBrand();
  const { isAgency, canManage } = useUserRole();

  const { data: frameworksRaw, isLoading } = useAdFrameworks({
    scope: 'client',
    clientId: selectedClient?.id ?? null,
  });

  const createFramework = useCreateAdFramework();
  const deleteFramework = useDeleteAdFramework();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moldKind, setMoldKind] = useState<TemplateKind>('launch');
  const [templateId, setTemplateId] = useState<string>('blank');
  const [toDelete, setToDelete] = useState<AdFrameworkWithDimensions | null>(null);

  // Sort: MASTERCLASS first
  const frameworks = [...(frameworksRaw ?? [])].sort((a, b) => {
    if (a.name === PRIMARY_FRAMEWORK) return -1;
    if (b.name === PRIMARY_FRAMEWORK) return 1;
    return 0;
  });

  const handleCreate = async () => {
    if (!name.trim() || !selectedClient?.id) return;

    if (moldKind === 'legacy_matrix') {
      const tmpl = FRAMEWORK_TEMPLATES.find((t) => t.id === templateId);
      const fw = await createFramework.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        template_kind: 'legacy_matrix',
        client_id: selectedClient.id,
        template: tmpl && tmpl.id !== 'blank'
          ? { angles: tmpl.angles, formats: tmpl.formats, hooks: tmpl.hooks }
          : undefined,
      });
      setCreateOpen(false);
      setName(''); setDescription(''); setTemplateId('blank'); setMoldKind('launch');
      if (fw) navigate(`/ad-frameworks/${fw.id}`);
      return;
    }

    const mold = FRAMEWORK_MOLDS.find((m) => m.kind === moldKind);
    const fw = await createFramework.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      template_kind: moldKind,
      client_id: selectedClient.id,
      mold_dimensions: mold?.defaultDimensions ?? [],
    });
    setCreateOpen(false);
    setName(''); setDescription(''); setTemplateId('blank'); setMoldKind('launch');
    if (fw) navigate(`/ad-frameworks/${fw.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Frameworks
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Frameworks de contenido y pauta para impulsar las distintas iniciativas de {selectedClient?.name ?? 'este cliente'}. Cada framework define ángulos, formatos y hooks reutilizables.
            </p>
          </div>
          {(isAgency || canManage) && (
            <Button className="gap-2" onClick={() => setCreateOpen(true)} disabled={!selectedClient?.id}>
              <Plus className="h-4 w-4" /> Nuevo framework
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Cargando...</div>
        ) : frameworks.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold">Aún no hay frameworks para este cliente</h3>
            <p className="text-sm text-muted-foreground">
              Crea el primer framework específico de {selectedClient?.name ?? 'este cliente'}.
            </p>
            {(isAgency || canManage) && (
              <Button className="gap-2 mt-2" onClick={() => setCreateOpen(true)} disabled={!selectedClient?.id}>
                <Plus className="h-4 w-4" /> Crear framework
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frameworks.map((fw) => {
              const isPrimary = fw.name === PRIMARY_FRAMEWORK;
              const count = fw.campaign_count ?? 0;
              return (
                <Card
                  key={fw.id}
                  className="p-5 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
                  onClick={() => navigate(`/ad-frameworks/${fw.id}`)}
                >
                  {isPrimary && (
                    <Badge className="absolute top-3 right-3 gap-1 text-[10px]">
                      <Sparkles className="h-3 w-3" /> Principal
                    </Badge>
                  )}
                  {(isAgency || canManage) && !isPrimary && (
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(fw)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{fw.name}</h3>
                      {fw.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {fw.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          {count} {count === 1 ? 'campaña' : 'campañas'}
                        </Badge>
                        <span className="ml-auto inline-flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Abrir <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo framework</DialogTitle>
            <DialogDescription>
              Este framework será exclusivo de {selectedClient?.name ?? 'este cliente'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Lanzamiento Q1" />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de framework</Label>
              <div className="grid grid-cols-2 gap-2">
                {FRAMEWORK_MOLDS.map((m) => (
                  <button
                    key={m.kind}
                    type="button"
                    onClick={() => setMoldKind(m.kind)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      moldKind === m.kind ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{m.label}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createFramework.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar framework?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas sus dimensiones, campañas y variantes asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete) await deleteFramework.mutateAsync(toDelete.id);
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default MindCoachFrameworks;
