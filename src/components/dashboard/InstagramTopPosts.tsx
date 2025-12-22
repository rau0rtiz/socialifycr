import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { Instagram, Heart, MessageCircle, Play, Film, LayoutGrid, ImageIcon, Wifi, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PodiumSkeleton, PodiumPost, EmptyPodiumSlot, displayOrder } from './TopPostsSection';

interface InstagramTopPostsProps {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  isConnected: boolean;
  onPostClick?: (post: ContentPost) => void;
}

export const InstagramTopPosts = ({
  content,
  isLoading,
  isLiveData,
  isConnected,
  onPostClick,
}: InstagramTopPostsProps) => {
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

  // Don't render if not connected
  if (!isConnected && !isLoading && content.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <Instagram className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-base font-medium">Top Posts Instagram</CardTitle>
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
