import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

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
  has_override?: boolean;
  auto_stories?: number;
  auto_revenue?: number;
  override_stories?: number;
  override_revenue?: number;
}

export interface DailyStoryInput {
  track_date: string;
  stories_count: number;
  daily_revenue: number;
  currency?: string;
  notes?: string;
}

export const useDailyStoryTracker = (clientId: string | null, month?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const targetMonth = month || new Date();
  const startOfM = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endOfM = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  // Auto: archived stories grouped by day
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

  // Auto: story-linked sales grouped by day
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

  // Manual overrides from daily_story_tracker
  const overridesQuery = useQuery({
    queryKey: ['daily-story-tracker', clientId, startOfM, endOfM],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('daily_story_tracker' as any)
        .select('*')
        .eq('client_id', clientId)
        .gte('track_date', startOfM)
        .lte('track_date', endOfM)
        .order('track_date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!clientId,
  });

  // Merge: auto + overrides (overrides ADD to auto values)
  const storyCountsByDate = storiesQuery.data || {};
  const salesByDate = salesQuery.data || {};
  const overrides = overridesQuery.data || [];
  const overridesByDate: Record<string, any> = {};
  overrides.forEach((o: any) => { overridesByDate[o.track_date] = o; });

  const allDates = new Set([
    ...Object.keys(storyCountsByDate),
    ...Object.keys(salesByDate),
    ...Object.keys(overridesByDate),
  ]);

  const entries: DailyStoryEntry[] = Array.from(allDates)
    .filter(d => d >= startOfM && d <= endOfM)
    .sort()
    .map(d => {
      const autoStories = storyCountsByDate[d] || 0;
      const autoRevenue = salesByDate[d]?.amount || 0;
      const override = overridesByDate[d];
      const overrideStories = override?.stories_count || 0;
      const overrideRevenue = override?.daily_revenue || 0;

      return {
        id: override?.id || d,
        client_id: clientId || '',
        track_date: d,
        stories_count: autoStories + overrideStories,
        daily_revenue: autoRevenue + overrideRevenue,
        currency: override?.currency || salesByDate[d]?.currency || 'CRC',
        notes: override?.notes || null,
        created_by: override?.created_by || '',
        created_at: override?.created_at || '',
        updated_at: override?.updated_at || '',
        has_override: !!override,
        auto_stories: autoStories,
        auto_revenue: autoRevenue,
        override_stories: overrideStories,
        override_revenue: overrideRevenue,
      };
    });

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

  // Upsert manual override
  const upsertEntry = useMutation({
    mutationFn: async (input: DailyStoryInput) => {
      if (!clientId || !user?.id) throw new Error('Missing client or user');

      const { data: existing } = await supabase
        .from('daily_story_tracker' as any)
        .select('id')
        .eq('client_id', clientId)
        .eq('track_date', input.track_date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('daily_story_tracker' as any)
          .update({
            stories_count: input.stories_count,
            daily_revenue: input.daily_revenue,
            currency: input.currency || 'CRC',
            notes: input.notes || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_story_tracker' as any)
          .insert({
            client_id: clientId,
            track_date: input.track_date,
            stories_count: input.stories_count,
            daily_revenue: input.daily_revenue,
            currency: input.currency || 'CRC',
            notes: input.notes || null,
            created_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-story-tracker', clientId] });
    },
  });

  // Delete override
  const deleteOverride = useMutation({
    mutationFn: async (trackDate: string) => {
      if (!clientId) throw new Error('Missing client');
      const { error } = await supabase
        .from('daily_story_tracker' as any)
        .delete()
        .eq('client_id', clientId)
        .eq('track_date', trackDate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-story-tracker', clientId] });
    },
  });

  // 30-day chart data
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

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

  const chart30Overrides = useQuery({
    queryKey: ['daily-story-tracker-30d', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('daily_story_tracker' as any)
        .select('*')
        .eq('client_id', clientId)
        .gte('track_date', thirtyDaysAgo)
        .order('track_date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!clientId,
  });

  const chartStories = chartStoriesQuery.data || {};
  const chartSales = chartSalesQuery.data || {};
  const chart30OverridesByDate: Record<string, any> = {};
  (chart30Overrides.data || []).forEach((o: any) => { chart30OverridesByDate[o.track_date] = o; });

  const chartAllDates = new Set([
    ...Object.keys(chartStories),
    ...Object.keys(chartSales),
    ...Object.keys(chart30OverridesByDate),
  ]);

  const chartData: DailyStoryEntry[] = Array.from(chartAllDates)
    .sort()
    .map(d => ({
      id: d,
      client_id: clientId || '',
      track_date: d,
      stories_count: (chartStories[d] || 0) + (chart30OverridesByDate[d]?.stories_count || 0),
      daily_revenue: (chartSales[d]?.amount || 0) + (chart30OverridesByDate[d]?.daily_revenue || 0),
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
    upsertEntry,
    deleteOverride,
  };
};
