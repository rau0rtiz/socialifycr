import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
import { AdSalesRanking } from '@/components/dashboard/AdSalesRanking';
import { SetterTracker } from '@/components/ventas/SetterTracker';
import { SalesGoalBar } from '@/components/ventas/SalesGoalBar';
import { SalesByProductChart } from '@/components/ventas/SalesByProductChart';
import { ClosureRateWidget } from '@/components/ventas/ClosureRateWidget';

import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useCampaigns } from '@/hooks/use-ads-data';
import { useClientFeatures } from '@/hooks/use-client-features';
import { useSetterAppointments, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { SalePrefill } from '@/components/dashboard/RegisterSaleDialog';

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

  // Get all-time sales for the goal bar (current year)
  const { sales: allSales, summary } = useSalesTracking(clientId);

  // Prefill state for converting setter lead → sale
  const [salePrefill, setSalePrefill] = useState<SalePrefill | null>(null);
  const [showSaleFromSetter, setShowSaleFromSetter] = useState(false);
  const salesRef = useRef<HTMLDivElement>(null);

  const { appointments, updateAppointment } = useSetterAppointments(clientId, 'last_30d');

  const handleConvertToSale = (appointment: SetterAppointment) => {
    const prefill: SalePrefill = {
      customer_name: appointment.lead_name,
      product: (appointment as any).product || undefined,
      appointmentId: appointment.id,
    };
    if (appointment.ad_id) {
      prefill.source = 'ad';
      prefill.ad_id = appointment.ad_id;
      prefill.ad_name = appointment.ad_name || undefined;
      prefill.ad_campaign_id = appointment.ad_campaign_id || undefined;
      prefill.ad_campaign_name = appointment.ad_campaign_name || undefined;
    }
    setSalePrefill(prefill);
    setShowSaleFromSetter(true);
    setTimeout(() => {
      salesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaleRegistered = async (appointmentId?: string) => {
    if (appointmentId) {
      try {
        await updateAppointment.mutateAsync({ id: appointmentId, status: 'sold' } as any);
      } catch {
        // silent
      }
    }
    setSalePrefill(null);
    setShowSaleFromSetter(false);
  };

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

        {/* Sales Goal Bar */}
        <SalesGoalBar
          clientId={selectedClient.id}
          currentSalesUSD={summary.totalUSD}
          currentSalesCRC={summary.totalCRC}
          primaryColor={selectedClient.primary_color || undefined}
          accentColor={selectedClient.accent_color || undefined}
        />

        {/* Ad ranking up top */}
        <AdSalesRanking
          clientId={selectedClient.id}
          hasAdAccount={hasAdAccount}
        />

        {/* Setter pipeline (lead → sale flow) */}
        {flags.setter_tracker && (
          <SetterTracker
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
            onConvertToSale={handleConvertToSale}
          />
        )}

        {/* Sales tracking */}
        <div ref={salesRef}>
          <SalesTrackingSection
            clientId={selectedClient.id}
            campaigns={campaigns}
            adSpend={totalAdSpend}
            adCurrency={adCurrency}
            hasAdAccount={hasAdAccount}
            salePrefill={salePrefill}
            showSaleDialog={showSaleFromSetter}
            onSaleFromSetter={handleSaleRegistered}
          />
        </div>

        {/* Sales by product pie chart */}
        <SalesByProductChart sales={allSales} />
      </div>
    </DashboardLayout>
  );
};

export default Ventas;
