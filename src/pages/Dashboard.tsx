import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SocialFollowersSection } from '@/components/dashboard/SocialFollowersSection';
import { ReachChart } from '@/components/dashboard/ReachChart';
import { CampaignsDrilldown } from '@/components/dashboard/CampaignsDrilldown';
import { ContentGrid } from '@/components/dashboard/ContentGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { useBrand } from '@/contexts/BrandContext';
import { useContentData } from '@/hooks/use-content-data';
import { useContentMetadata } from '@/hooks/use-content-metadata';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useDailyMetrics } from '@/hooks/use-daily-metrics';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { getClientAlerts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Download, Share2, Building2, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { selectedClient, clientBrands, clients, clientsLoading } = useBrand();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // All hooks must be called before any conditional returns
  const clientId = selectedClient?.id || null;

  const {
    platforms: socialPlatforms,
    isLoading: socialLoading,
    isLiveData: socialIsLive,
    refetch: refetchSocial,
  } = useSocialFollowers(clientId);

  const {
    dailyMetrics,
    isLoading: dailyLoading,
    isLiveData: dailyIsLive,
    source: dailySource,
    refetch: refetchDailyMetrics,
  } = useDailyMetrics(clientId);

  const {
    content,
    isLoading: contentLoading,
    isLiveData: contentIsLive,
    refetch: refetchContent,
  } = useContentData(clientId);

  const {
    tags,
    models,
    metadata,
    createTag,
    createModel,
    updateMetadata,
    capture48hMetrics,
    refetch: refetchMetadata,
  } = useContentMetadata(clientId);

  const { data: metaConnection, refetch: refetchConnection } = useMetaConnection(clientId);

  // Refresh all dashboard data
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchSocial(),
      refetchDailyMetrics(),
      refetchContent(),
      refetchConnection(),
      refetchMetadata(),
    ]);
    setIsRefreshing(false);
  }, [refetchSocial, refetchDailyMetrics, refetchContent, refetchConnection, refetchMetadata]);

  // Derived values (not hooks)
  const hasAdAccount = !!metaConnection?.ad_account_id;
  const alerts = selectedClient ? getClientAlerts(selectedClient.id) : [];

  // Show loading state while clients are being fetched
  if (clientsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando clientes...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Show empty state if no clients or no selected client
  if (clients.length === 0 || !selectedClient) {
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
              <h1 className="text-lg md:text-xl font-semibold text-foreground">
                {selectedClient.name}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">{selectedClient.industry}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs md:text-sm h-8"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
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
      </div>

      {/* Social Followers Section */}
      {(socialLoading || socialPlatforms.length > 0) && (
        <div className="mb-4 md:mb-6">
          <SocialFollowersSection
            platforms={socialPlatforms}
            isLoading={socialLoading}
            isLiveData={socialIsLive}
          />
        </div>
      )}

      {/* Content Grid - 2x3 Grid below Social */}
      <div className="mb-4 md:mb-6">
        <ContentGrid
          data={content}
          isLoading={contentLoading}
          isLiveData={contentIsLive}
          onRefresh={refetchContent}
          tags={tags}
          models={models}
          metadata={metadata}
          onCreateTag={createTag}
          onCreateModel={createModel}
          onUpdateMetadata={updateMetadata}
          onCapture48hMetrics={capture48hMetrics}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <ReachChart
          data={dailyMetrics}
          accentColor={accentColor}
          isLoading={dailyLoading}
          isLiveData={dailyIsLive}
          source={dailySource}
        />
      </div>

      {/* Campaigns Drilldown */}
      <div className="mb-4 md:mb-6">
        <CampaignsDrilldown clientId={selectedClient.id} hasAdAccount={hasAdAccount} />
      </div>

      {/* Alerts */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-3">
          <AlertsPanel data={alerts} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
