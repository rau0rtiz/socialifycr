import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Settings, Sparkles, Trash2, Copy as CopyIcon, AlertCircle, Clock, MoreVertical } from 'lucide-react';
import { useAdFramework } from '@/hooks/use-ad-frameworks';
import { useAdCampaigns, useCreateAdCampaign, useDeleteAdCampaign, useDuplicateCampaign, type AdCampaignWithStats } from '@/hooks/use-ad-campaigns';
import { useUserRole } from '@/hooks/use-user-role';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FrameworkBuilder } from '@/components/ad-frameworks/FrameworkBuilder';
import { FrameworkOverview, canCreateCampaignForFramework } from '@/components/ad-frameworks/FrameworkOverview';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { differenceInCalendarDays, format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const AdFrameworkDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: framework, isLoading } = useAdFramework(id);
  const { data: campaigns } = useAdCampaigns(id);
  const createCampaign = useCreateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const { canManage } = useUserRole();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [toDelete, setToDelete] = useState<AdCampaignWithStats | null>(null);
  const [toDuplicate, setToDuplicate] = useState<AdCampaignWithStats | null>(null);
  const [dupName, setDupName] = useState('');
  const [dupCopyContent, setDupCopyContent] = useState(true);

  // Auto-open builder if framework has no dimensions yet (onboarding)
  useEffect(() => {
    if (framework && framework.dimensions.length === 0) {
      setBuilderOpen(true);
    }
  }, [framework?.id]);

  if (isLoading) return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Cargando...</div></DashboardLayout>;
  if (!framework) return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Framework no encontrado</div></DashboardLayout>;

  const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = framework.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = framework.dimensions.filter((d) => d.dimension_type === 'hook');
  const isLegacy = framework.template_kind === 'legacy_matrix';
  const totalVariants = isLegacy
    ? (hooks.length > 0 ? angles.length * formats.length * hooks.length : angles.length * formats.length)
    : 0;
  const canCreateCampaign = canCreateCampaignForFramework(framework);

  const handleCreateCampaign = async () => {
    if (!campName.trim() || !id) return;
    const c = await createCampaign.mutateAsync({
      framework_id: id,
      name: campName.trim(),
      description: campDesc.trim() || undefined,
    });
    setCampaignOpen(false);
    setCampName(''); setCampDesc('');
    if (c) navigate(`/ad-frameworks/${id}/campaigns/${c.id}`);
  };

  const handleDuplicate = async () => {
    if (!toDuplicate || !dupName.trim()) return;
    await duplicateCampaign.mutateAsync({
      source: toDuplicate,
      newName: dupName.trim(),
      copyContent: dupCopyContent,
    });
    setToDuplicate(null);
    setDupName('');
    setDupCopyContent(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/ad-frameworks')} className="gap-1.5 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> Frameworks
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{framework.name}</h1>
              {framework.description && <p className="text-muted-foreground text-sm mt-1">{framework.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBuilderOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" /> Editar framework
              </Button>
              {canManage && canCreateCampaign && (
                <Button onClick={() => setCampaignOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva campaña
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mold-aware overview */}
        <FrameworkOverview framework={framework} onEdit={() => setBuilderOpen(true)} />

        {/* Campañas */}
        <div>
          <h2 className="font-semibold text-lg mb-3">Campañas</h2>
          {!canCreateCampaign ? (
            <Card className="p-8 text-center space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {isLegacy
                  ? 'Configura al menos un valor en cada dimensión antes de crear una campaña.'
                  : 'Configura el framework antes de crear una campaña.'}
              </p>
              <Button variant="outline" onClick={() => setBuilderOpen(true)} className="gap-2 mt-2">
                <Settings className="h-4 w-4" /> Configurar framework
              </Button>
            </Card>
          ) : !campaigns || campaigns.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No hay campañas todavía.</p>
              {canManage && (
                <Button onClick={() => setCampaignOpen(true)} className="gap-2 mt-2">
                  <Plus className="h-4 w-4" /> Crear primera campaña
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  c={c}
                  totalVariants={totalVariants}
                  onOpen={() => navigate(`/ad-frameworks/${id}/campaigns/${c.id}`)}
                  onDelete={canManage ? () => setToDelete(c) : undefined}
                  onDuplicate={canManage ? () => { setToDuplicate(c); setDupName(`${c.name} (copia)`); } : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FrameworkBuilder framework={framework} open={builderOpen} onOpenChange={setBuilderOpen} />

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva campaña</DialogTitle>
            <DialogDescription>
              {isLegacy
                ? `Se crearán automáticamente ${totalVariants} variantes (${angles.length} ángulos × ${formats.length} formatos × ${hooks.length} hooks).`
                : 'Crea una nueva campaña usando este framework. Las variantes se añaden manualmente desde el canvas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre</Label>
              <Input id="c-name" value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Ej: Lanzamiento Q2 — The Mind Coach" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Descripción (opcional)</Label>
              <Textarea id="c-desc" value={campDesc} onChange={(e) => setCampDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCampaign} disabled={!campName.trim() || createCampaign.isPending}>
              {createCampaign.isPending ? 'Creando...' : 'Crear campaña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicar campaña */}
      <Dialog open={!!toDuplicate} onOpenChange={(o) => { if (!o) { setToDuplicate(null); setDupName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar campaña</DialogTitle>
            <DialogDescription>
              Crea una nueva campaña con la misma estructura que "{toDuplicate?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dup-name">Nombre nuevo</Label>
              <Input id="dup-name" value={dupName} onChange={(e) => setDupName(e.target.value)} autoFocus />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={dupCopyContent} onCheckedChange={(v) => setDupCopyContent(!!v)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Copiar contenido de variantes</p>
                <p className="text-xs text-muted-foreground">Hooks, copy, scripts, slides, CTAs y assets se copiarán a la nueva campaña.</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDuplicate(null)}>Cancelar</Button>
            <Button onClick={handleDuplicate} disabled={!dupName.trim() || duplicateCampaign.isPending}>
              {duplicateCampaign.isPending ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar campaña */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará "{toDelete?.name}" junto con todas sus variantes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete && id) deleteCampaign.mutate({ id: toDelete.id, framework_id: id });
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

const CampaignCard = ({
  c, totalVariants, onOpen, onDelete, onDuplicate,
}: {
  c: AdCampaignWithStats;
  totalVariants: number;
  onOpen: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}) => {
  const denom = totalVariants > 0 ? totalVariants : c.variant_count;
  const completion = denom > 0 ? Math.round((c.ready_count / denom) * 100) : 0;

  // Lightweight query for due-date health pills (only the fields needed)
  const { data: dueInfo } = useQuery({
    queryKey: ['campaign-due-pills', c.id],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_variants')
        .select('due_date, status')
        .eq('campaign_id', c.id)
        .not('due_date', 'is', null);
      const today = new Date();
      let overdue = 0;
      let soon = 0;
      let nextDate: Date | null = null;
      (data ?? []).forEach((v: any) => {
        if (!v.due_date) return;
        const d = parseISO(v.due_date);
        const diff = differenceInCalendarDays(d, today);
        const done = v.status === 'published';
        if (done) return;
        if (diff < 0) overdue++;
        else if (diff <= 2) soon++;
        if (!nextDate || d < nextDate) nextDate = d;
      });
      return { overdue, soon, nextDate };
    },
  });

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{c.name}</h3>
          {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
        </div>
        {(onDelete || onDuplicate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                  <CopyIcon className="h-4 w-4 mr-2" /> Duplicar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Pills de alerta */}
      {(dueInfo && (dueInfo.overdue > 0 || dueInfo.soon > 0 || dueInfo.nextDate)) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {dueInfo.overdue > 0 && (
            <Badge className="text-[10px] gap-1 bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-300 hover:bg-red-100">
              <AlertCircle className="h-3 w-3" /> {dueInfo.overdue} vencida{dueInfo.overdue === 1 ? '' : 's'}
            </Badge>
          )}
          {dueInfo.soon > 0 && (
            <Badge className="text-[10px] gap-1 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 hover:bg-amber-100">
              <Clock className="h-3 w-3" /> {dueInfo.soon} ≤2d
            </Badge>
          )}
          {dueInfo.nextDate && dueInfo.overdue === 0 && dueInfo.soon === 0 && (
            <span className="text-[10px] text-muted-foreground">
              Próxima: {formatDate(dueInfo.nextDate, "d MMM", { locale: es })}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
        <span>{c.variant_count} variantes</span>
        <span>·</span>
        <span className="text-emerald-600 dark:text-emerald-400">{c.ready_count} listas</span>
        <span>·</span>
        <span>{c.in_progress_count} en progreso</span>
        <span>·</span>
        <span>{c.draft_count} borradores</span>
      </div>
      <Progress value={completion} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground mt-1.5">{completion}% completada</p>
    </Card>
  );
};

export default AdFrameworkDetail;
