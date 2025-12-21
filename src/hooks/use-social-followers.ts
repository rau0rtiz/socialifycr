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
      // Check for active Meta connection
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('status', 'active')
        .maybeSingle();

      if (!connection) {
        // No Meta connection
        setPlatforms([]);
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Fetch real data from Meta API
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'account-insights',
          params: { datePreset: 'last_30d' },
        },
      });

      if (error || data?.error) {
        console.error('Error fetching account insights:', error || data?.error);
        setPlatforms([]);
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      const connectedPlatforms: PlatformFollowers[] = [];

      // Add Instagram if connected
      if (data.instagram && connection.instagram_account_id) {
        connectedPlatforms.push({
          platform: 'instagram',
          followers: data.instagram.followers || 0,
          name: data.instagram.username,
        });
      }

      // Add Facebook if connected
      if (data.facebook && connection.platform_page_id) {
        connectedPlatforms.push({
          platform: 'facebook',
          followers: data.facebook.fans || data.facebook.followers || 0,
          name: data.facebook.name,
        });
      }

      // TikTok and YouTube would be added here when those integrations exist
      // For now, check for those platform connections
      const { data: tiktokConnection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'tiktok')
        .eq('status', 'active')
        .maybeSingle();

      // TikTok integration would go here if available

      const { data: googleConnection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'google')
        .eq('status', 'active')
        .maybeSingle();

      // YouTube integration would go here if available

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
