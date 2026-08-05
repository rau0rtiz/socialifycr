import { lazy, Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Megaphone, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const AgencyLeadsContent = lazy(() => import('@/components/comunicaciones/AgencyLeadsContent'));

const Loader = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const Funnels = () => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['funnels'] }),
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] }),
      queryClient.invalidateQueries({ queryKey: ['funnel-lead-counts'] }),
    ]);
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Funnels
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Leads por funnel, landing pages y campañas de Meta vinculadas
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>

        <Suspense fallback={<Loader />}>
          <AgencyLeadsContent />
        </Suspense>
      </div>
    </DashboardLayout>
  );
};

export default Funnels;
