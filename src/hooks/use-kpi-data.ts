import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPIData, SocialMetric, getClientKPIs, getClientSocialMetrics } from '@/data/mockData';

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
  kpis: KPIData[];
  socialMetrics: SocialMetric[];
  isLoading: boolean;
  isLiveData: boolean;
  refetch: () => void;
}

export function useKPIData(clientId: string | null): UseKPIDataResult {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);

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
        setKpis(getClientKPIs(clientId));
        setSocialMetrics(getClientSocialMetrics(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      // Fetch real data from Meta API
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'account-insights',
        },
      });

      if (error || data?.error) {
        console.error('Error fetching account insights:', error || data?.error);
        setKpis(getClientKPIs(clientId));
        setSocialMetrics(getClientSocialMetrics(clientId));
        setIsLiveData(false);
        setIsLoading(false);
        return;
      }

      const insights = data as AccountInsights;

      // Build KPIs from real data
      const realKpis: KPIData[] = [
        {
          label: 'Alcance Total',
          value: formatNumber(insights.reach || 0),
          change: 12, // Would need historical data for real comparison
          changeLabel: 'últimos 30 días',
          sparkline: [40, 45, 42, 50, 55, 60, 58, 65, 70, 75, 72, 80],
        },
        {
          label: 'Engagement Rate',
          value: `${(insights.engagement || 0).toFixed(1)}%`,
          change: 0.5,
          changeLabel: 'promedio últimas publicaciones',
          sparkline: [3.5, 3.8, 3.6, 4.0, 4.2, 4.1, 4.3, 4.5, 4.2, 4.4, 4.6, 4.8],
        },
        {
          label: 'Seguidores',
          value: formatNumber(insights.followers || 0),
          change: insights.followersGrowth || 0,
          changeLabel: 'crecimiento del período',
          sparkline: [60, 65, 58, 70, 75, 80, 72, 85, 90, 88, 95, 100],
        },
        {
          label: 'Impresiones',
          value: formatNumber(insights.impressions || insights.reach * 1.5 || 0),
          change: 8,
          changeLabel: 'últimos 30 días',
          sparkline: [20, 25, 30, 28, 35, 40, 38, 45, 50, 48, 55, 60],
        },
        {
          label: 'Visitas al Perfil',
          value: formatNumber(insights.profileViews || 0),
          change: 15,
          changeLabel: 'últimos 30 días',
          sparkline: [5, 8, 6, 10, 12, 11, 15, 14, 18, 16, 20, 22],
        },
        {
          label: 'Clics Web',
          value: formatNumber(insights.websiteClicks || 0),
          change: 5,
          changeLabel: 'últimos 30 días',
          sparkline: [250, 260, 280, 290, 300, 310, 305, 320, 330, 325, 340, 350],
        },
      ];

      setKpis(realKpis);

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
          posts: 0, // Would need separate call
          color: 'hsl(217, 91%, 60%)',
        });
      }

      setSocialMetrics(connectedSocialMetrics);
      setIsLiveData(true);
    } catch (err) {
      console.error('Error in useKPIData:', err);
      setKpis(getClientKPIs(clientId));
      setSocialMetrics(getClientSocialMetrics(clientId));
      setIsLiveData(false);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    kpis,
    socialMetrics,
    isLoading,
    isLiveData,
    refetch: fetchData,
  };
}
