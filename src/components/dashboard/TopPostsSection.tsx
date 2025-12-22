import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { Eye, Heart, MessageCircle, Play, Film, LayoutGrid, ImageIcon, Wifi, TrendingUp, Crown, Medal, Award } from 'lucide-react';
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

const PodiumSkeleton = () => (
  <div className="flex items-end justify-center gap-3 h-48">
    <Skeleton className="w-24 h-28 rounded-t-lg" />
    <Skeleton className="w-28 h-36 rounded-t-lg" />
    <Skeleton className="w-24 h-24 rounded-t-lg" />
  </div>
);

const PodiumPost = ({ 
  post, 
  rank, 
  onClick 
}: { 
  post: ContentPost; 
  rank: 1 | 2 | 3; 
  onClick?: (post: ContentPost) => void;
}) => {
  const typeInfo = typeConfig[post.type] || typeConfig.image;
  const TypeIcon = typeInfo.icon;
  const engagement = (post.likes || 0) + (post.comments || 0);

  const podiumConfig = {
    1: {
      height: 'h-36',
      order: 'order-2',
      icon: Crown,
      iconColor: 'text-amber-400',
      bgGradient: 'from-amber-500/20 to-amber-500/5',
      borderColor: 'border-amber-500/30',
      badgeBg: 'bg-amber-500',
    },
    2: {
      height: 'h-28',
      order: 'order-1',
      icon: Medal,
      iconColor: 'text-slate-400',
      bgGradient: 'from-slate-400/20 to-slate-400/5',
      borderColor: 'border-slate-400/30',
      badgeBg: 'bg-slate-400',
    },
    3: {
      height: 'h-24',
      order: 'order-3',
      icon: Award,
      iconColor: 'text-amber-700',
      bgGradient: 'from-amber-700/20 to-amber-700/5',
      borderColor: 'border-amber-700/30',
      badgeBg: 'bg-amber-700',
    },
  };

  const config = podiumConfig[rank];
  const RankIcon = config.icon;

  return (
    <div 
      className={cn(
        "flex flex-col items-center cursor-pointer group flex-1 max-w-[140px]",
        config.order
      )}
      onClick={() => onClick?.(post)}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2 group-hover:ring-2 ring-primary/50 transition-all">
        {post.thumbnailUrl || post.thumbnail ? (
          <img
            src={post.thumbnailUrl || post.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-1 left-1">
          <Badge 
            variant="outline" 
            className={cn("text-[9px] px-1 py-0 gap-0.5 backdrop-blur-sm", typeInfo.class)}
          >
            <TypeIcon className="h-2.5 w-2.5" />
          </Badge>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg", config.badgeBg)}>
            {rank}
          </div>
        </div>
      </div>

      {/* Podium stand */}
      <div 
        className={cn(
          "w-full rounded-t-lg bg-gradient-to-t border-x border-t flex flex-col items-center justify-end pb-2 pt-4",
          config.height,
          config.bgGradient,
          config.borderColor
        )}
      >
        <RankIcon className={cn("h-5 w-5 mb-1", config.iconColor)} />
        <div className="text-center px-1">
          <p className="text-lg font-bold text-foreground">{formatNumber(engagement)}</p>
          <p className="text-[10px] text-muted-foreground">engagement</p>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
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
    </div>
  );
};

export const TopPostsSection = ({
  content,
  isLoading,
  isLiveData,
  onPostClick,
}: TopPostsSectionProps) => {
  // Get top 3 posts from this month sorted by engagement
  const topPosts = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return [...content]
      .filter(post => new Date(post.date) >= startOfMonth)
      .sort((a, b) => {
        const engagementA = (a.likes || 0) + (a.comments || 0) + (a.views || 0);
        const engagementB = (b.likes || 0) + (b.comments || 0) + (b.views || 0);
        return engagementB - engagementA;
      })
      .slice(0, 3);
  }, [content]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">Top Posts del Mes</CardTitle>
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
        {isLoading ? (
          <PodiumSkeleton />
        ) : topPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay posts este mes
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 pt-4 pb-2">
            {topPosts[1] && <PodiumPost post={topPosts[1]} rank={2} onClick={onPostClick} />}
            {topPosts[0] && <PodiumPost post={topPosts[0]} rank={1} onClick={onPostClick} />}
            {topPosts[2] && <PodiumPost post={topPosts[2]} rank={3} onClick={onPostClick} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
