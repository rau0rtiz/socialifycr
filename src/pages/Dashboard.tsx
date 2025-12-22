import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SocialFollowersSection } from '@/components/dashboard/SocialFollowersSection';
import { InstagramTopPosts } from '@/components/dashboard/InstagramTopPosts';
import { YouTubeTopVideos } from '@/components/dashboard/YouTubeTopVideos';
import { VideoIdeasSection } from '@/components/dashboard/VideoIdeasSection';
import { CampaignsDrilldown } from '@/components/dashboard/CampaignsDrilldown';
import { FunnelModule } from '@/components/dashboard/FunnelModule';
import { ContentGrid } from '@/components/dashboard/ContentGrid';
import { ContentDetailModal } from '@/components/dashboard/ContentDetailModal';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { useBrand } from '@/contexts/BrandContext';
import { useContentData } from '@/hooks/use-content-data';
import { useContentMetadata } from '@/hooks/use-content-metadata';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useVideoIdeas } from '@/hooks/use-video-ideas';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useUserRole } from '@/hooks/use-user-role';
import { useYouTubeVideos } from '@/hooks/use-youtube-videos';
import { ContentPost } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Download, Share2, Building2, Plus, RefreshCw, X, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const previewClientId = searchParams.get('preview');
  const isPreviewMode = !!previewClientId;
  
  const { selectedClient, clientBrands, clients, clientsLoading, setSelectedClient } = useBrand();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const { isAgency, isClient, clientAccess, loading: roleLoading } = useUserRole();

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

  // All hooks must be called before any conditional returns
  const clientId = selectedClient?.id || null;

  const {
    platforms: socialPlatforms,
    isLoading: socialLoading,
    isLiveData: socialIsLive,
    refetch: refetchSocial,
  } = useSocialFollowers(clientId);

  const {
    ideas: videoIdeas,
    isLoading: ideasLoading,
    addIdea,
    updateIdea,
    deleteIdea,
    refetch: refetchIdeas,
  } = useVideoIdeas(clientId);

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

  const {
    videos: youtubeVideos,
    isLoading: youtubeLoading,
    isConnected: youtubeConnected,
    refetch: refetchYouTube,
  } = useYouTubeVideos(clientId);
  // Refresh all dashboard data
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchSocial(),
      refetchContent(),
      refetchConnection(),
      refetchMetadata(),
      refetchIdeas(),
      refetchYouTube(),
    ]);
    setIsRefreshing(false);
  }, [refetchSocial, refetchContent, refetchConnection, refetchMetadata, refetchIdeas, refetchYouTube]);

  // Derived values (not hooks)
  const hasAdAccount = !!metaConnection?.ad_account_id;
  const hasMetaConnection = !!metaConnection;

  // Show loading state while clients are being fetched or role is loading
  if (clientsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Show empty state if no clients or no selected client
  if (clients.length === 0 || !selectedClient) {
    // For client users without access, show a different message
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

  // Apply client brand colors as CSS custom properties
  const brandStyle = {
    '--client-primary': primaryColor,
    '--client-accent': accentColor,
    '--primary': primaryColor,
    '--accent': accentColor,
  } as React.CSSProperties;

  const handleExitPreview = () => {
    navigate('/clientes');
  };

  return (
    <DashboardLayout style={brandStyle}>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="mb-4 p-3 rounded-lg border flex items-center justify-between" style={{ backgroundColor: `hsl(${accentColor} / 0.1)`, borderColor: `hsl(${accentColor} / 0.3)` }}>
          <div className="flex items-center gap-2">
            <Badge variant="outline" style={{ borderColor: `hsl(${accentColor})`, color: `hsl(${accentColor})` }}>
              Modo Vista Previa
            </Badge>
            <span className="text-sm text-muted-foreground">
              Viendo el dashboard como lo ve el cliente
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExitPreview}>
            <X className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
      )}

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
            {/* Ver Dashboard button - only for agency when not in preview mode */}
            {isAgency && !isPreviewMode && (
              <Button
                variant="default"
                size="sm"
                className="text-xs md:text-sm h-8"
                onClick={() => navigate(`/?preview=${selectedClient.id}`)}
              >
                <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Ver Dashboard</span>
                <span className="sm:hidden">Ver</span>
              </Button>
            )}
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
            {/* Only show export/share buttons for agency users */}
            {isAgency && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Social Followers - Full Width */}
      {(socialLoading || socialPlatforms.length > 0) && (
        <div className="mb-4 md:mb-6">
          <SocialFollowersSection
            platforms={socialPlatforms}
            isLoading={socialLoading}
            isLiveData={socialIsLive}
          />
        </div>
      )}

      {/* Top Posts - Instagram */}
      {(contentLoading || content.length > 0 || hasMetaConnection) && (
        <div className="mb-4 md:mb-6">
          <InstagramTopPosts
            content={content}
            isLoading={contentLoading}
            isLiveData={contentIsLive}
            isConnected={hasMetaConnection}
            onPostClick={setSelectedPost}
          />
        </div>
      )}

      {/* Top Videos - YouTube */}
      {(youtubeLoading || youtubeConnected) && (
        <div className="mb-4 md:mb-6">
          <YouTubeTopVideos
            videos={youtubeVideos}
            isLoading={youtubeLoading}
            isConnected={youtubeConnected}
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

      {/* AI Insights Panel */}
      <div className="mb-4 md:mb-6">
        <AIInsightsPanel
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          industry={selectedClient.industry || 'general'}
          content={content}
          hasAdAccount={hasAdAccount}
          aiContext={selectedClient.ai_context}
          onEditContext={() => navigate('/clientes')}
          onAddVideoIdea={addIdea}
        />
      </div>

      {/* Video Ideas Section */}
      <div className="mb-4 md:mb-6">
        <VideoIdeasSection
          ideas={videoIdeas}
          isLoading={ideasLoading}
          tags={tags}
          models={models}
          onAddIdea={addIdea}
          onUpdateIdea={updateIdea}
          onDeleteIdea={deleteIdea}
          clientId={selectedClient.id}
        />
      </div>

      {/* Funnel Module */}
      <div className="mb-4 md:mb-6">
        <FunnelModule clientId={selectedClient.id} hasAdAccount={hasAdAccount} />
      </div>

      {/* Campaigns Drilldown */}
      <div className="mb-4 md:mb-6">
        <CampaignsDrilldown clientId={selectedClient.id} hasAdAccount={hasAdAccount} />
      </div>

      {/* Content Detail Modal for Top Posts */}
      <ContentDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        tags={tags}
        models={models}
        metadata={selectedPost ? metadata[selectedPost.id] : undefined}
        onCreateTag={createTag}
        onCreateModel={createModel}
        onUpdateMetadata={updateMetadata}
        onCapture48hMetrics={capture48hMetrics}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
