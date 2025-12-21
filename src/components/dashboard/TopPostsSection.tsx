import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { Eye, Heart, MessageCircle, Play, Film, LayoutGrid, ImageIcon, Wifi, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopPostsSectionProps {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  onPostClick?: (post: ContentPost) => void;
}

const typeConfig: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  class: string;
}> = {
  reel: { icon: Play, class: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  video: { icon: Film, class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  carousel: { icon: LayoutGrid, class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  image: { icon: ImageIcon, class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const PostSkeleton = () => (
  <div className="flex items-center gap-3 p-2">
    <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-5 w-12" />
  </div>
);

export const TopPostsSection = ({
  content,
  isLoading,
  isLiveData,
  onPostClick,
}: TopPostsSectionProps) => {
  // Get top 5 posts from this month sorted by engagement
  const topPosts = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return [...content]
      .filter(post => new Date(post.date) >= startOfMonth)
      .sort((a, b) => {
        // Sort by engagement (likes + comments + views)
        const engagementA = (a.likes || 0) + (a.comments || 0) + (a.views || 0);
        const engagementB = (b.likes || 0) + (b.comments || 0) + (b.views || 0);
        return engagementB - engagementA;
      })
      .slice(0, 5);
  }, [content]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Top Posts del Mes</CardTitle>
          </div>
          {isLiveData && !isLoading && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600"
            >
              <Wifi className="h-2.5 w-2.5" />
              En vivo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
          ) : topPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay posts este mes
            </div>
          ) : (
            topPosts.map((post, index) => {
              const typeInfo = typeConfig[post.type] || typeConfig.image;
              const TypeIcon = typeInfo.icon;
              const engagement = (post.likes || 0) + (post.comments || 0);

              return (
                <div
                  key={post.id}
                  onClick={() => onPostClick?.(post)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
                    index === 0 && "bg-primary/5 border border-primary/10"
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    index === 0 ? "bg-amber-500 text-white" :
                    index === 1 ? "bg-slate-400 text-white" :
                    index === 2 ? "bg-amber-700 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {post.thumbnailUrl || post.thumbnail ? (
                      <img
                        src={post.thumbnailUrl || post.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5">
                      <Badge 
                        variant="outline" 
                        className={cn("text-[8px] px-0.5 py-0 gap-0 backdrop-blur-sm", typeInfo.class)}
                      >
                        <TypeIcon className="h-2 w-2" />
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-1">
                      {post.caption || post.title || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {post.views !== undefined && post.views !== null && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-2.5 w-2.5" />
                          {formatNumber(post.views)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" />
                        {formatNumber(post.likes || 0)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {formatNumber(post.comments || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Engagement score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-foreground">
                      {formatNumber(engagement)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      engagement
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
