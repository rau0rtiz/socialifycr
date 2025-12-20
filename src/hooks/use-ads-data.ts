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

// Extract results count from actions array based on objective
const extractResults = (actions: any[], objective: string): { count: number; type: string } => {
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
    MESSAGES: ['onsite_conversion.messaging_conversation_started_7d'],
    APP_INSTALLS: ['app_install', 'mobile_app_install'],
  };

  const targetActionTypes = actionTypeMap[objective] || [];

  let totalResults = 0;
  for (const action of actions) {
    if (targetActionTypes.includes(action.action_type)) {
      totalResults += parseInt(action.value) || 0;
    }
  }

  return { count: totalResults, type: resultType };
};

// Extract cost per result
const extractCostPerResult = (costPerAction: any[], objective: string): number => {
  if (!costPerAction || !Array.isArray(costPerAction)) return 0;

  const actionTypeMap: Record<string, string[]> = {
    OUTCOME_LEADS: ['lead', 'leadgen_grouped'],
    LEAD_GENERATION: ['lead', 'leadgen_grouped'],
    OUTCOME_SALES: ['purchase', 'omni_purchase'],
    CONVERSIONS: ['purchase'],
    OUTCOME_TRAFFIC: ['link_click'],
    LINK_CLICKS: ['link_click'],
  };

  const targetActionTypes = actionTypeMap[objective] || [];

  for (const cpa of costPerAction) {
    if (targetActionTypes.includes(cpa.action_type)) {
      return parseFloat(cpa.value) || 0;
    }
  }

  return 0;
};

export type DatePresetKey = 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month';

export const useCampaigns = (clientId: string | null, hasAdAccount: boolean, datePreset: DatePresetKey = 'last_30d') => {
  return useQuery({
    queryKey: ['meta-campaigns', clientId, datePreset],
    queryFn: async (): Promise<CampaignInsights[]> => {
      if (!clientId || !hasAdAccount) return [];

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'campaigns',
          params: { datePreset },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((campaign: any) => {
        const insights = campaign.insights?.data?.[0] || {};
        const objective = campaign.objective || '';
        const { count: results, type: resultType } = extractResults(insights.actions, objective);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective);
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
          spend: parseFloat(insights.spend) || 0,
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
    },
    enabled: !!clientId && hasAdAccount,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdSets = (clientId: string | null, campaignId: string | null, objective: string, datePreset: DatePresetKey = 'last_30d') => {
  return useQuery({
    queryKey: ['meta-adsets', clientId, campaignId, datePreset],
    queryFn: async (): Promise<AdSetInsights[]> => {
      if (!clientId || !campaignId) return [];

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'adsets',
          params: { campaignId, datePreset },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((adset: any) => {
        const insights = adset.insights?.data?.[0] || {};
        const { count: results, type: resultType } = extractResults(insights.actions, objective);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective);

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

export const useAds = (clientId: string | null, adsetId: string | null, objective: string, datePreset: DatePresetKey = 'last_30d') => {
  return useQuery({
    queryKey: ['meta-ads', clientId, adsetId, datePreset],
    queryFn: async (): Promise<AdInsights[]> => {
      if (!clientId || !adsetId) return [];

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'ads',
          params: { adsetId, datePreset },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((ad: any) => {
        const insights = ad.insights?.data?.[0] || {};
        const { count: results, type: resultType } = extractResults(insights.actions, objective);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective);

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
