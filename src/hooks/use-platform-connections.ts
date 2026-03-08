import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformConnection {
  id: string;
  client_id: string;
  platform: string;
  status: string;
  access_token: string | null;
  ad_account_id: string | null;
  instagram_account_id: string | null;
  platform_page_id: string | null;
  platform_page_name: string | null;
  platform_user_id: string | null;
  permissions: any;
  token_expires_at: string | null;
  refresh_token: string | null;
  connected_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Shared hook that fetches all active platform connections for a client.
 * Uses React Query for deduplication and caching — multiple components
 * calling this with the same clientId will share a single request.
 */
export const usePlatformConnections = (clientId: string | null) => {
  return useQuery({
    queryKey: ['platform-connections', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching platform connections:', error);
        return [];
      }

      return (data || []) as PlatformConnection[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};
