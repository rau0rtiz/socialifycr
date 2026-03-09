import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCampaigns, DatePresetKey, DateRange } from './use-ads-data';
import { useCampaignGoals, GoalType } from './use-campaign-goals';

export interface FunnelStage {
  id: string;
  name: string;
  value: number;
  source: 'meta' | 'sales' | 'manual';
}

export interface ConversionRate {
  from: string;
  to: string;
  rate: number; // 0-1
}

export interface FunnelProjection {
  stage: string;
  projected: number;
}

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  sourceName?: string;
  targetName?: string;
}

// Hook to fetch sales by date range (not just month)
export const useSalesByDateRange = (
  clientId: string | null,
  datePreset: DatePresetKey,
  customRange?: DateRange
) => {
  const { from, to } = useMemo(() => {
    if (datePreset === 'custom' && customRange?.from && customRange?.to) {
      return {
        from: customRange.from.toISOString().split('T')[0],
        to: customRange.to.toISOString().split('T')[0],
      };
    }

    const now = new Date();
    let fromDate: Date;
    let toDate = now;

    switch (datePreset) {
      case 'last_7d':
        fromDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'last_14d':
        fromDate = new Date(now.getTime() - 14 * 86400000);
        break;
      case 'last_30d':
        fromDate = new Date(now.getTime() - 30 * 86400000);
        break;
      case 'last_90d':
        fromDate = new Date(now.getTime() - 90 * 86400000);
        break;
      case 'this_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 86400000);
    }

    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
    };
  }, [datePreset, customRange]);

  return useQuery({
    queryKey: ['funnel-sales', clientId, from, to],
    queryFn: async () => {
      if (!clientId) return { sales: [], totalCount: 0, totalCRC: 0, totalUSD: 0, adSales: 0 };

      const { data, error } = await supabase
        .from('message_sales')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date', { ascending: false });

      if (error) throw error;

      const sales = data || [];
      const totalCRC = sales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
      const totalUSD = sales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
      const adSales = sales.filter(s => s.source === 'ad').length;

      // Break down by source
      const bySource = sales.reduce((acc, s) => {
        acc[s.source] = (acc[s.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Break down by campaign
      const byCampaign = sales.reduce((acc, s) => {
        if (s.ad_campaign_name) {
          acc[s.ad_campaign_name] = (acc[s.ad_campaign_name] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        sales,
        totalCount: sales.length,
        totalCRC,
        totalUSD,
        adSales,
        bySource,
        byCampaign,
      };
    },
    enabled: !!clientId,
  });
};

export const useFunnelAnalytics = (
  clientId: string | null,
  hasAdAccount: boolean,
  datePreset: DatePresetKey,
  customRange?: DateRange,
  selectedCampaignIds?: string[]
) => {
  const { data: campaignGoalsData } = useCampaignGoals(clientId);

  const {
    data: campaignsResult,
    isLoading: campaignsLoading,
    refetch: refetchCampaigns,
  } = useCampaigns(clientId, hasAdAccount, datePreset, customRange, campaignGoalsData);

  const {
    data: salesData,
    isLoading: salesLoading,
    refetch: refetchSales,
  } = useSalesByDateRange(clientId, datePreset, customRange);

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'USD';

  // Build funnel stages
  const funnelData = useMemo(() => {
    let filteredCampaigns = campaigns;
    if (selectedCampaignIds && selectedCampaignIds.length > 0 && !selectedCampaignIds.includes('all')) {
      filteredCampaigns = campaigns.filter(c => selectedCampaignIds.includes(c.id));
    }

    if (filteredCampaigns.length === 0 && !salesData?.totalCount) {
      return { stages: [], conversionRates: [] };
    }

    // Build goal lookup from campaignGoalsData
    const goalsMap = campaignGoalsData?.goals || {};
    const defaultGoal = campaignGoalsData?.defaultGoal;

    // Classify each campaign by its goal_type
    const getGoalForCampaign = (campaignId: string, resultType: string): string => {
      const goal = goalsMap[campaignId];
      if (goal) return goal.goal_type;
      if (defaultGoal) return defaultGoal;
      // Fallback: infer from resultType string
      const rType = (resultType || '').toLowerCase();
      if (rType.includes('compra') || rType.includes('purchase')) return 'purchases';
      if (rType.includes('conversaci') || rType.includes('mensaje') || rType.includes('message')) return 'messages';
      if (rType.includes('lead') || rType.includes('cliente')) return 'leads';
      if (rType.includes('seguidor') || rType.includes('follower')) return 'followers';
      if (rType.includes('visita') || rType.includes('profile')) return 'profile_visits';
      if (rType.includes('clic en enlace') || rType.includes('link')) return 'link_clicks';
      if (rType.includes('reproduccion') || rType.includes('video')) return 'video_views';
      return 'other';
    };

    // Track which goal types are present
    let hasConversationCampaigns = false;
    let hasPurchaseCampaigns = false;

    // Aggregate Meta metrics separating result types by goal
    const metaTotals = filteredCampaigns.reduce(
      (acc, c) => {
        acc.impressions += c.impressions;
        acc.reach += c.reach;
        acc.clicks += c.clicks;
        acc.spend += c.spend;
        acc.landingPageViews += c.landingPageViews;

        const goalType = getGoalForCampaign(c.id, c.resultType);

        if (goalType === 'purchases') {
          acc.purchases += c.results;
          hasPurchaseCampaigns = true;
        } else if (goalType === 'messages') {
          acc.conversations += c.results;
          hasConversationCampaigns = true;
        } else if (goalType === 'leads') {
          acc.leads += c.results;
        } else if (goalType === 'followers') {
          acc.followers += c.results;
        } else if (goalType === 'profile_visits') {
          acc.profileVisits += c.results;
        } else if (goalType === 'link_clicks') {
          acc.linkClicks += c.results;
        } else if (goalType === 'video_views') {
          acc.videoViews += c.results;
        } else {
          acc.otherResults += c.results;
        }
        return acc;
      },
      { impressions: 0, reach: 0, clicks: 0, spend: 0, landingPageViews: 0, purchases: 0, conversations: 0, leads: 0, followers: 0, profileVisits: 0, linkClicks: 0, videoViews: 0, otherResults: 0 }
    );

    const salesCount = salesData?.totalCount || 0;

    // Build stages
    const stages: FunnelStage[] = [];

    if (metaTotals.impressions > 0) {
      stages.push({ id: 'impressions', name: 'Impresiones', value: metaTotals.impressions, source: 'meta' });
    }
    if (metaTotals.reach > 0) {
      stages.push({ id: 'reach', name: 'Alcance', value: metaTotals.reach, source: 'meta' });
    }
    if (metaTotals.clicks > 0) {
      stages.push({ id: 'clicks', name: 'Clics', value: metaTotals.clicks, source: 'meta' });
    }
    if (metaTotals.landingPageViews > 0) {
      stages.push({ id: 'lpv', name: 'Landing Page Views', value: metaTotals.landingPageViews, source: 'meta' });
    }
    if (metaTotals.conversations > 0) {
      stages.push({ id: 'conversations', name: 'Conversaciones', value: metaTotals.conversations, source: 'meta' });
    }
    if (metaTotals.leads > 0) {
      stages.push({ id: 'leads', name: 'Leads', value: metaTotals.leads, source: 'meta' });
    }
    if (metaTotals.linkClicks > 0) {
      stages.push({ id: 'linkClicks', name: 'Clics en enlace', value: metaTotals.linkClicks, source: 'meta' });
    }
    if (metaTotals.videoViews > 0) {
      stages.push({ id: 'videoViews', name: 'Reproducciones', value: metaTotals.videoViews, source: 'meta' });
    }
    if (metaTotals.profileVisits > 0) {
      stages.push({ id: 'profileVisits', name: 'Visitas al perfil', value: metaTotals.profileVisits, source: 'meta' });
    }
    if (metaTotals.followers > 0) {
      stages.push({ id: 'followers', name: 'Seguidores', value: metaTotals.followers, source: 'meta' });
    }
    if (metaTotals.otherResults > 0) {
      stages.push({ id: 'results', name: 'Otros Resultados', value: metaTotals.otherResults, source: 'meta' });
    }
    // Purchase campaigns: funnel ends at Compras (Meta) — NOT linked to manual sales
    if (metaTotals.purchases > 0) {
      stages.push({ id: 'purchases', name: 'Compras (Meta)', value: metaTotals.purchases, source: 'meta' });
    }
    // Conversation campaigns: link to manual Ventas Cerradas
    // Only show Ventas Cerradas if there are conversation campaigns OR no purchase-only campaigns
    const shouldShowManualSales = salesCount > 0 && (hasConversationCampaigns || (!hasPurchaseCampaigns && !hasConversationCampaigns));
    if (shouldShowManualSales) {
      stages.push({ id: 'sales', name: 'Ventas Cerradas', value: salesCount, source: 'sales' });
    }

    // Calculate conversion rates between consecutive stages
    const conversionRates: ConversionRate[] = [];
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1];
      const curr = stages[i];
      conversionRates.push({
        from: prev.name,
        to: curr.name,
        rate: prev.value > 0 ? curr.value / prev.value : 0,
      });
    }

    return {
      stages,
      conversionRates,
      metaTotals,
      salesData,
      currency,
      spend: metaTotals.spend,
    };
  }, [campaigns, salesData, selectedCampaignIds, currency, campaignGoalsData]);

  // Projection calculator: given a target at any stage, project others
  const calculateProjection = (targetStageId: string, targetValue: number): FunnelProjection[] => {
    const { stages, conversionRates } = funnelData;
    if (stages.length < 2) return [];

    const targetIdx = stages.findIndex(s => s.id === targetStageId);
    if (targetIdx === -1) return [];

    const projections: FunnelProjection[] = stages.map(s => ({
      stage: s.name,
      projected: 0,
    }));

    projections[targetIdx].projected = targetValue;

    // Project backwards (what do I need to get targetValue at this stage?)
    let currentValue = targetValue;
    for (let i = targetIdx - 1; i >= 0; i--) {
      const rate = conversionRates[i]?.rate || 0;
      currentValue = rate > 0 ? currentValue / rate : 0;
      projections[i].projected = Math.round(currentValue);
    }

    // Project forwards (what will I get from targetValue at this stage?)
    currentValue = targetValue;
    for (let i = targetIdx; i < stages.length - 1; i++) {
      const rate = conversionRates[i]?.rate || 0;
      currentValue = currentValue * rate;
      projections[i + 1].projected = Math.round(currentValue);
    }

    return projections;
  };

  return {
    ...funnelData,
    campaigns,
    isLoading: campaignsLoading || salesLoading,
    refetch: async () => {
      await Promise.all([refetchCampaigns(), refetchSales()]);
    },
    calculateProjection,
  };
};
