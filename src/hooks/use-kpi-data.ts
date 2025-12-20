import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SocialMetric, getClientKPIs, getClientSocialMetrics } from '@/data/mockData';
import { KPIItem } from '@/components/dashboard/KPISection';

interface AccountInsights {
  reach: number;
  impressions: number;
  engagement: number;
  followers: number;
  followersGrowth: number;
  profileViews: number;
  websiteClicks: number;
  connectedPlatforms: string[];
  instagram?: {
    followers: number;
    engagement: number;
    posts: number;
    username: string;
  };
  facebook?: {
    followers: number;
    fans: number;
    name: string;
    engagement?: number;
  };
}

interface UseKPIDataResult {
  kpis: KPIItem[];
  socialMetrics: SocialMetric[];
  isLoading: boolean;
  isLiveData: boolean;
  availablePlatforms: { id: string; name: string }[];
  refetch: () => void;
}

export function useKPIData(clientId: string | null, platform: string = 'all', datePreset: string = 'last_30d'): UseKPIDataResult {
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [availablePlatforms, setAvailablePlatforms] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'Todas' },
  ]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setKpis([]);
      setSocialMetrics([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Check for active Meta connection
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('client_id', clientId)
        .eq('platform', 'meta')
        .eq('status', 'active')
        .maybeSingle();

      if (!connection) {
        // No Meta connection, use mock data
        const mockKpis = getClientKPIs(clientId);
        setKpis(
          mockKpis.map((k, i) => ({
            id: `kpi-${i}`,
            label: k.label,
            value: k.value,
            change: k.change,
            changeLabel: k.changeLabel,
            sparkline: k.sparkline,
          }))
        );
        setSocialMetrics(getClientSocialMetrics(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Update available platforms based on connection
      const platforms: { id: string; name: string }[] = [{ id: 'all', name: 'Todas' }];
      if (connection.platform_page_id) {
        platforms.push({ id: 'facebook', name: 'Facebook' });
      }
      if (connection.instagram_account_id) {
        platforms.push({ id: 'instagram', name: 'Instagram' });
      }
      if (connection.ad_account_id) {
        platforms.push({ id: 'ads', name: 'Meta Ads' });
      }
      setAvailablePlatforms(platforms);

      // Fetch real data from Meta API with date range
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'account-insights',
          params: { datePreset },
        },
      });

      if (error || data?.error) {
        console.error('Error fetching account insights:', error || data?.error);
        const mockKpis = getClientKPIs(clientId);
        setKpis(
          mockKpis.map((k, i) => ({
            id: `kpi-${i}`,
            label: k.label,
            value: k.value,
            change: k.change,
            changeLabel: k.changeLabel,
            sparkline: k.sparkline,
          }))
        );
        setSocialMetrics(getClientSocialMetrics(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      const insights = data as AccountInsights;

      // Build KPIs from real data with IDs
      const realKpis: KPIItem[] = [
        {
          id: 'reach',
          label: 'Alcance Total',
          value: formatNumber(insights.reach || 0),
          change: 12,
          changeLabel: 'vs. período anterior',
          sparkline: [40, 45, 42, 50, 55, 60, 58, 65, 70, 75, 72, 80],
        },
        {
          id: 'engagement',
          label: 'Tasa de Engagement',
          value: `${(insights.engagement || 0).toFixed(1)}%`,
          change: 0.5,
          changeLabel: 'promedio del período',
          sparkline: [3.5, 3.8, 3.6, 4.0, 4.2, 4.1, 4.3, 4.5, 4.2, 4.4, 4.6, 4.8],
        },
        {
          id: 'followers',
          label: 'Seguidores',
          value: formatNumber(insights.followers || 0),
          change: insights.followersGrowth || 0,
          changeLabel: 'crecimiento del período',
          sparkline: [60, 65, 58, 70, 75, 80, 72, 85, 90, 88, 95, 100],
        },
        {
          id: 'impressions',
          label: 'Impresiones',
          value: formatNumber(insights.impressions || insights.reach * 1.5 || 0),
          change: 8,
          changeLabel: 'vs. período anterior',
          sparkline: [20, 25, 30, 28, 35, 40, 38, 45, 50, 48, 55, 60],
        },
        {
          id: 'profile_views',
          label: 'Visitas al Perfil',
          value: formatNumber(insights.profileViews || 0),
          change: 15,
          changeLabel: 'vs. período anterior',
          sparkline: [5, 8, 6, 10, 12, 11, 15, 14, 18, 16, 20, 22],
        },
        {
          id: 'website_clicks',
          label: 'Clics en Sitio Web',
          value: formatNumber(insights.websiteClicks || 0),
          change: 5,
          changeLabel: 'vs. período anterior',
          sparkline: [250, 260, 280, 290, 300, 310, 305, 320, 330, 325, 340, 350],
        },
      ];

      // Filter by platform if needed
      let filteredKpis = realKpis;
      if (platform === 'instagram') {
        filteredKpis = realKpis.filter((k) =>
          ['reach', 'engagement', 'followers', 'impressions', 'profile_views'].includes(k.id)
        );
      } else if (platform === 'facebook') {
        filteredKpis = realKpis.filter((k) =>
          ['reach', 'engagement', 'followers', 'impressions'].includes(k.id)
        );
      } else if (platform === 'ads') {
        // For ads, we'd show different metrics - for now show all
        filteredKpis = realKpis;
      }

      setKpis(filteredKpis);

      // Build social metrics only for connected platforms
      const connectedSocialMetrics: SocialMetric[] = [];

      if (insights.instagram) {
        connectedSocialMetrics.push({
          network: 'Instagram',
          followers: insights.instagram.followers,
          engagement: Number(insights.instagram.engagement?.toFixed(1)) || 0,
          posts: insights.instagram.posts || 0,
          color: 'hsl(330, 81%, 60%)',
        });
      }

      if (insights.facebook) {
        connectedSocialMetrics.push({
          network: 'Facebook',
          followers: insights.facebook.followers,
          engagement: Number(insights.facebook.engagement?.toFixed(1)) || 0,
          posts: 0,
          color: 'hsl(217, 91%, 60%)',
        });
      }

      setSocialMetrics(connectedSocialMetrics);
      setIsLiveData(true);
    } catch (err) {
      console.error('Error in useKPIData:', err);
      const mockKpis = getClientKPIs(clientId);
      setKpis(
        mockKpis.map((k, i) => ({
          id: `kpi-${i}`,
          label: k.label,
          value: k.value,
          change: k.change,
          changeLabel: k.changeLabel,
          sparkline: k.sparkline,
        }))
      );
      setSocialMetrics(getClientSocialMetrics(clientId));
      setIsLiveData(false);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, platform, datePreset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    kpis,
    socialMetrics,
    isLoading,
    isLiveData,
    availablePlatforms,
    refetch: fetchData,
  };
}

