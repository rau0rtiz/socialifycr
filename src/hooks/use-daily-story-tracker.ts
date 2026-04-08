import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['daily-story-tracker', clientId, startOfMonth, endOfMonth],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('daily_story_tracker' as any)
        .select('*')
        .eq('client_id', clientId)
        .gte('track_date', startOfMonth)
        .lte('track_date', endOfMonth)
        .order('track_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DailyStoryEntry[];
    },
    enabled: !!clientId,
  });

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

  // Last 30 days for chart (fetch separately)
  const last30Query = useQuery({
    queryKey: ['daily-story-tracker-30d', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('daily_story_tracker' as any)
        .select('*')
        .eq('client_id', clientId)
        .gte('track_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('track_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DailyStoryEntry[];
    },
    enabled: !!clientId,
  });

  const entriesByDate = (query.data || []).reduce((acc, e) => {
    acc[e.track_date] = e;
    return acc;
  }, {} as Record<string, DailyStoryEntry>);

  const totals = (query.data || []).reduce(
    (acc, e) => ({
      stories_count: acc.stories_count + e.stories_count,
      daily_revenue: acc.daily_revenue + e.daily_revenue,
    }),
    { stories_count: 0, daily_revenue: 0 }
  );

  return {
    entries: query.data || [],
    entriesByDate,
    totals,
    chartData: last30Query.data || [],
    isLoading: query.isLoading,
    upsertEntry,
  };
};
