import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformConnections } from './use-platform-connections';

interface PlatformFollowers {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin';
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
  const { data: connections, isLoading: connectionsLoading } = usePlatformConnections(clientId);

  const metaConnection = connections?.find(c => c.platform === 'meta');
  const youtubeConnection = connections?.find(c => c.platform === 'youtube');
  const linkedinConnection = connections?.find(c => c.platform === 'linkedin');

  const { data, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ['social-followers', clientId, !!metaConnection, !!youtubeConnection, !!linkedinConnection],
    queryFn: async () => {
      const results: PlatformFollowers[] = [];

      // Fire all API calls in parallel
      const promises: Promise<void>[] = [];

      if (metaConnection) {
        promises.push(
          supabase.functions.invoke('meta-api', {
            body: {
              clientId,
              endpoint: 'account-insights',
              params: { datePreset: 'last_30d' },
            },
          }).then(({ data, error }) => {
            if (!error && !data?.error) {
              if (data.instagram && metaConnection.instagram_account_id) {
                results.push({
                  platform: 'instagram',
                  followers: data.instagram.followers || 0,
                  name: data.instagram.username,
                });
              }
              if (data.facebook && metaConnection.platform_page_id) {
                results.push({
                  platform: 'facebook',
                  followers: data.facebook.fans || data.facebook.followers || 0,
                  name: data.facebook.name,
                });
              }
            }
          })
        );
      }

      if (youtubeConnection) {
        promises.push(
          supabase.functions.invoke('youtube-api', {
            body: { clientId, endpoint: 'channel-stats' },
          }).then(({ data: ytData, error: ytError }) => {
            if (!ytError && !ytData?.error && ytData?.subscriberCount !== undefined) {
              results.push({
                platform: 'youtube',
                followers: ytData.subscriberCount,
                name: ytData.name,
              });
            }
          })
        );
      }

      if (linkedinConnection) {
        promises.push(
          supabase.functions.invoke('linkedin-api', {
            body: { clientId, endpoint: 'followers' },
          }).then(({ data: liData, error: liError }) => {
            if (!liError && !liData?.error && liData?.connected && liData?.data?.totalFollowers !== undefined) {
              results.push({
                platform: 'linkedin',
                followers: liData.data.totalFollowers,
                name: linkedinConnection.platform_page_name || undefined,
              });
            }
          })
        );
      }

      await Promise.all(promises);
      return results;
    },
    enabled: !!clientId && !connectionsLoading,
    staleTime: 5 * 60 * 1000,
  });

  return {
    platforms: data || [],
    isLoading: connectionsLoading || dataLoading,
    isLiveData: (data?.length || 0) > 0,
    refetch,
  };
}
