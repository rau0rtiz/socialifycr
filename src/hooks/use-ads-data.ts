import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignInsights {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: string | null;
  stopTime: string | null;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  cpc: number;
  results: number;
  resultType: string;
  costPerResult: number;
  roas: number | null;
}

export interface CampaignsResult {
  campaigns: CampaignInsights[];
  currency: string;
}

export interface AdSetInsights {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  cpc: number;
  results: number;
  resultType: string;
  costPerResult: number;
}

export interface AdInsights {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  thumbnailUrl: string | null;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  cpc: number;
  results: number;
  resultType: string;
  costPerResult: number;
}

const getMetaErrorMessage = (err: unknown) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const anyErr = err as any;
    return (
      anyErr.message ||
      anyErr.error?.message ||
      (typeof anyErr.error === 'string' ? anyErr.error : null) ||
      JSON.stringify(anyErr)
    );
  }
  return String(err);
};

// Map Meta objective to result type name
const getResultTypeFromObjective = (objective: string): string => {
  const objectiveMap: Record<string, string> = {
    OUTCOME_LEADS: 'Leads',
    LEAD_GENERATION: 'Leads',
    OUTCOME_SALES: 'Compras',
    CONVERSIONS: 'Conversiones',
    OUTCOME_TRAFFIC: 'Clics en enlace',
    LINK_CLICKS: 'Clics en enlace',
    OUTCOME_ENGAGEMENT: 'Interacciones',
    POST_ENGAGEMENT: 'Interacciones',
    OUTCOME_AWARENESS: 'Alcance',
    REACH: 'Alcance',
    BRAND_AWARENESS: 'Alcance',
    VIDEO_VIEWS: 'Reproducciones',
    OUTCOME_APP_PROMOTION: 'Instalaciones',
    APP_INSTALLS: 'Instalaciones',
    MESSAGES: 'Mensajes',
  };
  return objectiveMap[objective] || 'Resultados';
};

// All message-related action types for Meta campaigns
const messageActionTypes = [
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.total_messaging_connection',
  'messaging_conversation_started_7d',
  'messaging_first_reply',
  'new_messaging_connection',
  'contact',
];

// Extract results count from actions array based on objective
const extractResults = (actions: any[], objective: string, campaignName?: string): { count: number; type: string } => {
  if (!actions || !Array.isArray(actions)) {
    return { count: 0, type: getResultTypeFromObjective(objective) };
  }

  const resultType = getResultTypeFromObjective(objective);

  // Map objective to action types
  const actionTypeMap: Record<string, string[]> = {
    OUTCOME_LEADS: ['lead', 'leadgen_grouped', 'onsite_conversion.lead_grouped'],
    LEAD_GENERATION: ['lead', 'leadgen_grouped'],
    OUTCOME_SALES: ['purchase', 'omni_purchase', 'onsite_conversion.purchase'],
    CONVERSIONS: ['purchase', 'complete_registration', 'add_to_cart'],
    OUTCOME_TRAFFIC: ['link_click'],
    LINK_CLICKS: ['link_click'],
    OUTCOME_ENGAGEMENT: ['post_engagement', 'page_engagement', 'post_reaction'],
    POST_ENGAGEMENT: ['post_engagement', 'page_engagement'],
    VIDEO_VIEWS: ['video_view'],
    MESSAGES: messageActionTypes,
    APP_INSTALLS: ['app_install', 'mobile_app_install'],
  };

  const targetActionTypes = actionTypeMap[objective] || [];

  // Debug logging for messaging campaigns
  if (objective === 'MESSAGES' || (campaignName && campaignName.toLowerCase().includes('mensaje'))) {
    console.log(`[DEBUG] Campaign: ${campaignName}, Objective: ${objective}`);
    console.log(`[DEBUG] Looking for action types:`, targetActionTypes);
    console.log(`[DEBUG] Available actions:`, actions.map(a => ({ type: a.action_type, value: a.value })));
  }

  let totalResults = 0;
  for (const action of actions) {
    if (targetActionTypes.includes(action.action_type)) {
      totalResults += parseInt(action.value) || 0;
    }
  }

  return { count: totalResults, type: resultType };
};

// Extract cost per result from cost_per_action_type or calculate from spend/results
const extractCostPerResult = (
  costPerAction: any[],
  objective: string,
  spend: number,
  results: number
): number => {
  // First try to get from cost_per_action_type
  if (costPerAction && Array.isArray(costPerAction)) {
    const actionTypeMap: Record<string, string[]> = {
      OUTCOME_LEADS: ['lead', 'leadgen_grouped'],
      LEAD_GENERATION: ['lead', 'leadgen_grouped'],
      OUTCOME_SALES: ['purchase', 'omni_purchase'],
      CONVERSIONS: ['purchase'],
      OUTCOME_TRAFFIC: ['link_click'],
      LINK_CLICKS: ['link_click'],
      MESSAGES: messageActionTypes,
      VIDEO_VIEWS: ['video_view'],
      OUTCOME_ENGAGEMENT: ['post_engagement', 'page_engagement'],
      POST_ENGAGEMENT: ['post_engagement'],
    };

    const targetActionTypes = actionTypeMap[objective] || [];

    for (const cpa of costPerAction) {
      if (targetActionTypes.includes(cpa.action_type)) {
        return parseFloat(cpa.value) || 0;
      }
    }
  }

  // Fallback: calculate from spend / results if we have results
  if (results > 0 && spend > 0) {
    return spend / results;
  }

  return 0;
};

export type DatePresetKey = 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export const useCampaigns = (
  clientId: string | null, 
  hasAdAccount: boolean, 
  datePreset: DatePresetKey = 'last_30d',
  customRange?: DateRange
) => {
  return useQuery({
    queryKey: ['meta-campaigns', clientId, datePreset, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<CampaignsResult> => {
      if (!clientId || !hasAdAccount) return { campaigns: [], currency: 'USD' };

      const params: Record<string, string> = {};
      if (datePreset === 'custom' && customRange?.from && customRange?.to) {
        params.since = customRange.from.toISOString().split('T')[0];
        params.until = customRange.to.toISOString().split('T')[0];
      } else {
        params.datePreset = datePreset === 'custom' ? 'last_30d' : datePreset;
      }

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'campaigns',
          params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      const campaigns = (data?.data || []).map((campaign: any) => {
        const insights = campaign.insights?.data?.[0] || {};
        const objective = campaign.objective || '';
        const spend = parseFloat(insights.spend) || 0;
        const { count: results, type: resultType } = extractResults(insights.actions, objective, campaign.name);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective, spend, results);
        const roas = insights.purchase_roas?.[0]?.value || null;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          effectiveStatus: campaign.effective_status,
          objective,
          dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          startTime: campaign.start_time,
          stopTime: campaign.stop_time,
          spend,
          reach: parseInt(insights.reach) || 0,
          impressions: parseInt(insights.impressions) || 0,
          clicks: parseInt(insights.clicks) || 0,
          cpc: parseFloat(insights.cpc) || 0,
          results,
          resultType,
          costPerResult,
          roas: roas ? parseFloat(roas) : null,
        };
      });

      return {
        campaigns,
        currency: data?.currency || 'USD',
      };
    },
    enabled: !!clientId && hasAdAccount,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdSets = (
  clientId: string | null, 
  campaignId: string | null, 
  objective: string, 
  datePreset: DatePresetKey = 'last_30d',
  customRange?: DateRange
) => {
  return useQuery({
    queryKey: ['meta-adsets', clientId, campaignId, datePreset, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<AdSetInsights[]> => {
      if (!clientId || !campaignId) return [];

      const params: Record<string, string> = { campaignId };
      if (datePreset === 'custom' && customRange?.from && customRange?.to) {
        params.since = customRange.from.toISOString().split('T')[0];
        params.until = customRange.to.toISOString().split('T')[0];
      } else {
        params.datePreset = datePreset === 'custom' ? 'last_30d' : datePreset;
      }

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'adsets',
          params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((adset: any) => {
        const insights = adset.insights?.data?.[0] || {};
        const spend = parseFloat(insights.spend) || 0;
        const { count: results, type: resultType } = extractResults(insights.actions, objective);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective, spend, results);

        return {
          id: adset.id,
          name: adset.name,
          status: adset.status,
          effectiveStatus: adset.effective_status,
          dailyBudget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
          lifetimeBudget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : null,
          optimizationGoal: adset.optimization_goal || '',
          spend: parseFloat(insights.spend) || 0,
          reach: parseInt(insights.reach) || 0,
          impressions: parseInt(insights.impressions) || 0,
          clicks: parseInt(insights.clicks) || 0,
          cpc: parseFloat(insights.cpc) || 0,
          results,
          resultType,
          costPerResult,
        };
      });
    },
    enabled: !!clientId && !!campaignId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAds = (
  clientId: string | null, 
  adsetId: string | null, 
  objective: string, 
  datePreset: DatePresetKey = 'last_30d',
  customRange?: DateRange
) => {
  return useQuery({
    queryKey: ['meta-ads', clientId, adsetId, datePreset, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<AdInsights[]> => {
      if (!clientId || !adsetId) return [];

      const params: Record<string, string> = { adsetId };
      if (datePreset === 'custom' && customRange?.from && customRange?.to) {
        params.since = customRange.from.toISOString().split('T')[0];
        params.until = customRange.to.toISOString().split('T')[0];
      } else {
        params.datePreset = datePreset === 'custom' ? 'last_30d' : datePreset;
      }

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'ads',
          params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((ad: any) => {
        const insights = ad.insights?.data?.[0] || {};
        const spend = parseFloat(insights.spend) || 0;
        const { count: results, type: resultType } = extractResults(insights.actions, objective);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective, spend, results);

        return {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          effectiveStatus: ad.effective_status,
          thumbnailUrl: ad.creative?.thumbnail_url || null,
          spend: parseFloat(insights.spend) || 0,
          reach: parseInt(insights.reach) || 0,
          impressions: parseInt(insights.impressions) || 0,
          clicks: parseInt(insights.clicks) || 0,
          cpc: parseFloat(insights.cpc) || 0,
          results,
          resultType,
          costPerResult,
        };
      });
    },
    enabled: !!clientId && !!adsetId,
    staleTime: 5 * 60 * 1000,
  });
};
