import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ReachChart } from '@/components/dashboard/ReachChart';
import { SocialPerformanceChart } from '@/components/dashboard/SocialPerformanceChart';
import { CampaignsTable } from '@/components/dashboard/CampaignsTable';
import { ContentGrid } from '@/components/dashboard/ContentGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { useBrand } from '@/contexts/BrandContext';
import { 
  getClientKPIs, 
  getClientCampaigns, 
  getClientDailyMetrics, 
  getClientSocialMetrics,
  getClientContent,
  getClientAlerts 
} from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';

const Dashboard = () => {
  const { selectedClient, clientBrands } = useBrand();
  const clientBrand = clientBrands[selectedClient.id];
  const accentColor = clientBrand?.accentColor || selectedClient.accentColor;

  const kpis = getClientKPIs(selectedClient.id);
  const campaigns = getClientCampaigns(selectedClient.id);
  const dailyMetrics = getClientDailyMetrics(selectedClient.id);
  const socialMetrics = getClientSocialMetrics(selectedClient.id);
  const content = getClientContent(selectedClient.id);
  const alerts = getClientAlerts(selectedClient.id);

  return (
    <DashboardLayout>
      {/* Client Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: `hsl(${accentColor})` }}
          >
            {selectedClient.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{selectedClient.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedClient.industry}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} data={kpi} accentColor={accentColor} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ReachChart data={dailyMetrics} accentColor={accentColor} />
        <SocialPerformanceChart data={socialMetrics} />
      </div>

      {/* Campaigns Table */}
      <div className="mb-6">
        <CampaignsTable data={campaigns} />
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContentGrid data={content} />
        </div>
        <AlertsPanel data={alerts} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
