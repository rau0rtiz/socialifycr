import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { ContentTag, ContentModel, ContentMetadata } from '@/hooks/use-content-metadata';
import { ContentDetailModal } from './ContentDetailModal';
import { Clock, Eye, Heart, Play, Film, LayoutGrid, ImageIcon, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ContentGridProps {
  data: ContentPost[];
  isLoading?: boolean;
  isLiveData?: boolean;
  onRefresh?: () => void;
  // Metadata props
  tags?: ContentTag[];
  models?: ContentModel[];
  metadata?: Record<string, ContentMetadata>;
  onCreateTag?: (name: string, color: string) => Promise<ContentTag | null>;
  onCreateModel?: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  onUpdateMetadata?: (postId: string, updates: Partial<Pick<ContentMetadata, 'tag_id' | 'model_id'>>) => Promise<void>;
  onCapture48hMetrics?: (postId: string, metrics: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    saves?: number;
  }) => Promise<void>;
}

const typeConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  class: string;
}> = {
  reel: { label: 'Reel', icon: Play, class: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  video: { label: 'Video', icon: Film, class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  carousel: { label: 'Carrusel', icon: LayoutGrid, class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  image: { label: 'Post', icon: ImageIcon, class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  story: { label: 'Historia', icon: Clock, class: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-600' },
  scheduled: { label: 'Programado', class: 'bg-violet-500/10 text-violet-600' },
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const ContentSkeleton = () => (
  <div className="group relative rounded-lg border border-border bg-muted/30 p-2 md:p-3">
    <Skeleton className="aspect-square rounded-md mb-2" />
    <div className="space-y-2">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }
  return { text: text.slice(0, maxLength) + '...', isTruncated: true };
};

export const ContentGrid = ({ 
  data, 
  isLoading, 
  isLiveData, 
  onRefresh,
  tags = [],
  models = [],
  metadata = {},
  onCreateTag,
  onCreateModel,
  onUpdateMetadata,
  onCapture48hMetrics,
}: ContentGridProps) => {
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort by date (most recent first) and limit to 10 posts
  const sortedData = [...data]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const handlePostClick = (post: ContentPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm md:text-base font-medium">Contenido Reciente</CardTitle>
              {isLiveData && (
                <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Wifi className="h-2.5 w-2.5" />
                  En vivo
                </Badge>
              )}
            </div>
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {/* 2x5 Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => <ContentSkeleton key={i} />)
            ) : (
              sortedData.map((post) => {
                const typeInfo = typeConfig[post.type] || typeConfig.image;
                const TypeIcon = typeInfo.icon;
                const postMetadata = metadata[post.id];
                const postTag = postMetadata?.tag || tags.find(t => t.id === postMetadata?.tag_id);
                
                // Get caption for display
                const caption = post.caption || post.title;
                const { text: truncatedCaption, isTruncated } = truncateText(caption, 60);
                
                return (
                  <div 
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="group relative rounded-lg border border-border bg-muted/30 p-2 md:p-3 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                  >
                    {/* Type Tag */}
                    <div className="absolute top-3 md:top-4 left-3 md:left-4 z-10">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 gap-0.5 backdrop-blur-sm",
                          typeInfo.class
                        )}
                      >
                        <TypeIcon className="h-2.5 w-2.5" />
                      </Badge>
                    </div>

                    {/* Content Tag (if assigned) */}
                    {postTag && (
                      <div className="absolute top-3 md:top-4 right-3 md:right-4 z-10">
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0.5 backdrop-blur-sm"
                          style={{
                            backgroundColor: `${postTag.color}20`,
                            color: postTag.color,
                            borderColor: `${postTag.color}40`
                          }}
                        >
                          {postTag.name}
                        </Badge>
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-2 overflow-hidden">
                      {post.thumbnailUrl || post.thumbnail ? (
                        <img 
                          src={post.thumbnailUrl || post.thumbnail} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <TypeIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Content info */}
                    <div className="space-y-1.5">
                      {/* Caption/Description */}
                      <div className="min-h-[2.5rem]">
                        <p className="text-xs text-foreground leading-tight">
                          {truncatedCaption}
                          {isTruncated && (
                            <span className="text-primary ml-1 font-medium">ver más</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Metrics Row */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        {post.views !== undefined && post.views !== null && (
                          <div className="flex items-center gap-0.5">
                            <Eye className="h-2.5 w-2.5" />
                            <span>{formatNumber(post.views)}</span>
                          </div>
                        )}
                        
                        {post.likes !== undefined && post.likes !== null ? (
                          <div className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" />
                            <span>{formatNumber(post.likes)}</span>
                          </div>
                        ) : post.engagement > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" />
                            <span>{formatNumber(post.engagement)}</span>
                          </div>
                        )}

                        {/* Status badge */}
                        <Badge 
                          variant="secondary" 
                          className={cn("text-[9px] px-1 py-0 ml-auto", statusConfig[post.status].class)}
                        >
                          {statusConfig[post.status].label.slice(0, 3)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <ContentDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        tags={tags}
        models={models}
        metadata={selectedPost ? metadata[selectedPost.id] : undefined}
        onCreateTag={onCreateTag || (async () => null)}
        onCreateModel={onCreateModel || (async () => null)}
        onUpdateMetadata={onUpdateMetadata || (async () => {})}
        onCapture48hMetrics={onCapture48hMetrics || (async () => {})}
      />
    </>
  );
};
