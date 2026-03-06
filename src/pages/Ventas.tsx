import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
import { AdSalesRanking } from '@/components/dashboard/AdSalesRanking';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useCampaigns, useAds } from '@/hooks/use-ads-data';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { useMemo } from 'react';

const Ventas = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const { isClient, clientAccess, loading: roleLoading } = useUserRole();
  
  const clientId = selectedClient?.id || null;
  const { data: metaConnection } = useMetaConnection(clientId);
  const hasAdAccount = !!metaConnection?.ad_account_id;

  const { data: campaignsResult } = useCampaigns(clientId, hasAdAccount, 'last_30d');
  const campaigns = campaignsResult?.campaigns || [];
  const adCurrency = campaignsResult?.currency || 'USD';
  const totalAdSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  // Get all sales for ranking (current month)
  const { sales } = useSalesTracking(clientId);

  // We need all ads across all campaigns for the ranking thumbnails/spend
  // Collect unique ad IDs from sales that are linked to ads
  const linkedAdIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sale of sales) {
      if (sale.ad_id) ids.add(sale.ad_id);
    }
    return ids;
  }, [sales]);

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
        <SalesTrackingSection
          clientId={selectedClient.id}
          campaigns={campaigns}
          adSpend={totalAdSpend}
          adCurrency={adCurrency}
          hasAdAccount={hasAdAccount}
        />
        <AdSalesRanking
          sales={sales}
          currency={adCurrency}
        />
      </div>
    </DashboardLayout>
  );
};

export default Ventas;
