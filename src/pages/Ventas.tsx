import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
import { AdSalesRanking } from '@/components/dashboard/AdSalesRanking';
import { SetterTracker } from '@/components/ventas/SetterTracker';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useCampaigns } from '@/hooks/use-ads-data';
import { useClientFeatures } from '@/hooks/use-client-features';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const Ventas = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const { isClient, clientAccess, loading: roleLoading } = useUserRole();
  
  const clientId = selectedClient?.id || null;
  const { data: metaConnection } = useMetaConnection(clientId);
  const hasAdAccount = !!metaConnection?.ad_account_id;
  const { flags } = useClientFeatures(clientId);

  const { data: campaignsResult } = useCampaigns(clientId, hasAdAccount, 'last_30d');
  const campaigns = campaignsResult?.campaigns || [];
  const adCurrency = campaignsResult?.currency || 'USD';
  const totalAdSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  if (clientsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Selecciona un cliente</CardTitle>
              <CardDescription>
                Selecciona un cliente del menú superior para ver sus ventas.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6 space-y-4">
        <h1 className="text-lg md:text-xl font-semibold text-foreground">
          Ventas
        </h1>
        {/* Setter pipeline first (lead → sale flow) */}
        {flags.setter_tracker && (
          <SetterTracker
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
          />
        )}
        {/* Sales tracking */}
        <SalesTrackingSection
          clientId={selectedClient.id}
          campaigns={campaigns}
          adSpend={totalAdSpend}
          adCurrency={adCurrency}
          hasAdAccount={hasAdAccount}
        />
        {/* Ad ranking last */}
        <AdSalesRanking
          clientId={selectedClient.id}
          hasAdAccount={hasAdAccount}
        />
      </div>
    </DashboardLayout>
  );
};

export default Ventas;