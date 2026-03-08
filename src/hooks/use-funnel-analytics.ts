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
  selectedCampaignId?: string
) => {
  const { selectedClient } = require('@/contexts/BrandContext').useBrand();
  const defaultGoal = selectedClient?.default_campaign_goal as GoalType | undefined;
  const { data: campaignGoalsData } = useCampaignGoals(clientId, defaultGoal);

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
    if (selectedCampaignId && selectedCampaignId !== 'all') {
      filteredCampaigns = campaigns.filter(c => c.id === selectedCampaignId);
    }

    if (filteredCampaigns.length === 0 && !salesData?.totalCount) {
      return { stages: [], conversionRates: [], sankeyNodes: [], sankeyLinks: [] };
    }

    // Aggregate Meta metrics
    const metaTotals = filteredCampaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.impressions,
        reach: acc.reach + c.reach,
        clicks: acc.clicks + c.clicks,
        results: acc.results + c.results,
        spend: acc.spend + c.spend,
        landingPageViews: acc.landingPageViews + c.landingPageViews,
      }),
      { impressions: 0, reach: 0, clicks: 0, results: 0, spend: 0, landingPageViews: 0 }
    );

    const resultType = filteredCampaigns.find(c => c.resultType)?.resultType || 'Resultados';
    const salesCount = salesData?.totalCount || 0;

    // Build stages: Impressions → Reach → Clicks → Results(Messages) → Sales
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
    if (metaTotals.results > 0) {
      stages.push({ id: 'results', name: resultType, value: metaTotals.results, source: 'meta' });
    }
    if (salesCount > 0) {
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

    // Build Sankey data
    // Nodes: each stage + breakdown by campaign for results and sales
    const sankeyNodes: SankeyNode[] = [];
    const sankeyLinks: SankeyLink[] = [];

    // Simple sankey: stages as nodes
    stages.forEach(s => sankeyNodes.push({ name: s.name }));

    // Links between consecutive stages
    for (let i = 0; i < stages.length - 1; i++) {
      sankeyLinks.push({
        source: i,
        target: i + 1,
        value: stages[i + 1].value,
        sourceName: stages[i].name,
        targetName: stages[i + 1].name,
      });
    }

    // Add campaign breakdown nodes for detailed sankey
    if (filteredCampaigns.length > 1 && selectedCampaignId === 'all') {
      const campaignStartIdx = sankeyNodes.length;
      filteredCampaigns.forEach((c, idx) => {
        sankeyNodes.push({ name: c.name });
        // Link from Impressions to each campaign
        if (c.impressions > 0) {
          sankeyLinks.push({
            source: 0, // Impressions
            target: campaignStartIdx + idx,
            value: c.impressions,
            sourceName: 'Impresiones',
            targetName: c.name,
          });
        }
      });
    }

    // Sales source breakdown
    if (salesData?.bySource && salesCount > 0) {
      const salesIdx = stages.findIndex(s => s.id === 'sales');
      if (salesIdx >= 0) {
        const sourceStartIdx = sankeyNodes.length;
        Object.entries(salesData.bySource).forEach(([source, count], idx) => {
          const sourceLabels: Record<string, string> = {
            ad: 'Publicidad',
            story: 'Historia',
            referral: 'Referencia',
            organic: 'Orgánico',
            other: 'Otro',
          };
          sankeyNodes.push({ name: sourceLabels[source] || source });
          sankeyLinks.push({
            source: salesIdx,
            target: sourceStartIdx + idx,
            value: count as number,
            sourceName: 'Ventas Cerradas',
            targetName: sourceLabels[source] || source,
          });
        });
      }
    }

    return {
      stages,
      conversionRates,
      sankeyNodes,
      sankeyLinks,
      metaTotals,
      salesData,
      currency,
      spend: metaTotals.spend,
    };
  }, [campaigns, salesData, selectedCampaignId, currency]);

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
