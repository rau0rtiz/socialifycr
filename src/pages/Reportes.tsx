import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AIReportGenerator } from '@/components/reports/AIReportGenerator';
import { SavedReportsList } from '@/components/reports/SavedReportsList';
import { MonthlySalesReport } from '@/components/reports/MonthlySalesReport';
import { SocialPerformanceReport } from '@/components/reports/SocialPerformanceReport';
import { useBrand } from '@/contexts/BrandContext';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useUserRole } from '@/hooks/use-user-role';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Users, Sparkles, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { CampaignsDrilldown } from '@/components/dashboard/CampaignsDrilldown';

const Reportes = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id || null;
  const { data: connection } = useMetaConnection(clientId);
  const hasAdAccount = !!connection?.ad_account_id;
  const { isAgency } = useUserRole();

  const [activeTab, setActiveTab] = useState('sales');

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
              Resúmenes de ventas, rendimiento social y reportes personalizados
            </p>
          </div>
        </div>

        {!clientId ? (
          <div className="text-center py-12 text-muted-foreground">
            Selecciona un cliente para ver los reportes
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full max-w-2xl flex-wrap h-auto gap-1">
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Ventas</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Social</span>
              </TabsTrigger>
              {isAgency && (
                <TabsTrigger value="campaigns" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Campañas</span>
                </TabsTrigger>
              )}
              {isAgency && (
                <TabsTrigger value="ai-reports" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Generar con IA</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Guardados</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-6">
              <MonthlySalesReport clientId={clientId} />
            </TabsContent>

            <TabsContent value="social" className="mt-6">
              <SocialPerformanceReport clientId={clientId} />
            </TabsContent>

            {isAgency && (
              <TabsContent value="campaigns" className="mt-6">
                <CampaignsDrilldown clientId={clientId} hasAdAccount={hasAdAccount} />
              </TabsContent>
            )}

            {isAgency && (
              <TabsContent value="ai-reports" className="mt-6">
                <AIReportGenerator clientId={clientId} hasAdAccount={hasAdAccount} />
              </TabsContent>
            )}

            <TabsContent value="saved" className="mt-6">
              <SavedReportsList clientId={clientId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reportes;
