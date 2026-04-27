import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Plus, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const FRAMEWORK_NAME = 'MASTERCLASS';

const MindCoachMasterclass = () => {
  const navigate = useNavigate();
  const { selectedClient } = useBrand();
  const { isAgency } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ['masterclass-framework', selectedClient?.id],
    enabled: !!selectedClient?.id,
    queryFn: async () => {
      const { data: fw } = await supabase
        .from('ad_frameworks')
        .select('id, name, description')
        .eq('name', FRAMEWORK_NAME)
        .maybeSingle();
      if (!fw) return { framework: null, dimensions: [], campaigns: [] };

      const [{ data: dims }, { data: campaigns }] = await Promise.all([
        supabase
          .from('ad_framework_dimensions')
          .select('*')
          .eq('framework_id', fw.id)
          .order('position'),
        supabase
          .from('ad_campaigns')
          .select('*')
          .eq('framework_id', fw.id)
          .eq('client_id', selectedClient!.id)
          .order('created_at', { ascending: false }),
      ]);

      return { framework: fw, dimensions: dims ?? [], campaigns: campaigns ?? [] };
    },
  });

  const framework = data?.framework;
  const dimensions = data?.dimensions ?? [];
  const campaigns = data?.campaigns ?? [];

  const angles = dimensions.filter((d: any) => d.dimension_type === 'angle');
  const formats = dimensions.filter((d: any) => d.dimension_type === 'format');
  const hooks = dimensions.filter((d: any) => d.dimension_type === 'hook');

  const openCampaign = (campaignId: string) => {
    if (!framework) return;
    navigate(`/ad-frameworks/${framework.id}/campaigns/${campaignId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              MASTERCLASS
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Framework de contenido y pauta para impulsar la masterclass. Combina 4 formatos con 3 ángulos psicológicos (Dolor, Transformación, Autoridad).
            </p>
          </div>
          {isAgency && framework && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/ad-frameworks/${framework.id}`)}
            >
              <Layers className="h-4 w-4" /> Editar framework
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Cargando...</div>
        ) : !framework ? (
          <Card className="p-12 text-center space-y-3">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold">Framework no disponible</h3>
            <p className="text-sm text-muted-foreground">
              El framework MASTERCLASS aún no ha sido configurado. Contacta al equipo.
            </p>
          </Card>
        ) : (
          <>
            {/* Estructura del framework */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DimensionCard title="Ángulos psicológicos" items={angles} />
              <DimensionCard title="Formatos" items={formats} />
              <DimensionCard title="Hooks" items={hooks} />
            </div>

            {/* Campañas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Campañas activas</h2>
                {isAgency && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate(`/ad-frameworks/${framework.id}`)}
                  >
                    <Plus className="h-4 w-4" /> Nueva campaña
                  </Button>
                )}
              </div>

              {campaigns.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Aún no hay campañas MASTERCLASS asignadas a este cliente.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {campaigns.map((c: any) => (
                    <Card
                      key={c.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => openCampaign(c.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{c.name}</h3>
                            <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                              {c.status}
                            </Badge>
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Actualizada {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const DimensionCard = ({ title, items }: { title: string; items: any[] }) => (
  <Card className="p-4">
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h3>
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: item.color || 'hsl(var(--muted))' }}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium">{item.label}</div>
            {item.description && (
              <div className="text-xs text-muted-foreground">{item.description}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  </Card>
);

export default MindCoachMasterclass;
