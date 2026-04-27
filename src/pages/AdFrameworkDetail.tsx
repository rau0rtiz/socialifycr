import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Settings, Sparkles, Trash2 } from 'lucide-react';
import { useAdFramework } from '@/hooks/use-ad-frameworks';
import { useAdCampaigns, useCreateAdCampaign, useDeleteAdCampaign, type AdCampaignWithStats } from '@/hooks/use-ad-campaigns';
import { useUserRole } from '@/hooks/use-user-role';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FrameworkBuilder } from '@/components/ad-frameworks/FrameworkBuilder';
import { ReferencesPanel } from '@/components/ad-frameworks/ReferencesPanel';
import { Progress } from '@/components/ui/progress';

const AdFrameworkDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: framework, isLoading } = useAdFramework(id);
  const { data: campaigns } = useAdCampaigns(id);
  const createCampaign = useCreateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();
  const { canManage } = useUserRole();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');

  if (isLoading) return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Cargando...</div></DashboardLayout>;
  if (!framework) return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Framework no encontrado</div></DashboardLayout>;

  const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = framework.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = framework.dimensions.filter((d) => d.dimension_type === 'hook');
  const totalVariants = angles.length * formats.length * hooks.length;

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
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="font-mono text-xs">
                  {angles.length} × {formats.length} × {hooks.length} = {totalVariants} variantes/campaña
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBuilderOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" /> Editar dimensiones
              </Button>
              {canManage && totalVariants > 0 && (
                <Button onClick={() => setCampaignOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva campaña
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dimensiones overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Ángulos', items: angles, hint: 'enfoque del mensaje' },
            { label: 'Formatos', items: formats, hint: 'cómo se presenta' },
            { label: 'Hooks', items: hooks, hint: 'apertura del anuncio' },
          ].map((g) => (
            <Card key={g.label} className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-semibold text-sm">{g.label}</h3>
                <span className="text-xs text-muted-foreground">{g.hint}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Sin {g.label.toLowerCase()}</span>
                ) : g.items.map((d) => (
                  <Badge
                    key={d.id}
                    variant="outline"
                    style={d.color ? { borderColor: d.color, color: d.color } : {}}
                    className="text-xs"
                  >
                    {d.label}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Referencias */}
        {id && <ReferencesPanel frameworkId={id} />}

        {/* Campañas */}
        <div>
          <h2 className="font-semibold text-lg mb-3">Campañas</h2>
          {totalVariants === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Configura al menos un valor en cada dimensión antes de crear una campaña.</p>
              <Button variant="outline" onClick={() => setBuilderOpen(true)} className="gap-2 mt-2">
                <Settings className="h-4 w-4" /> Configurar dimensiones
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
                  onDelete={canManage && id ? () => {
                    if (confirm(`¿Eliminar campaña "${c.name}"?`)) {
                      deleteCampaign.mutate({ id: c.id, framework_id: id });
                    }
                  } : undefined}
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
              Se crearán automáticamente {totalVariants} variantes ({angles.length} ángulos × {formats.length} formatos × {hooks.length} hooks).
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
    </DashboardLayout>
  );
};

const CampaignCard = ({ c, totalVariants, onOpen, onDelete }: { c: AdCampaignWithStats; totalVariants: number; onOpen: () => void; onDelete?: () => void }) => {
  const completion = totalVariants > 0 ? Math.round((c.ready_count / totalVariants) * 100) : 0;
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{c.name}</h3>
          {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
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
