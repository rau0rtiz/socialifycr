import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Plus, Layers, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';

const PRIMARY_FRAMEWORK = 'MASTERCLASS';

const MindCoachFrameworks = () => {
  const navigate = useNavigate();
  const { selectedClient } = useBrand();
  const { isAgency } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ['mindcoach-frameworks', selectedClient?.id],
    enabled: !!selectedClient?.id,
    queryFn: async () => {
      const { data: frameworks } = await supabase
        .from('ad_frameworks')
        .select('id, name, description, created_at')
        .order('created_at');

      const ids = (frameworks ?? []).map((f: any) => f.id);
      if (ids.length === 0) return { frameworks: [], campaignCounts: {} as Record<string, number> };

      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('id, framework_id')
        .in('framework_id', ids)
        .eq('client_id', selectedClient!.id);

      const campaignCounts: Record<string, number> = {};
      (campaigns ?? []).forEach((c: any) => {
        campaignCounts[c.framework_id] = (campaignCounts[c.framework_id] || 0) + 1;
      });

      // sort: MASTERCLASS first, then the rest
      const sorted = [...(frameworks ?? [])].sort((a: any, b: any) => {
        if (a.name === PRIMARY_FRAMEWORK) return -1;
        if (b.name === PRIMARY_FRAMEWORK) return 1;
        return 0;
      });

      return { frameworks: sorted, campaignCounts };
    },
  });

  const frameworks = data?.frameworks ?? [];
  const campaignCounts = data?.campaignCounts ?? {};

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
              Frameworks de contenido y pauta para impulsar las distintas iniciativas. Cada framework define ángulos, formatos y hooks reutilizables.
            </p>
          </div>
          {isAgency && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/ad-frameworks')}
            >
              <Plus className="h-4 w-4" /> Gestionar frameworks
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Cargando...</div>
        ) : frameworks.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold">Aún no hay frameworks</h3>
            <p className="text-sm text-muted-foreground">
              Configura el primer framework desde la sección de gestión.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frameworks.map((fw: any, idx: number) => {
              const isPrimary = fw.name === PRIMARY_FRAMEWORK;
              const count = campaignCounts[fw.id] || 0;
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
    </DashboardLayout>
  );
};

export default MindCoachFrameworks;
