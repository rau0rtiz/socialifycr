import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CampaignsDrilldown } from '@/components/dashboard/CampaignsDrilldown';
import { AIReportGenerator } from '@/components/reports/AIReportGenerator';
import { useBrand } from '@/contexts/BrandContext';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Sparkles } from 'lucide-react';

const Reports = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id || null;
  const { data: connection } = useMetaConnection(clientId);
  const hasAdAccount = !!connection?.ad_account_id;
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campañas y Reportes</h1>
          <p className="text-muted-foreground">Visualiza tus campañas y genera reportes personalizados con IA</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Campañas
            </TabsTrigger>
            <TabsTrigger value="ai-reports" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Reportes IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignsDrilldown clientId={clientId} hasAdAccount={hasAdAccount} />
          </TabsContent>

          <TabsContent value="ai-reports" className="mt-6">
            <AIReportGenerator clientId={clientId} hasAdAccount={hasAdAccount} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
