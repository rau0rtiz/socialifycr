import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CampaignGoal, getGoalActionTypes, getGoalLabel, GoalType } from './use-campaign-goals';

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
  landingPageViews: number;
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
  landingPageViews: number;
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
  landingPageViews: number;
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

// Priority-ordered action types for detecting campaign type and extracting results
// Each entry: [action_type, result_label]
const actionTypePriority: [string, string][] = [
  // Messaging (highest priority for messaging campaigns)
  ['onsite_conversion.messaging_conversation_started_7d', 'Conversaciones'],
  ['onsite_conversion.messaging_first_reply', 'Mensajes'],
  ['onsite_conversion.total_messaging_connection', 'Conexiones'],
  // Leads
  ['lead', 'Leads'],
  ['onsite_conversion.lead_grouped', 'Leads'],
  ['leadgen_grouped', 'Leads'],
  ['onsite_web_lead', 'Leads'],
  // Sales/Purchases
  ['purchase', 'Compras'],
  ['omni_purchase', 'Compras'],
  ['onsite_conversion.purchase', 'Compras'],
  // Registrations
  ['complete_registration', 'Registros'],
  ['offsite_complete_registration_add_meta_leads', 'Registros'],
  // Traffic
  ['link_click', 'Clics en enlace'],
  // Video
  ['video_view', 'Reproducciones'],
  // Engagement (lower priority)
  ['post_engagement', 'Interacciones'],
  ['page_engagement', 'Interacciones'],
];

// Extract results by finding the highest priority action type present in cost_per_action_type
// This tells us what Meta considers the "result" for this campaign
const extractResults = (actions: any[], objective: string, costPerAction?: any[]): { count: number; type: string } => {
  if (!actions || !Array.isArray(actions)) {
    return { count: 0, type: getResultTypeFromObjective(objective) };
  }

  // First, check cost_per_action_type to see what Meta considers the primary result
  // This is the most reliable indicator of the campaign's optimization goal
  if (costPerAction && Array.isArray(costPerAction)) {
    for (const [actionType, label] of actionTypePriority) {
      const hasCost = costPerAction.some(c => c.action_type === actionType);
      if (hasCost) {
        const action = actions.find(a => a.action_type === actionType);
        if (action) {
          return { count: parseInt(action.value) || 0, type: label };
        }
      }
    }
  }

  // Fallback: find highest priority action type in actions
  for (const [actionType, label] of actionTypePriority) {
    const action = actions.find(a => a.action_type === actionType);
    if (action) {
      return { count: parseInt(action.value) || 0, type: label };
    }
  }

  // Final fallback based on objective
  return { count: 0, type: getResultTypeFromObjective(objective) };
};

// Extract landing page views from actions array
const extractLandingPageViews = (actions: any[]): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  const lpv = actions.find((a: any) => a.action_type === 'landing_page_view');
  return lpv ? parseInt(lpv.value) || 0 : 0;
};

// Extract cost per result by finding the highest priority action type
const extractCostPerResult = (
  costPerAction: any[],
  objective: string,
  spend: number,
  results: number,
  actions?: any[]
): number => {
  if (costPerAction && Array.isArray(costPerAction)) {
    // Find highest priority action type that has a cost
    for (const [actionType] of actionTypePriority) {
      const cpa = costPerAction.find(c => c.action_type === actionType);
      if (cpa) {
        return parseFloat(cpa.value) || 0;
      }
    }
  }

  // Fallback: calculate from spend / results
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

// Extract results using a configured goal (priority) or auto-detection
const extractResultsWithGoal = (
  actions: any[],
  objective: string,
  costPerAction: any[],
  goalType?: GoalType
): { count: number; type: string } => {
  if (!actions || !Array.isArray(actions)) {
    return { count: 0, type: goalType ? getGoalLabel(goalType) : getResultTypeFromObjective(objective) };
  }

  // If a goal is configured, use its specific action types
  if (goalType) {
    const goalActionTypes = getGoalActionTypes(goalType);
    for (const actionType of goalActionTypes) {
      const action = actions.find(a => a.action_type === actionType);
      if (action) {
        return { count: parseInt(action.value) || 0, type: getGoalLabel(goalType) };
      }
    }
    // If no matching action found, return 0 with the goal label
    return { count: 0, type: getGoalLabel(goalType) };
  }

  // Fall back to auto-detection
  return extractResults(actions, objective, costPerAction);
};

// Extract cost per result using a configured goal (priority) or auto-detection
const extractCostPerResultWithGoal = (
  costPerAction: any[],
  objective: string,
  spend: number,
  results: number,
  actions: any[],
  goalType?: GoalType
): number => {
  if (goalType && costPerAction && Array.isArray(costPerAction)) {
    const goalActionTypes = getGoalActionTypes(goalType);
    for (const actionType of goalActionTypes) {
      const cpa = costPerAction.find(c => c.action_type === actionType);
      if (cpa) {
        return parseFloat(cpa.value) || 0;
      }
    }
    // If no cost found but we have results, calculate manually
    if (results > 0 && spend > 0) {
      return spend / results;
    }
    return 0;
  }

  // Fall back to auto-detection
  return extractCostPerResult(costPerAction, objective, spend, results, actions);
};

export interface CampaignGoalsData {
  goals: Record<string, CampaignGoal>;
  defaultGoal?: GoalType | null;
}

export const useCampaigns = (
  clientId: string | null, 
  hasAdAccount: boolean, 
  datePreset: DatePresetKey = 'last_30d',
  customRange?: DateRange,
  campaignGoalsData?: CampaignGoalsData
) => {
  return useQuery({
    queryKey: ['meta-campaigns', clientId, datePreset, customRange?.from?.toISOString(), customRange?.to?.toISOString(), campaignGoalsData?.goals ? Object.keys(campaignGoalsData.goals).join(',') : '', campaignGoalsData?.defaultGoal || ''],
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
        
        // Check if there's a configured goal for this campaign, or use default
        const configuredGoal = campaignGoalsData?.goals?.[campaign.id];
        const goalType = (configuredGoal?.goal_type || campaignGoalsData?.defaultGoal) as GoalType | undefined;
        
        const { count: results, type: resultType } = extractResultsWithGoal(
          insights.actions, 
          objective, 
          insights.cost_per_action_type,
          goalType
        );
        const costPerResult = extractCostPerResultWithGoal(
          insights.cost_per_action_type, 
          objective, 
          spend, 
          results, 
          insights.actions,
          goalType
        );
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
          landingPageViews: extractLandingPageViews(insights.actions),
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
        const { count: results, type: resultType } = extractResults(insights.actions, objective, insights.cost_per_action_type);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective, spend, results, insights.actions);

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
          landingPageViews: extractLandingPageViews(insights.actions),
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
        const { count: results, type: resultType } = extractResults(insights.actions, objective, insights.cost_per_action_type);
        const costPerResult = extractCostPerResult(insights.cost_per_action_type, objective, spend, results, insights.actions);

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
          landingPageViews: extractLandingPageViews(insights.actions),
        };
      });
    },
    enabled: !!clientId && !!adsetId,
    staleTime: 5 * 60 * 1000,
  });
};

export interface AllAdItem {
  id: string;
  name: string;
  effectiveStatus: string;
  thumbnailUrl: string | null;
  campaignId: string;
  campaignName: string;
  spend: number;
}

export const useAllAds = (clientId: string | null, hasAdAccount: boolean, datePreset: DatePresetKey = 'last_30d') => {
  return useQuery({
    queryKey: ['meta-all-ads', clientId, datePreset],
    queryFn: async (): Promise<AllAdItem[]> => {
      if (!clientId || !hasAdAccount) return [];

      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'all-ads',
          params: { datePreset },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(getMetaErrorMessage(data.error));

      return (data?.data || []).map((ad: any) => {
        const insights = ad.insights?.data?.[0] || {};
        return {
          id: ad.id,
          name: ad.name,
          effectiveStatus: ad.effective_status,
          thumbnailUrl: ad.creative?.thumbnail_url || null,
          campaignId: ad.campaign?.id || '',
          campaignName: ad.campaign?.name || '',
          spend: parseFloat(insights.spend) || 0,
        };
      });
    },
    enabled: !!clientId && hasAdAccount,
    staleTime: 5 * 60 * 1000,
  });
};
