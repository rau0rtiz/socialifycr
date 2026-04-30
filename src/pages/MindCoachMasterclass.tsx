import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Layers, MoreVertical, Trash2, Edit, Sparkles } from 'lucide-react';
import {
  useAdFrameworks,
  useCreateAdFramework,
  useDeleteAdFramework,
  type AdFrameworkWithDimensions,
  type TemplateKind,
} from '@/hooks/use-ad-frameworks';
import { useUserRole } from '@/hooks/use-user-role';
import { useBrand } from '@/contexts/BrandContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FRAMEWORK_TEMPLATES, type FrameworkTemplate } from '@/lib/framework-templates';
import { FRAMEWORK_MOLDS, type FrameworkMold } from '@/lib/framework-molds';

const MindCoachMasterclass = () => {
  const navigate = useNavigate();
  const { selectedClient } = useBrand();
  const { canManage, isAgency } = useUserRole();
  const { data: frameworks, isLoading } = useAdFrameworks({
    scope: 'client',
    clientId: selectedClient?.id ?? null,
  });
  const createFramework = useCreateAdFramework();
  const deleteFramework = useDeleteAdFramework();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moldKind, setMoldKind] = useState<TemplateKind | 'legacy_matrix'>('pool');
  const [templateId, setTemplateId] = useState<string>('blank');
  const [toDelete, setToDelete] = useState<AdFrameworkWithDimensions | null>(null);

  const canCreate = isAgency || canManage;

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
      setName(''); setDescription(''); setTemplateId('blank'); setMoldKind('pool');
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Frameworks
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Frameworks de contenido y pauta exclusivos de {selectedClient?.name ?? 'este cliente'}.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!selectedClient?.id}>
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
            <p className="text-sm text-muted-foreground">Crea el primer framework específico de {selectedClient?.name ?? 'este cliente'}.</p>
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2 mt-2" disabled={!selectedClient?.id}>
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
                onDelete={canCreate ? () => setToDelete(fw) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo framework</DialogTitle>
            <DialogDescription>
              Este framework será exclusivo de {selectedClient?.name ?? 'este cliente'}. Elige el tipo de flujo que mejor representa cómo planificas tus anuncios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fw-name">Nombre</Label>
              <Input id="fw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Lanzamiento Masterclass Q2" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fw-desc">Descripción (opcional)</Label>
              <Textarea id="fw-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Tipo de framework</Label>
              <div className="grid grid-cols-1 gap-2">
                {FRAMEWORK_MOLDS.map((m) => (
                  <MoldOption key={m.kind} mold={m} selected={moldKind === m.kind} onSelect={() => setMoldKind(m.kind)} />
                ))}
                <button
                  type="button"
                  onClick={() => setMoldKind('legacy_matrix')}
                  className={cn(
                    'border rounded-md p-3 text-left transition-all hover:border-primary/50',
                    moldKind === 'legacy_matrix' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
                  )}
                >
                  <p className="font-semibold text-sm">Matriz clásica (Ángulo × Formato × Hook)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Genera todas las combinaciones automáticamente. Útil para tests amplios.</p>
                </button>
              </div>
            </div>

            {moldKind === 'legacy_matrix' && (
              <div className="space-y-2">
                <Label>Plantilla base</Label>
                <div className="grid grid-cols-1 gap-2">
                  {FRAMEWORK_TEMPLATES.map((t) => (
                    <TemplateOption
                      key={t.id}
                      template={t}
                      selected={templateId === t.id}
                      onSelect={() => setTemplateId(t.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createFramework.isPending}>
              {createFramework.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar framework?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará "{toDelete?.name}" junto con todas sus campañas y variantes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) deleteFramework.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const TemplateOption = ({ template, selected, onSelect }: { template: FrameworkTemplate; selected: boolean; onSelect: () => void }) => {
  const total = template.angles.length * template.formats.length * template.hooks.length;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'border rounded-md p-3 text-left transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {template.id !== 'blank' && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            <p className="font-semibold text-sm">{template.name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{template.hint}</p>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
            {template.angles.length}×{template.formats.length}×{template.hooks.length} = {total}
          </Badge>
        )}
      </div>
    </button>
  );
};

const MoldOption = ({ mold, selected, onSelect }: { mold: FrameworkMold; selected: boolean; onSelect: () => void }) => {
  const Icon = mold.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'border rounded-md p-3 text-left transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(${mold.accentColor} / 0.15)`, color: `hsl(${mold.accentColor})` }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{mold.name}</p>
            <Badge variant="secondary" className="text-[10px] shrink-0">{mold.tagline}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{mold.description}</p>
        </div>
      </div>
    </button>
  );
};

const FrameworkCard = ({ fw, onOpen, onDelete }: { fw: AdFrameworkWithDimensions; onOpen: () => void; onDelete?: () => void }) => {
  const mold = FRAMEWORK_MOLDS.find((m) => m.kind === fw.template_kind);
  const Icon = mold?.icon ?? Layers;

  const dims = fw.dimensions;
  const stats: { label: string; value: number }[] = (() => {
    switch (fw.template_kind) {
      case 'pool':
        return [{ label: 'Tipos de contenido', value: dims.filter((d) => d.dimension_type === 'content_type').length }];
      case 'awareness':
        return [
          { label: 'Niveles', value: dims.filter((d) => d.dimension_type === 'awareness_level').length },
          { label: 'Mensajes centrales', value: dims.filter((d) => d.dimension_type === 'core_message').length },
          { label: 'Tipos de contenido', value: dims.filter((d) => d.dimension_type === 'content_type').length },
        ];
      case 'launch':
        return [
          { label: 'Fases', value: dims.filter((d) => d.dimension_type === 'phase').length },
          { label: 'Tipos de contenido', value: dims.filter((d) => d.dimension_type === 'content_type').length },
        ];
      case 'legacy_matrix':
      default:
        return [
          { label: 'Ángulos', value: dims.filter((d) => d.dimension_type === 'angle').length },
          { label: 'Formatos', value: dims.filter((d) => d.dimension_type === 'format').length },
          { label: 'Hooks', value: dims.filter((d) => d.dimension_type === 'hook').length },
        ];
    }
  })();

  const summary = (() => {
    switch (fw.template_kind) {
      case 'pool': {
        const t = dims.filter((d) => d.dimension_type === 'content_type').length;
        return `Pool · ${t} tipo${t === 1 ? '' : 's'}`;
      }
      case 'awareness': {
        const m = dims.filter((d) => d.dimension_type === 'core_message').length;
        return `Awareness · ${m} mensaje${m === 1 ? '' : 's'}`;
      }
      case 'launch': {
        const p = dims.filter((d) => d.dimension_type === 'phase').length;
        return `Launch · ${p} fase${p === 1 ? '' : 's'}`;
      }
      case 'legacy_matrix':
      default: {
        const a = dims.filter((d) => d.dimension_type === 'angle').length;
        const f = dims.filter((d) => d.dimension_type === 'format').length;
        const h = dims.filter((d) => d.dimension_type === 'hook').length;
        const total = h > 0 ? a * f * h : a * f;
        return h > 0 ? `${a} × ${f} × ${h} = ${total}` : `${a} × ${f} = ${total}`;
      }
    }
  })();

  const accentColor = mold?.accentColor ?? '262 83% 58%';

  return (
    <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `hsl(${accentColor} / 0.15)`, color: `hsl(${accentColor})` }}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{fw.name}</h3>
            {fw.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{fw.description}</p>}
          </div>
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
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <Badge variant="secondary" className="font-mono text-xs">
          {summary}
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

export default MindCoachMasterclass;
