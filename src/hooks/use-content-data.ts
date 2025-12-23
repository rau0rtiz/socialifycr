import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentPost, NetworkType, getClientContent } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

interface UseContentDataResult {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  error: string | null;
  availablePlatforms: NetworkType[];
  refetch: () => void;
}

export const useContentData = (clientId: string | null, limit: number = 100): UseContentDataResult => {
  const [content, setContent] = useState<ContentPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<NetworkType[]>([]);
  const { toast } = useToast();

  const fetchContent = useCallback(async () => {
    if (!clientId) {
      setContent([]);
      setAvailablePlatforms([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allContent: ContentPost[] = [];
      const activePlatforms: NetworkType[] = [];
      let hasLiveData = false;

      // Check for active platform connections
      const { data: connections } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

      const metaConnection = connections?.find(c => c.platform === 'meta');
      const youtubeConnection = connections?.find(c => c.platform === 'youtube');

      // Fetch Instagram content if connected
      if (metaConnection) {
        try {
          const { data, error: functionError } = await supabase.functions.invoke('meta-api', {
            body: {
              clientId,
              endpoint: 'instagram-media-with-insights',
              params: { limit }
            }
          });

          if (!functionError && !data.error && data.data) {
            hasLiveData = true;
            activePlatforms.push('instagram');
            
            const instagramContent: ContentPost[] = (data.data || []).map((item: any) => ({
              id: item.id,
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
        } catch (err) {
          console.warn('Error fetching Instagram content:', err);
        }
      }

      // Fetch YouTube content if connected
      if (youtubeConnection) {
        try {
          const { data, error: functionError } = await supabase.functions.invoke('youtube-api', {
            body: {
              clientId,
              endpoint: 'channel-videos',
              params: { limit }
            }
          });

          if (!functionError && !data.error && data.videos) {
            hasLiveData = true;
            activePlatforms.push('youtube');
            
            const youtubeContent: ContentPost[] = (data.videos || []).map((video: any) => {
              // Parse duration to determine if it's a Short
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
        } catch (err) {
          console.warn('Error fetching YouTube content:', err);
        }
      }

      // If no live data, fall back to mock data
      if (allContent.length === 0) {
        const mockContent = getClientContent(clientId);
        const mockWithPlatforms: ContentPost[] = mockContent.map(post => ({
          ...post,
          platforms: [post.network] as NetworkType[],
        }));
        setContent(mockWithPlatforms);
        setIsLiveData(false);
        setAvailablePlatforms(['instagram', 'facebook', 'tiktok', 'linkedin']);
        setIsLoading(false);
        return;
      }

      // Sort all content by date
      allContent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setContent(allContent);
      setIsLiveData(hasLiveData);
      setAvailablePlatforms(activePlatforms);
    } catch (err) {
      console.error('Error fetching content data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching content');
      
      // Fall back to mock data on error
      const mockContent = getClientContent(clientId);
      const mockWithPlatforms: ContentPost[] = mockContent.map(post => ({
        ...post,
        platforms: [post.network] as NetworkType[],
      }));
      setContent(mockWithPlatforms);
      setIsLiveData(false);
      setAvailablePlatforms(['instagram', 'facebook', 'tiktok', 'linkedin']);
      
      toast({
        title: 'Error al cargar contenido',
        description: 'Mostrando datos de ejemplo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, limit, toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    isLoading,
    isLiveData,
    error,
    availablePlatforms,
    refetch: fetchContent,
  };
};

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
