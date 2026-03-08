import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformConnections } from './use-platform-connections';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

interface UseYouTubeVideosResult {
  videos: YouTubeVideo[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refetch: () => void;
}

export const useYouTubeVideos = (clientId: string | null, limit: number = 10): UseYouTubeVideosResult => {
  const { data: connections, isLoading: connectionsLoading } = usePlatformConnections(clientId);
  const youtubeConnection = connections?.find(c => c.platform === 'youtube');

  const { data, isLoading: dataLoading, error: queryError, refetch } = useQuery({
    queryKey: ['youtube-videos', clientId, limit],
    queryFn: async () => {
      const { data, error: functionError } = await supabase.functions.invoke('youtube-api', {
        body: { clientId, endpoint: 'channel-videos', params: { limit } }
      });

      if (functionError) throw new Error(functionError.message);
      if (data?.error) {
        console.warn('YouTube API error:', data.error);
        return [];
      }

      return (data?.videos || []) as YouTubeVideo[];
    },
    enabled: !!clientId && !connectionsLoading && !!youtubeConnection,
    staleTime: 5 * 60 * 1000,
  });

  return {
    videos: data || [],
    isLoading: connectionsLoading || dataLoading,
    isConnected: !!youtubeConnection,
    error: queryError?.message || null,
    refetch,
  };
};
