import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetric, getClientDailyMetrics } from '@/data/mockData';

interface UseDailyMetricsResult {
  dailyMetrics: DailyMetric[];
  isLoading: boolean;
  isLiveData: boolean;
  source: 'instagram' | 'facebook' | 'mock';
  refetch: () => void;
}

export function useDailyMetrics(clientId: string | null, days: number = 30): UseDailyMetricsResult {
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [source, setSource] = useState<'instagram' | 'facebook' | 'mock'>('mock');

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setDailyMetrics([]);
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
        setDailyMetrics(getClientDailyMetrics(clientId));
        setIsLiveData(false);
        setSource('mock');
        setIsLoading(false);
        return;
      }

      // Fetch real data from Meta API
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'daily-insights',
          params: { days },
        },
      });

      if (error || data?.error) {
        console.error('Error fetching daily insights:', error || data?.error);
        setDailyMetrics(getClientDailyMetrics(clientId));
        setIsLiveData(false);
        setSource('mock');
        setIsLoading(false);
        return;
      }

      if (data?.data && data.data.length > 0) {
        setDailyMetrics(data.data);
        setIsLiveData(true);
        setSource(data.source || 'instagram');
      } else {
        // No data returned, use mock
        setDailyMetrics(getClientDailyMetrics(clientId));
        setIsLiveData(false);
        setSource('mock');
      }
    } catch (err) {
      console.error('Error in useDailyMetrics:', err);
      setDailyMetrics(getClientDailyMetrics(clientId));
      setIsLiveData(false);
      setSource('mock');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    dailyMetrics,
    isLoading,
    isLiveData,
    source,
    refetch: fetchData,
  };
}
