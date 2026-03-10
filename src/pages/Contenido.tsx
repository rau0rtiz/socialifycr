import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { useContentData } from '@/hooks/use-content-data';
import { useContentMetadata } from '@/hooks/use-content-metadata';
import { useCrosspostLinks } from '@/hooks/use-crosspost-links';
import { useVideoIdeas } from '@/hooks/use-video-ideas';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useUserRole } from '@/hooks/use-user-role';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useClientFeatures } from '@/hooks/use-client-features';
import { ContentDetailModal } from '@/components/dashboard/ContentDetailModal';
import { ContentCalendar } from '@/components/dashboard/ContentCalendar';
import { SocialFollowersSection } from '@/components/dashboard/SocialFollowersSection';
import { StoriesSection } from '@/components/dashboard/StoriesSection';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { VideoIdeasSection } from '@/components/dashboard/VideoIdeasSection';
import { CompetitorsPanel } from '@/components/dashboard/CompetitorsPanel';
import { ContentPost, NetworkType } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const platformConfig: Record<NetworkType, { 
  label: string; 
  class: string;
  icon: string;
}> = {
  instagram: { 
    label: 'Instagram', 
    class: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-600 border-pink-500/30',
    icon: '📷'
  },
  youtube: { 
    label: 'YouTube', 
    class: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: '▶️'
  },
  facebook: { 
    label: 'Facebook', 
    class: 'bg-blue-600/10 text-blue-600 border-blue-600/20',
    icon: '👤'
  },
  tiktok: { 
    label: 'TikTok', 
    class: 'bg-slate-900/10 text-slate-700 border-slate-500/20 dark:bg-slate-100/10 dark:text-slate-300',
    icon: '🎵'
  },
  linkedin: { 
    label: 'LinkedIn', 
    class: 'bg-sky-600/10 text-sky-600 border-sky-600/20',
    icon: '💼'
  },
};

const Contenido = () => {
  const { selectedClient, clientBrands } = useBrand();
  const clientId = selectedClient?.id || null;
  
  const {
    content,
    isLoading: contentLoading,
    isLiveData: contentIsLive,
    availablePlatforms,
    refetch: refetchContent,
  } = useContentData(clientId, 500);

  const {
    tags,
    models,
    metadata,
    createTag,
    createModel,
    updateMetadata,
    updateMetadataMultiple,
    capture48hMetrics,
  } = useContentMetadata(clientId);

  const {
    ideas: videoIdeas,
    isLoading: ideasLoading,
    addIdea,
    updateIdea,
    deleteIdea,
  } = useVideoIdeas(clientId);

  const { data: metaConnection } = useMetaConnection(clientId);
  const hasAdAccount = !!metaConnection?.ad_account_id;

  const { isAgency, clientAccess } = useUserRole();

  // Social followers
  const { 
    platforms: socialPlatforms, 
    isLoading: socialLoading, 
    isLiveData: socialIsLive 
  } = useSocialFollowers(clientId);

  // Crosspost links
  const {
    links: crosspostLinks,
    addLink,
    removeLink,
    getLinkedPosts,
  } = useCrosspostLinks(clientId);

  // Modal state
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Build crosspost groups map
  const crosspostGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    
    crosspostLinks.forEach(link => {
      const existingGroupPrimary = groups.get(link.primary_post_id);
      const existingGroupLinked = groups.get(link.linked_post_id);
      
      if (existingGroupPrimary && existingGroupLinked) {
        existingGroupLinked.forEach(id => {
          existingGroupPrimary.add(id);
          groups.set(id, existingGroupPrimary);
        });
      } else if (existingGroupPrimary) {
        existingGroupPrimary.add(link.linked_post_id);
        groups.set(link.linked_post_id, existingGroupPrimary);
      } else if (existingGroupLinked) {
        existingGroupLinked.add(link.primary_post_id);
        groups.set(link.primary_post_id, existingGroupLinked);
      } else {
        const newGroup = new Set([link.primary_post_id, link.linked_post_id]);
        groups.set(link.primary_post_id, newGroup);
        groups.set(link.linked_post_id, newGroup);
      }
    });
    
    return groups;
  }, [crosspostLinks]);

  // Get deduplicated content
  const deduplicatedContent = useMemo(() => {
    const seenGroups = new Set<Set<string>>();
    const result: ContentPost[] = [];
    
    content.forEach(post => {
      const group = crosspostGroups.get(post.id);
      if (group) {
        if (!seenGroups.has(group)) {
          seenGroups.add(group);
          result.push(post);
        }
      } else {
        result.push(post);
      }
    });
    
    return result;
  }, [content, crosspostGroups]);

  const handlePostClick = (post: ContentPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const clientBrand = selectedClient ? clientBrands[selectedClient.id] : null;
  const accentColor = clientBrand?.accentColor || selectedClient?.accent_color || '262 83% 58%';

  const brandStyle = {
    '--client-accent': `hsl(${accentColor})`,
  } as React.CSSProperties;

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Selecciona un cliente para ver su contenido</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout style={brandStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contenido</h1>
            <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
          </div>
          {contentIsLive && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Wifi className="h-2.5 w-2.5" />
              En vivo
            </Badge>
          )}
          {/* Platform badges */}
          <div className="flex gap-1">
            {availablePlatforms.map(platform => (
              <Badge 
                key={platform}
                variant="outline" 
                className={cn("text-[9px] px-1.5", platformConfig[platform]?.class)}
              >
                {platformConfig[platform]?.icon} {platformConfig[platform]?.label}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchContent()}
          disabled={contentLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", contentLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Social Followers Section */}
      <div className="mb-6">
        <SocialFollowersSection 
          platforms={socialPlatforms}
          isLoading={socialLoading}
          isLiveData={socialIsLive}
        />
      </div>

      {/* Stories Section */}
      {selectedClient && (
        <div className="mb-6">
          <StoriesSection clientId={selectedClient.id} />
        </div>
      )}

      {/* Content Calendar */}
      <div className="mb-6">
        <ContentCalendar
          content={deduplicatedContent}
          isLoading={contentLoading}
          availablePlatforms={availablePlatforms}
          onPostClick={handlePostClick}
        />
      </div>

      {/* AI Insights Panel */}
      {selectedClient && (
        <div className="mb-6">
          <AIInsightsPanel
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            industry={selectedClient.industry || 'general'}
            content={content}
            hasAdAccount={hasAdAccount}
            aiContext={selectedClient.ai_context}
            preferredRegion={selectedClient.preferred_region}
            onRegionChange={async (region) => {
              await supabase
                .from('clients')
                .update({ preferred_region: region })
                .eq('id', selectedClient.id);
            }}
            onAddVideoIdea={addIdea}
          />
        </div>
      )}

      {/* Video Ideas Section */}
      {selectedClient && (
        <div className="mb-6">
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
      )}

      {/* Competitors Panel */}
      {selectedClient && (
        <div className="mb-6">
          <CompetitorsPanel
            clientId={selectedClient.id}
            canEdit={isAgency || clientAccess.some(c => c.clientId === selectedClient.id && (c.role === 'editor' || c.role === 'account_manager'))}
          />
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedPost && (
        <ContentDetailModal
          isOpen={isModalOpen}
          post={selectedPost}
          onClose={handleCloseModal}
          tags={tags}
          models={models}
          metadata={metadata[selectedPost.id]}
          onCreateTag={createTag}
          onCreateModel={createModel}
          onUpdateMetadata={updateMetadata}
          onUpdateMetadataMultiple={updateMetadataMultiple}
          onCapture48hMetrics={capture48hMetrics}
          allContent={content}
          linkedPostIds={getLinkedPosts(selectedPost.id)}
          onLinkPost={(linkedPostId) => addLink(selectedPost.id, linkedPostId)}
          onUnlinkPost={removeLink}
          crosspostLinks={crosspostLinks}
        />
      )}
    </DashboardLayout>
  );
};

export default Contenido;
