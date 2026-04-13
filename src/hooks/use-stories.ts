import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export interface StoryScannedData {
  customer_name?: string | null;
  customer_phone?: string | null;
  brand?: string | null;
  garment_type?: string | null;
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

const ARCHIVED_COLUMNS = 'id, story_id, media_type, media_url, thumbnail_url, permalink, timestamp, impressions, reach, replies, exits, taps_forward, taps_back, captured_at, scanned_data, client_id';
const RECENT_LIMIT = 100;

const mapArchivedRow = (story: any): Story => ({
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
});

interface UseStoriesResult {
  activeStories: Story[];
  archivedStories: Story[];
  allStories: Story[];
  allArchivedStories: Story[];
  isLoading: boolean;
  isLoadingAllArchived: boolean;
  hasMoreArchived: boolean;
  error: string | null;
  refetch: () => void;
  fetchAllArchived: () => void;
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
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch only the most recent 100 archived stories (fast initial load)
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
        .select(ARCHIVED_COLUMNS)
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(RECENT_LIMIT);

      if (error) {
        console.error('Error fetching archived stories:', error);
        return [];
      }

      return (data || []).map(mapArchivedRow);
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch ALL archived stories — only triggered manually
  const {
    data: allArchivedData,
    isLoading: allArchivedLoading,
    refetch: refetchAllArchived,
  } = useQuery({
    queryKey: ['all-archived-stories', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error: pageError } = await supabase
          .from('archived_stories')
          .select(ARCHIVED_COLUMNS)
          .eq('client_id', clientId)
          .order('timestamp', { ascending: false })
          .range(from, from + pageSize - 1);
        if (pageError) {
          console.error('Error fetching all archived stories:', pageError);
          break;
        }
        if (!page || page.length === 0) break;
        allData = allData.concat(page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      return allData.map(mapArchivedRow);
    },
    enabled: false, // only fetch on demand
    staleTime: 10 * 60 * 1000,
  });

  const fetchAllArchived = useCallback(() => {
    refetchAllArchived();
  }, [refetchAllArchived]);

  const activeStories = activeData || [];
  const archivedStories = archivedData || [];
  const allArchivedStories = allArchivedData || [];
  
  // Filter out archived stories that are currently active (to avoid duplicates)
  const activeIds = new Set(activeStories.map(s => s.storyId));
  const filteredArchived = archivedStories.filter(s => !activeIds.has(s.storyId));
  const filteredAllArchived = allArchivedStories.filter(s => !activeIds.has(s.storyId));

  const allStories = [...activeStories, ...filteredArchived];

  return {
    activeStories,
    archivedStories: filteredArchived,
    allStories,
    allArchivedStories: filteredAllArchived,
    isLoading: activeLoading || archivedLoading,
    isLoadingAllArchived: allArchivedLoading,
    hasMoreArchived: archivedStories.length >= RECENT_LIMIT,
    error: activeError?.message || null,
    refetch: () => {
      refetchActive();
      refetchArchived();
    },
    fetchAllArchived,
  };
};
