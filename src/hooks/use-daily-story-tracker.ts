import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';

export interface DailyStoryEntry {
  id: string;
  client_id: string;
  track_date: string;
  stories_count: number;
  daily_revenue: number;
  currency: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DailyStoryInput {
  track_date: string;
  stories_count: number;
  daily_revenue: number;
  currency?: string;
  notes?: string;
}

export const useDailyStoryTracker = (clientId: string | null, month?: Date) => {
  const targetMonth = month || new Date();
  const startOfM = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endOfM = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  // Fetch archived stories grouped by day
  const storiesQuery = useQuery({
    queryKey: ['auto-story-count', clientId, startOfM, endOfM],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('archived_stories')
        .select('timestamp')
        .eq('client_id', clientId)
        .gte('timestamp', `${startOfM}T00:00:00`)
        .lte('timestamp', `${endOfM}T23:59:59`)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        const day = format(new Date(s.timestamp), 'yyyy-MM-dd');
        grouped[day] = (grouped[day] || 0) + 1;
      });
      return grouped;
    },
    enabled: !!clientId,
  });

  // Fetch story-linked sales grouped by day
  const salesQuery = useQuery({
    queryKey: ['auto-story-sales', clientId, startOfM, endOfM],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('message_sales')
        .select('sale_date, amount, currency')
        .eq('client_id', clientId)
        .not('story_id', 'is', null)
        .neq('status', 'cancelled')
        .gte('sale_date', startOfM)
        .lte('sale_date', endOfM);
      if (error) throw error;
      const grouped: Record<string, { amount: number; currency: string }> = {};
      (data || []).forEach((s: any) => {
        const day = s.sale_date;
        if (!grouped[day]) grouped[day] = { amount: 0, currency: s.currency || 'CRC' };
        grouped[day].amount += Number(s.amount);
      });
      return grouped;
    },
    enabled: !!clientId,
  });

  // Build entries from the two queries
  const storyCountsByDate = storiesQuery.data || {};
  const salesByDate = salesQuery.data || {};

  const allDates = new Set([...Object.keys(storyCountsByDate), ...Object.keys(salesByDate)]);

  const entries: DailyStoryEntry[] = Array.from(allDates)
    .filter(d => d >= startOfM && d <= endOfM)
    .sort()
    .map(d => ({
      id: d,
      client_id: clientId || '',
      track_date: d,
      stories_count: storyCountsByDate[d] || 0,
      daily_revenue: salesByDate[d]?.amount || 0,
      currency: salesByDate[d]?.currency || 'CRC',
      notes: null,
      created_by: '',
      created_at: '',
      updated_at: '',
    }));

  const entriesByDate = entries.reduce((acc, e) => {
    acc[e.track_date] = e;
    return acc;
  }, {} as Record<string, DailyStoryEntry>);

  const totals = entries.reduce(
    (acc, e) => ({
      stories_count: acc.stories_count + e.stories_count,
      daily_revenue: acc.daily_revenue + e.daily_revenue,
    }),
    { stories_count: 0, daily_revenue: 0 }
  );

  // Last 30 days chart data
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const chartStoriesQuery = useQuery({
    queryKey: ['auto-story-count-30d', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('archived_stories')
        .select('timestamp')
        .eq('client_id', clientId)
        .gte('timestamp', `${thirtyDaysAgo}T00:00:00`)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        const day = format(new Date(s.timestamp), 'yyyy-MM-dd');
        grouped[day] = (grouped[day] || 0) + 1;
      });
      return grouped;
    },
    enabled: !!clientId,
  });

  const chartSalesQuery = useQuery({
    queryKey: ['auto-story-sales-30d', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('message_sales')
        .select('sale_date, amount, currency')
        .eq('client_id', clientId)
        .not('story_id', 'is', null)
        .neq('status', 'cancelled')
        .gte('sale_date', thirtyDaysAgo);
      if (error) throw error;
      const grouped: Record<string, { amount: number; currency: string }> = {};
      (data || []).forEach((s: any) => {
        const day = s.sale_date;
        if (!grouped[day]) grouped[day] = { amount: 0, currency: s.currency || 'CRC' };
        grouped[day].amount += Number(s.amount);
      });
      return grouped;
    },
    enabled: !!clientId,
  });

  const chartStories = chartStoriesQuery.data || {};
  const chartSales = chartSalesQuery.data || {};
  const chartAllDates = new Set([...Object.keys(chartStories), ...Object.keys(chartSales)]);

  const chartData: DailyStoryEntry[] = Array.from(chartAllDates)
    .sort()
    .map(d => ({
      id: d,
      client_id: clientId || '',
      track_date: d,
      stories_count: chartStories[d] || 0,
      daily_revenue: chartSales[d]?.amount || 0,
      currency: chartSales[d]?.currency || 'CRC',
      notes: null,
      created_by: '',
      created_at: '',
      updated_at: '',
    }));

  return {
    entries,
    entriesByDate,
    totals,
    chartData,
    isLoading: storiesQuery.isLoading || salesQuery.isLoading,
  };
};
