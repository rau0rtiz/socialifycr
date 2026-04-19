import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignData, getClientCampaigns } from '@/data/mockData';
import { useMetaConnections } from './use-platform-connections';
import { useBrand } from '@/contexts/BrandContext';

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
  const { data: metaConnections, isLoading: connectionsLoading } = useMetaConnections(clientId);
  const { selectedMetaConnectionId } = useBrand();

  // Filter to active connections that have an ad account; respect selected filter when present.
  const eligibleConnections = (metaConnections || []).filter((c) => !!c.ad_account_id);
  const targetConnections = selectedMetaConnectionId
    ? eligibleConnections.filter((c) => c.id === selectedMetaConnectionId)
    : eligibleConnections;
  const hasAdAccount = targetConnections.length > 0;

  const { data, isLoading: dataLoading, refetch } = useQuery({
    queryKey: [
      'campaigns-data',
      clientId,
      targetConnections.map((c) => c.id).sort().join(','),
    ],
    queryFn: async () => {
      if (!hasAdAccount) {
        return { campaigns: getClientCampaigns(clientId!), isLiveData: false };
      }

      // Fetch in parallel for every Meta connection with an ad account.
      const responses = await Promise.all(
        targetConnections.map(async (conn) => {
          const { data, error } = await supabase.functions.invoke('meta-api', {
            body: { clientId, endpoint: 'campaigns', connectionId: conn.id },
          });
          if (error || data?.error) {
            console.error('Error fetching campaigns for connection', conn.id, error || data?.error);
            return { connection: conn, campaigns: [] as MetaCampaign[] };
          }
          return { connection: conn, campaigns: (data?.campaigns || data?.data || []) as MetaCampaign[] };
        })
      );

      const merged: CampaignData[] = [];
      for (const r of responses) {
        const accountLabel =
          r.connection.account_label ||
          r.connection.platform_page_name ||
          (r.connection.ad_account_id ? `Ad ${r.connection.ad_account_id}` : 'Meta');
        for (const campaign of r.campaigns) {
          const leadAction = campaign.actions?.find(
            (a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped'
          );
          const leads = leadAction ? parseInt(leadAction.value) : 0;
          merged.push({
            id: `${r.connection.id}:${campaign.id}`,
            name: targetConnections.length > 1 ? `${campaign.name} · ${accountLabel}` : campaign.name,
            network: 'facebook' as const,
            reach: campaign.reach || 0,
            engagement: campaign.clicks || 0,
            leads,
            status: mapStatus(campaign.status),
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
          });
        }
      }

      if (merged.length === 0) {
        return { campaigns: getClientCampaigns(clientId!), isLiveData: false };
      }

      return { campaigns: merged, isLiveData: true };
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
