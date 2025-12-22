import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformFollowers {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  followers: number;
  name?: string;
}

interface UseSocialFollowersResult {
  platforms: PlatformFollowers[];
  isLoading: boolean;
  isLiveData: boolean;
  refetch: () => void;
}

export function useSocialFollowers(clientId: string | null): UseSocialFollowersResult {
  const [platforms, setPlatforms] = useState<PlatformFollowers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setPlatforms([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const connectedPlatforms: PlatformFollowers[] = [];

      // Check for active Meta connection
      const { data: metaConnection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('status', 'active')
        .maybeSingle();

      if (metaConnection) {
        // Fetch real data from Meta API
        const { data, error } = await supabase.functions.invoke('meta-api', {
          body: {
            clientId,
            endpoint: 'account-insights',
            params: { datePreset: 'last_30d' },
          },
        });

        if (!error && !data?.error) {
          // Add Instagram if connected
          if (data.instagram && metaConnection.instagram_account_id) {
            connectedPlatforms.push({
              platform: 'instagram',
              followers: data.instagram.followers || 0,
              name: data.instagram.username,
            });
          }

          // Add Facebook if connected
          if (data.facebook && metaConnection.platform_page_id) {
            connectedPlatforms.push({
              platform: 'facebook',
              followers: data.facebook.fans || data.facebook.followers || 0,
              name: data.facebook.name,
            });
          }
        }
      }

      // Check for active YouTube connection
      const { data: youtubeConnection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'youtube')
        .eq('status', 'active')
        .maybeSingle();

      if (youtubeConnection) {
        // Fetch YouTube channel stats
        const { data: ytData, error: ytError } = await supabase.functions.invoke('youtube-api', {
          body: {
            clientId,
            endpoint: 'channel-stats',
          },
        });

        if (!ytError && !ytData?.error && ytData?.subscriberCount !== undefined) {
          connectedPlatforms.push({
            platform: 'youtube',
            followers: ytData.subscriberCount,
            name: ytData.name,
          });
        }
      }

      setPlatforms(connectedPlatforms);
      setIsLiveData(connectedPlatforms.length > 0);
    } catch (err) {
      console.error('Error in useSocialFollowers:', err);
      setPlatforms([]);
      setIsLiveData(false);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    platforms,
    isLoading,
    isLiveData,
    refetch: fetchData,
  };
}
