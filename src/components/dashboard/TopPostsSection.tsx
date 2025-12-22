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

// Podium heights for 5 positions (left to right: 4, 2, 1, 3, 5)
const podiumConfig = {
  1: {
    height: 'h-32',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  2: {
    height: 'h-28',
    bgColor: 'bg-slate-400',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-400/30',
  },
  3: {
    height: 'h-24',
    bgColor: 'bg-amber-700',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-700/30',
  },
  4: {
    height: 'h-20',
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-500/30',
  },
  5: {
    height: 'h-16',
    bgColor: 'bg-slate-600',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-600/30',
  },
};

const PodiumSkeleton = () => (
  <div className="flex items-end justify-center gap-2">
    {[4, 2, 1, 3, 5].map((rank) => (
      <div key={rank} className="flex flex-col items-center flex-1">
        <Skeleton className="w-full aspect-square rounded-lg mb-2" />
        <Skeleton className={cn("w-full rounded-t-lg", podiumConfig[rank as keyof typeof podiumConfig].height)} />
      </div>
    ))}
  </div>
);

const PodiumPost = ({ 
  post, 
  rank, 
  onClick 
}: { 
  post: ContentPost; 
  rank: 1 | 2 | 3 | 4 | 5; 
  onClick?: (post: ContentPost) => void;
}) => {
  const typeInfo = typeConfig[post.type] || typeConfig.image;
  const TypeIcon = typeInfo.icon;
  const engagement = (post.likes || 0) + (post.comments || 0);
  const config = podiumConfig[rank];

  return (
    <div 
      className="flex flex-col items-center cursor-pointer group flex-1 min-w-0"
      onClick={() => onClick?.(post)}
    >
      {/* Rank number at top */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2 shadow-md",
        config.bgColor
      )}>
        {rank}
      </div>

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
            <TypeIcon className="h-6 w-6 text-muted-foreground" />
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
      </div>

      {/* Podium stand */}
      <div 
        className={cn(
          "w-full rounded-t-lg border-x border-t flex flex-col items-center justify-center",
          config.height,
          config.borderColor,
          "bg-gradient-to-t from-muted/50 to-transparent"
        )}
      >
        <p className="text-sm font-bold text-foreground">{formatNumber(engagement)}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Heart className="h-2 w-2" />
            {formatNumber(post.likes || 0)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="h-2 w-2" />
            {formatNumber(post.comments || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

const EmptyPodiumSlot = ({ rank }: { rank: 1 | 2 | 3 | 4 | 5 }) => {
  const config = podiumConfig[rank];
  
  return (
    <div className="flex flex-col items-center flex-1 min-w-0 opacity-40">
      {/* Rank number at top */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2",
        config.bgColor
      )}>
        {rank}
      </div>

      {/* Empty thumbnail */}
      <div className="w-full aspect-square rounded-lg bg-muted/50 mb-2 flex items-center justify-center border border-dashed border-muted-foreground/30">
        <span className="text-xs text-muted-foreground">-</span>
      </div>

      {/* Podium stand */}
      <div 
        className={cn(
          "w-full rounded-t-lg border-x border-t flex items-center justify-center",
          config.height,
          config.borderColor,
          "bg-gradient-to-t from-muted/30 to-transparent"
        )}
      >
        <span className="text-xs text-muted-foreground">-</span>
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
  // Get top 5 posts from this month sorted by engagement
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
      .slice(0, 5);
  }, [content]);

  // Order for display: 4, 2, 1, 3, 5 (podium style left to right)
  const displayOrder = [4, 2, 1, 3, 5] as const;

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
          <div className="flex items-end justify-center gap-2 pt-2 pb-2">
            {displayOrder.map((rank) => {
              const post = topPosts[rank - 1];
              if (post) {
                return <PodiumPost key={post.id} post={post} rank={rank} onClick={onPostClick} />;
              }
              return <EmptyPodiumSlot key={`empty-${rank}`} rank={rank} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
