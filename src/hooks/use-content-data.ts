import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentPost, getClientContent } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

interface UseContentDataResult {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  error: string | null;
  refetch: () => void;
}

export const useContentData = (clientId: string | null, limit: number = 10): UseContentDataResult => {
  const [content, setContent] = useState<ContentPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContent = useCallback(async () => {
    if (!clientId) {
      setContent([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if client has active Meta connection
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('status', 'active')
        .maybeSingle();

      if (!connection) {
        // Fall back to mock data
        const mockContent = getClientContent(clientId);
        setContent(mockContent);
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Fetch real Instagram media with insights
      const { data, error: functionError } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'instagram-media-with-insights',
          params: { limit }
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        console.warn('Meta API error:', data.error);
        // Fall back to mock data on API error
        const mockContent = getClientContent(clientId);
        setContent(mockContent);
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Transform API data to ContentPost format
      const transformedContent: ContentPost[] = (data.data || []).map((item: any) => ({
        id: item.id,
        title: item.caption ? item.caption.substring(0, 50) + (item.caption.length > 50 ? '...' : '') : 'Sin descripción',
        caption: item.caption || 'Sin descripción',
        network: 'instagram' as const,
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

      setContent(transformedContent);
      setIsLiveData(true);
    } catch (err) {
      console.error('Error fetching content data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching content');
      
      // Fall back to mock data on error
      const mockContent = getClientContent(clientId);
      setContent(mockContent);
      setIsLiveData(false);
      
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
    refetch: fetchContent,
  };
};
