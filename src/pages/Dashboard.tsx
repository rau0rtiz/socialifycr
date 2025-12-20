import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ReachChart } from '@/components/dashboard/ReachChart';
import { SocialPerformanceChart } from '@/components/dashboard/SocialPerformanceChart';
import { CampaignsTable } from '@/components/dashboard/CampaignsTable';
import { ContentGrid } from '@/components/dashboard/ContentGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
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
import { Download, Share2, Building2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { selectedClient, clientBrands, clients, clientsLoading } = useBrand();

  // Show empty state if no clients or no selected client
  if (!clientsLoading && (clients.length === 0 || !selectedClient)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>
                {clients.length === 0 ? 'Sin clientes' : 'Selecciona un cliente'}
              </CardTitle>
              <CardDescription>
                {clients.length === 0 
                  ? 'Crea tu primer cliente para comenzar a ver su dashboard.'
                  : 'Selecciona un cliente del menú superior para ver su dashboard.'}
              </CardDescription>
            </CardHeader>
            {clients.length === 0 && (
              <CardContent className="text-center">
                <Button asChild>
                  <Link to="/clientes">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Cliente
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const clientBrand = clientBrands[selectedClient.id];
  const primaryColor = clientBrand?.primaryColor || selectedClient.primary_color || '220 70% 50%';
  const accentColor = clientBrand?.accentColor || selectedClient.accent_color || '262 83% 58%';

  const kpis = getClientKPIs(selectedClient.id);
  const campaigns = getClientCampaigns(selectedClient.id);
  const dailyMetrics = getClientDailyMetrics(selectedClient.id);
  const socialMetrics = getClientSocialMetrics(selectedClient.id);
  const content = getClientContent(selectedClient.id);
  const alerts = getClientAlerts(selectedClient.id);

  // Apply client brand colors as CSS custom properties
  const brandStyle = {
    '--client-primary': `hsl(${primaryColor})`,
    '--client-accent': `hsl(${accentColor})`,
  } as React.CSSProperties;

  return (
    <DashboardLayout style={brandStyle}>
      {/* Client Header */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {clientBrand?.logoUrl || selectedClient.logo_url ? (
              <img 
                src={clientBrand?.logoUrl || selectedClient.logo_url || ''} 
                alt={selectedClient.name} 
                className="h-8 w-8 md:h-10 md:w-10 rounded-lg flex-shrink-0 object-contain"
              />
            ) : (
              <div 
                className="h-8 w-8 md:h-10 md:w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm md:text-base"
                style={{ backgroundColor: `hsl(${accentColor})` }}
              >
                {selectedClient.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-foreground">{selectedClient.name}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{selectedClient.industry}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs md:text-sm h-8">
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm h-8">
              <Share2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Compartir</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile date picker */}
        <div className="lg:hidden">
          <DateRangePicker />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} data={kpi} accentColor={accentColor} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <ReachChart data={dailyMetrics} accentColor={accentColor} />
        <SocialPerformanceChart data={socialMetrics} />
      </div>

      {/* Campaigns Table */}
      <div className="mb-4 md:mb-6">
        <CampaignsTable data={campaigns} />
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <ContentGrid data={content} />
        </div>
        <AlertsPanel data={alerts} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
