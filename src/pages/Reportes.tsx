import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { GammaReportGenerator } from '@/components/reports/GammaReportGenerator';
import { useBrand } from '@/contexts/BrandContext';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { TrendingUp } from 'lucide-react';

const Reportes = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id || null;
  const { data: connection } = useMetaConnection(clientId);
  const hasAdAccount = !!connection?.ad_account_id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Visual Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/10">
          <div className="absolute top-3 right-4 opacity-10">
            <TrendingUp className="h-24 w-24 text-primary" />
          </div>
          <div className="relative">
            <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground mt-1">
              Genera presentaciones y documentos profesionales con Gamma
            </p>
          </div>
        </div>

        {!clientId ? (
          <div className="text-center py-12 text-muted-foreground">
            Selecciona un cliente para generar reportes
          </div>
        ) : (
          <GammaReportGenerator clientId={clientId} hasAdAccount={hasAdAccount} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reportes;
