import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { Image, Video, Layers, Clock, Eye, Heart, Play, Film, LayoutGrid, ImageIcon, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ContentGridProps {
  data: ContentPost[];
  isLoading?: boolean;
  isLiveData?: boolean;
  onRefresh?: () => void;
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

const networkColors: Record<string, string> = {
  instagram: 'text-pink-500',
  facebook: 'text-blue-500',
  tiktok: 'text-foreground',
  linkedin: 'text-sky-600',
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ContentSkeleton = () => (
  <div className="group relative rounded-lg border border-border bg-muted/30 p-2 md:p-4">
    <Skeleton className="aspect-square rounded-md mb-2 md:mb-3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
);

export const ContentGrid = ({ data, isLoading, isLiveData, onRefresh }: ContentGridProps) => {
  // Sort by date (most recent first)
  const sortedData = [...data].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ContentSkeleton key={i} />)
          ) : (
            sortedData.map((post) => {
              const typeInfo = typeConfig[post.type] || typeConfig.image;
              const TypeIcon = typeInfo.icon;
              
              return (
                <a 
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-lg border border-border bg-muted/30 p-2 md:p-4 hover:shadow-md transition-all cursor-pointer block"
                >
                  {/* Type Tag */}
                  <div className="absolute top-3 md:top-5 left-3 md:left-5 z-10">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 gap-1 backdrop-blur-sm",
                        typeInfo.class
                      )}
                    >
                      <TypeIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="hidden sm:inline">{typeInfo.label}</span>
                    </Badge>
                  </div>

                  {/* Thumbnail */}
                  <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-2 md:mb-3 overflow-hidden">
                    {post.thumbnailUrl || post.thumbnail ? (
                      <img 
                        src={post.thumbnailUrl || post.thumbnail} 
                        alt={post.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <TypeIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Content info */}
                  <div className="space-y-1 md:space-y-2">
                    <p className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                      {post.title}
                    </p>
                    
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("text-[10px] md:text-xs font-medium capitalize", networkColors[post.network])}>
                        {post.network}
                      </span>
                      <Badge variant="secondary" className={cn("text-[10px] md:text-xs px-1 md:px-2", statusConfig[post.status].class)}>
                        <span className="hidden sm:inline">{statusConfig[post.status].label}</span>
                        <span className="sm:hidden">{statusConfig[post.status].label.slice(0, 3)}</span>
                      </Badge>
                    </div>
                    
                    {/* Metrics Row */}
                    <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground pt-1 border-t border-border/50">
                      {/* Views (for video/reel) */}
                      {post.views !== undefined && post.views !== null && (
                        <div className="flex items-center gap-0.5">
                          <Eye className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span>{formatNumber(post.views)}</span>
                        </div>
                      )}
                      
                      {/* Likes */}
                      {post.likes !== undefined && post.likes !== null ? (
                        <div className="flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span>{formatNumber(post.likes)}</span>
                        </div>
                      ) : post.engagement > 0 && (
                        <div className="flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span>{formatNumber(post.engagement)}</span>
                        </div>
                      )}
                      
                      {/* Avg View Duration (Reels only) */}
                      {post.avgViewDuration !== undefined && post.avgViewDuration !== null && post.avgViewDuration > 0 && (
                        <div className="flex items-center gap-0.5 hidden sm:flex">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span>{formatDuration(post.avgViewDuration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
