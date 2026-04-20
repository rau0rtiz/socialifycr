import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Heavy widgets — code-split to shrink initial bundle
const CampaignsDrilldown = lazy(() => import('@/components/dashboard/CampaignsDrilldown').then(m => ({ default: m.CampaignsDrilldown })));
const AdvancedFunnelModule = lazy(() => import('@/components/dashboard/AdvancedFunnelModule').then(m => ({ default: m.AdvancedFunnelModule })));
import { useBrand } from '@/contexts/BrandContext';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useUserRole } from '@/hooks/use-user-role';
import { useClientFeatures } from '@/hooks/use-client-features';

import { Button } from '@/components/ui/button';
import { Building2, Plus, RefreshCw, X, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const previewClientId = searchParams.get('preview');
  const isPreviewMode = !!previewClientId;

  const { selectedClient, clientBrands, clients, clientsLoading, setSelectedClient } = useBrand();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isAgency, isClient, clientAccess, loading: roleLoading } = useUserRole();
  const { flags } = useClientFeatures(selectedClient?.id ?? null);

  // In preview mode, respect feature flags like a client would
  const shouldRespectFlags = isPreviewMode || isClient;

  // Handle preview mode - select the client from URL param
  useEffect(() => {
    if (previewClientId && clients.length > 0) {
      const previewClient = clients.find(c => c.id === previewClientId);
      if (previewClient && (!selectedClient || selectedClient.id !== previewClientId)) {
        setSelectedClient(previewClient);
      }
    }
  }, [previewClientId, clients, selectedClient, setSelectedClient]);

  // Auto-select client for client users based on their access
  useEffect(() => {
    if (!roleLoading && isClient && clientAccess.length > 0 && clients.length > 0) {
      const assignedClientId = clientAccess[0].clientId;
      const assignedClient = clients.find(c => c.id === assignedClientId);
      if (assignedClient && (!selectedClient || selectedClient.id !== assignedClientId)) {
        setSelectedClient(assignedClient);
      }
    }
  }, [isClient, clientAccess, clients, selectedClient, setSelectedClient, roleLoading]);

  const clientId = selectedClient?.id || null;

  const { data: metaConnection, refetch: refetchConnection } = useMetaConnection(clientId);

  // Refresh dashboard data
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await refetchConnection();
    setIsRefreshing(false);
  }, [refetchConnection]);

  const hasAdAccount = !!metaConnection?.ad_account_id;

  const showFunnel = !shouldRespectFlags || flags.funnel;
  const showCampaigns = !shouldRespectFlags || flags.campaigns;

  if (clientsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (clients.length === 0 || !selectedClient) {
    if (isClient && clientAccess.length === 0) {
      return (
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>Sin acceso asignado</CardTitle>
                <CardDescription>
                  No tienes acceso a ningún cliente. Contacta a tu agencia para obtener acceso.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </DashboardLayout>
      );
    }

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
            {clients.length === 0 && isAgency && (
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

  const brandStyle = {
    '--client-primary': primaryColor,
    '--client-accent': accentColor,
    '--primary': primaryColor,
    '--accent': accentColor,
  } as React.CSSProperties;

  const handleExitPreview = () => {
    navigate('/');
  };

  return (
    <DashboardLayout style={brandStyle}>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="mb-4 p-3 rounded-lg border flex items-center justify-between" style={{ backgroundColor: `hsl(${accentColor} / 0.1)`, borderColor: `hsl(${accentColor} / 0.3)` }}>
          <div className="flex items-center gap-2">
            <Badge variant="outline" style={{ borderColor: `hsl(${accentColor})`, color: `hsl(${accentColor})` }}>
              <Eye className="h-3 w-3 mr-1" />
              Modo Vista Previa
            </Badge>
            <span className="text-sm text-muted-foreground">
              Viendo como lo ve <strong>{selectedClient.name}</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExitPreview} className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
      )}

      {/* Client Header */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-3 md:mb-6">
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
          </div>
        </div>
      </div>

      {/* Advanced Funnel Analytics */}
      {showFunnel && (
        <div className="mb-3 md:mb-6">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
            <AdvancedFunnelModule clientId={selectedClient.id} hasAdAccount={hasAdAccount} />
          </Suspense>
        </div>
      )}

      {/* Campaigns Drilldown */}
      {showCampaigns && (
        <div className="mb-3 md:mb-6">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
            <CampaignsDrilldown clientId={selectedClient.id} hasAdAccount={hasAdAccount} />
          </Suspense>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
