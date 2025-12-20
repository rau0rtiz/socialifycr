import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignData, getClientCampaigns } from '@/data/mockData';

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

export function useCampaignsData(clientId: string | null): UseCampaignsDataResult {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [hasAdAccount, setHasAdAccount] = useState(false);

  const mapStatus = (metaStatus: string): CampaignData['status'] => {
    switch (metaStatus?.toUpperCase()) {
      case 'ACTIVE':
        return 'active';
      case 'PAUSED':
        return 'paused';
      case 'DELETED':
      case 'ARCHIVED':
        return 'completed';
      default:
        return 'scheduled';
    }
  };

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Check for active Meta connection with ad account
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('status', 'active')
        .maybeSingle();

      if (!connection || !connection.ad_account_id) {
        // No Meta connection or no ad account, use mock data
        setCampaigns(getClientCampaigns(clientId));
        setIsLiveData(false);
        setHasAdAccount(false);
        setIsLoading(false);
        return;
      }

      setHasAdAccount(true);

      // Fetch real campaigns from Meta API
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'campaigns',
        },
      });

      if (error || data?.error) {
        console.error('Error fetching campaigns:', error || data?.error);
        setCampaigns(getClientCampaigns(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      const metaCampaigns = (data?.campaigns || []) as MetaCampaign[];

      if (metaCampaigns.length === 0) {
        // No campaigns found, use mock data
        setCampaigns(getClientCampaigns(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Map Meta campaigns to our format
      const mappedCampaigns: CampaignData[] = metaCampaigns.map((campaign) => {
        // Extract leads from actions if available
        const leadAction = campaign.actions?.find(
          (a) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped'
        );
        const leads = leadAction ? parseInt(leadAction.value) : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          network: 'facebook' as const, // Meta campaigns show as Facebook
          reach: campaign.reach || 0,
          engagement: campaign.clicks || 0,
          leads,
          status: mapStatus(campaign.status),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        };
      });

      setCampaigns(mappedCampaigns);
      setIsLiveData(true);
    } catch (err) {
      console.error('Error in useCampaignsData:', err);
      setCampaigns(getClientCampaigns(clientId));
      setIsLiveData(false);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    campaigns,
    isLoading,
    isLiveData,
    hasAdAccount,
    refetch: fetchData,
  };
}
