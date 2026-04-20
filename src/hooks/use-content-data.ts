import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContentPost, NetworkType, getClientContent } from '@/data/mockData';
import { usePlatformConnections } from './use-platform-connections';

interface UseContentDataResult {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  error: string | null;
  availablePlatforms: NetworkType[];
  refetch: () => void;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export const useContentData = (clientId: string | null, limit: number = 50, enabled: boolean = true): UseContentDataResult => {
  const { data: connections, isLoading: connectionsLoading } = usePlatformConnections(clientId);

  const metaConnections = (connections || []).filter(c => c.platform === 'meta' && c.instagram_account_id);
  const youtubeConnection = connections?.find(c => c.platform === 'youtube');

  const { data, isLoading: dataLoading, error: queryError, refetch } = useQuery({
    queryKey: ['content-data', clientId, limit, metaConnections.map(c => c.id).join(','), !!youtubeConnection],
    queryFn: async () => {
      const allContent: ContentPost[] = [];
      const activePlatforms: NetworkType[] = [];
      let hasLiveData = false;

      const promises: Promise<void>[] = [];

      // Fetch Instagram content from each Meta connection in parallel
      for (const metaConnection of metaConnections) {
        promises.push(
          supabase.functions.invoke('meta-api', {
            body: { clientId, endpoint: 'instagram-media-with-insights', params: { limit }, connectionId: metaConnection.id }
          }).then(({ data, error: functionError }) => {
            if (!functionError && !data?.error && data?.data) {
              hasLiveData = true;
              if (!activePlatforms.includes('instagram')) activePlatforms.push('instagram');
              const instagramContent: ContentPost[] = (data.data || []).map((item: any) => ({
                id: `${metaConnection.id}:${item.id}`,
                title: item.caption ? item.caption.substring(0, 50) + (item.caption.length > 50 ? '...' : '') : 'Sin descripción',
                caption: item.caption || 'Sin descripción',
                network: 'instagram' as NetworkType,
                platforms: ['instagram'] as NetworkType[],
                type: item.contentType as ContentPost['type'],
                status: 'published' as const,
                engagement: (item.likes || 0) + (item.comments || 0),
                date: item.timestamp,
                thumbnail: item.thumbnailUrl || item.mediaUrl,
                views: item.views,
                likes: item.likes,
                comments: item.comments,
                shares: item.shares,
                saves: item.saves,
                avgViewDuration: item.avgViewDuration,
                thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
                permalink: item.permalink,
                mediaUrl: item.mediaUrl,
                isLiveData: true,
              }));
              allContent.push(...instagramContent);
            }
          }).catch(err => console.warn('Error fetching Instagram content:', err))
        );
      }

      if (youtubeConnection) {
        promises.push(
          supabase.functions.invoke('youtube-api', {
            body: { clientId, endpoint: 'channel-videos', params: { limit } }
          }).then(({ data, error: functionError }) => {
            if (!functionError && !data?.error && data?.videos) {
              hasLiveData = true;
              activePlatforms.push('youtube');
              const youtubeContent: ContentPost[] = (data.videos || []).map((video: any) => {
                const isShort = parseDuration(video.duration) <= 60;
                return {
                  id: `yt_${video.id}`,
                  title: video.title || 'Sin título',
                  caption: video.description || video.title || 'Sin descripción',
                  network: 'youtube' as NetworkType,
                  platforms: ['youtube'] as NetworkType[],
                  type: isShort ? 'reel' as const : 'video' as const,
                  status: 'published' as const,
                  engagement: (video.likeCount || 0) + (video.commentCount || 0),
                  date: video.publishedAt,
                  thumbnail: video.thumbnailUrl,
                  views: video.viewCount,
                  likes: video.likeCount,
                  comments: video.commentCount,
                  shares: undefined,
                  saves: undefined,
                  thumbnailUrl: video.thumbnailUrl,
                  permalink: `https://www.youtube.com/watch?v=${video.id}`,
                  isLiveData: true,
                };
              });
              allContent.push(...youtubeContent);
            }
          }).catch(err => console.warn('Error fetching YouTube content:', err))
        );
      }

      await Promise.all(promises);

      // If no live data, fall back to mock
      if (allContent.length === 0) {
        const mockContent = getClientContent(clientId!);
        return {
          content: mockContent.map(post => ({ ...post, platforms: [post.network] as NetworkType[] })),
          isLiveData: false,
          availablePlatforms: ['instagram', 'facebook', 'tiktok', 'linkedin'] as NetworkType[],
        };
      }

      allContent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        content: allContent,
        isLiveData: hasLiveData,
        availablePlatforms: activePlatforms,
      };
    },
    enabled: !!clientId && !connectionsLoading && enabled,
    staleTime: 3 * 60 * 1000,
  });

  return {
    content: data?.content || [],
    isLoading: connectionsLoading || dataLoading,
    isLiveData: data?.isLiveData || false,
    error: queryError?.message || null,
    availablePlatforms: data?.availablePlatforms || [],
    refetch,
  };
};
