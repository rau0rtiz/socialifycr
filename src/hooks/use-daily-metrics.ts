import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetric, getClientDailyMetrics } from '@/data/mockData';
import { useTargetedMetaConnections } from './use-targeted-meta-connections';

interface UseDailyMetricsResult {
  dailyMetrics: DailyMetric[];
  isLoading: boolean;
  isLiveData: boolean;
  source: 'instagram' | 'facebook' | 'mock';
  refetch: () => void;
}

export function useDailyMetrics(clientId: string | null, days: number = 30): UseDailyMetricsResult {
  const { connections: metaConnections, isLoading: connectionsLoading } = useTargetedMetaConnections(clientId);

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
      if (metaConnections.length === 0) {
        setDailyMetrics(getClientDailyMetrics(clientId));
        setIsLiveData(false);
        setSource('mock');
        setIsLoading(false);
        return;
      }

      // Fetch in parallel for every active Meta connection.
      const responses = await Promise.all(
        metaConnections.map((conn) =>
          supabase.functions.invoke('meta-api', {
            body: { clientId, endpoint: 'daily-insights', params: { days }, connectionId: conn.id },
          })
        )
      );

      // Aggregate by date — sum numeric metrics across connections.
      const byDate = new Map<string, DailyMetric>();
      let detectedSource: 'instagram' | 'facebook' | 'mock' = 'mock';

      for (const { data, error } of responses) {
        if (error || data?.error || !data?.data) continue;
        if (data.source === 'instagram' || data.source === 'facebook') {
          detectedSource = data.source;
        }
        for (const item of data.data as DailyMetric[]) {
          const existing = byDate.get(item.date);
          if (!existing) {
            byDate.set(item.date, { ...item });
          } else {
            byDate.set(item.date, {
              ...existing,
              reach: (existing.reach || 0) + (item.reach || 0),
              impressions: (existing.impressions || 0) + (item.impressions || 0),
              engagement: (existing.engagement || 0) + (item.engagement || 0),
              followers: Math.max(existing.followers || 0, item.followers || 0),
            });
          }
        }
      }

      if (byDate.size > 0) {
        const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
        setDailyMetrics(merged);
        setIsLiveData(true);
        setSource(detectedSource);
      } else {
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
  }, [clientId, days, metaConnections]);

  useEffect(() => {
    if (!connectionsLoading) fetchData();
  }, [fetchData, connectionsLoading]);

  return {
    dailyMetrics,
    isLoading: connectionsLoading || isLoading,
    isLiveData,
    source,
    refetch: fetchData,
  };
}
