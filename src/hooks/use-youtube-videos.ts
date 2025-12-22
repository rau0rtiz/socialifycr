import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!clientId) {
      setVideos([]);
      setIsConnected(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if client has active YouTube connection
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'youtube')
        .eq('status', 'active')
        .maybeSingle();

      if (!connection) {
        setVideos([]);
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      setIsConnected(true);

      // Fetch YouTube videos
      const { data, error: functionError } = await supabase.functions.invoke('youtube-api', {
        body: {
          clientId,
          endpoint: 'channel-videos',
          params: { limit }
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        console.warn('YouTube API error:', data.error);
        setVideos([]);
        return;
      }

      setVideos(data.videos || []);
    } catch (err) {
      console.error('Error fetching YouTube videos:', err);
      setError(err instanceof Error ? err.message : 'Error fetching videos');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, limit]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    isLoading,
    isConnected,
    error,
    refetch: fetchVideos,
  };
};
