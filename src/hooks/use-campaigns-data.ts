import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignData, getClientCampaigns } from '@/data/mockData';
import { usePlatformConnections } from './use-platform-connections';

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend?: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  actions?: Array<{ action_type: string; value: string }>;
}

interface UseCampaignsDataResult {
  campaigns: CampaignData[];
  isLoading: boolean;
  isLiveData: boolean;
  hasAdAccount: boolean;
  refetch: () => void;
}

const mapStatus = (metaStatus: string): CampaignData['status'] => {
  switch (metaStatus?.toUpperCase()) {
    case 'ACTIVE': return 'active';
    case 'PAUSED': return 'paused';
    case 'DELETED':
    case 'ARCHIVED': return 'completed';
    default: return 'scheduled';
  }
};

export function useCampaignsData(clientId: string | null): UseCampaignsDataResult {
  const { data: connections, isLoading: connectionsLoading } = usePlatformConnections(clientId);
  const metaConnection = connections?.find(c => c.platform === 'meta');
  const hasAdAccount = !!metaConnection?.ad_account_id;

  const { data, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ['campaigns-data', clientId, hasAdAccount],
    queryFn: async () => {
      if (!hasAdAccount) {
        return { campaigns: getClientCampaigns(clientId!), isLiveData: false };
      }

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint: 'campaigns' },
      });

      if (error || data?.error) {
        console.error('Error fetching campaigns:', error || data?.error);
        return { campaigns: getClientCampaigns(clientId!), isLiveData: false };
      }

      const metaCampaigns = (data?.campaigns || []) as MetaCampaign[];
      if (metaCampaigns.length === 0) {
        return { campaigns: getClientCampaigns(clientId!), isLiveData: false };
      }

      const mappedCampaigns: CampaignData[] = metaCampaigns.map((campaign) => {
        const leadAction = campaign.actions?.find(
          (a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped'
        );
        const leads = leadAction ? parseInt(leadAction.value) : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          network: 'facebook' as const,
          reach: campaign.reach || 0,
          engagement: campaign.clicks || 0,
          leads,
          status: mapStatus(campaign.status),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        };
      });

      return { campaigns: mappedCampaigns, isLiveData: true };
    },
    enabled: !!clientId && !connectionsLoading,
    staleTime: 3 * 60 * 1000,
  });

  return {
    campaigns: data?.campaigns || [],
    isLoading: connectionsLoading || dataLoading,
    isLiveData: data?.isLiveData || false,
    hasAdAccount,
    refetch,
  };
}
