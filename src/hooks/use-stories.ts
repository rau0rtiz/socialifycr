import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoryScannedData {
  customer_name?: string | null;
  customer_phone?: string | null;
  brand?: string | null;
  amount?: number | null;
  notes?: string | null;
}

export interface Story {
  id: string;
  storyId: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp: string;
  impressions: number;
  reach: number;
  replies: number;
  exits?: number;
  tapsForward?: number;
  tapsBack?: number;
  isActive: boolean;
  capturedAt?: string;
  scannedData?: StoryScannedData | null;
}

interface UseStoriesResult {
  activeStories: Story[];
  archivedStories: Story[];
  allStories: Story[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStories = (clientId: string | null): UseStoriesResult => {
  // Fetch active stories from Meta API
  const { 
    data: activeData, 
    isLoading: activeLoading, 
    error: activeError,
    refetch: refetchActive
  } = useQuery({
    queryKey: ['active-stories', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { 
          clientId, 
          endpoint: 'stories',
          params: {}
        }
      });

      if (error || data?.error) {
        console.warn('Error fetching active stories:', error || data?.error);
        return [];
      }

      return (data?.stories || []).map((story: any): Story => ({
        id: story.id,
        storyId: story.id,
        mediaType: story.media_type || 'IMAGE',
        mediaUrl: story.media_url,
        thumbnailUrl: story.thumbnail_url,
        permalink: story.permalink,
        timestamp: story.timestamp,
        impressions: story.impressions || 0,
        reach: story.reach || 0,
        replies: story.replies || 0,
        isActive: true,
      }));
    },
    enabled: !!clientId,
    staleTime: 60 * 1000, // 1 minute for active stories
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch archived stories from database
  const { 
    data: archivedData, 
    isLoading: archivedLoading,
    refetch: refetchArchived
  } = useQuery({
    queryKey: ['archived-stories', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('archived_stories')
        .select('*')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching archived stories:', error);
        return [];
      }

      return (data || []).map((story: any): Story => ({
        id: story.id,
        storyId: story.story_id,
        mediaType: (story.media_type as 'IMAGE' | 'VIDEO') || 'IMAGE',
        mediaUrl: story.media_url || undefined,
        thumbnailUrl: story.thumbnail_url || undefined,
        permalink: story.permalink || undefined,
        timestamp: story.timestamp,
        impressions: story.impressions || 0,
        reach: story.reach || 0,
        replies: story.replies || 0,
        exits: story.exits || undefined,
        tapsForward: story.taps_forward || undefined,
        tapsBack: story.taps_back || undefined,
        isActive: false,
        capturedAt: story.captured_at || undefined,
        scannedData: story.scanned_data || null,
      }));
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const activeStories = activeData || [];
  const archivedStories = archivedData || [];
  
  // Filter out archived stories that are currently active (to avoid duplicates)
  const activeIds = new Set(activeStories.map(s => s.storyId));
  const filteredArchived = archivedStories.filter(s => !activeIds.has(s.storyId));

  const allStories = [...activeStories, ...filteredArchived];

  return {
    activeStories,
    archivedStories: filteredArchived,
    allStories,
    isLoading: activeLoading || archivedLoading,
    error: activeError?.message || null,
    refetch: () => {
      refetchActive();
      refetchArchived();
    },
  };
};
