import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SetterDailyReport {
  id: string;
  client_id: string;
  report_date: string;
  ig_conversations: number;
  wa_conversations: number;
  followups: number;
  appointments_made: number;
  day_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DailyReportInput {
  report_date: string;
  ig_conversations: number;
  wa_conversations: number;
  followups: number;
  appointments_made: number;
  day_notes?: string;
}

export const useSetterDailyReports = (clientId: string | null, month?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['setter-daily-reports', clientId, startOfMonth, endOfMonth],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('setter_daily_reports' as any)
        .select('*')
        .eq('client_id', clientId)
        .gte('report_date', startOfMonth)
        .lte('report_date', endOfMonth)
        .order('report_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SetterDailyReport[];
    },
    enabled: !!clientId,
  });

  const upsertReport = useMutation({
    mutationFn: async (input: DailyReportInput) => {
      if (!clientId || !user?.id) throw new Error('Missing client or user');
      
      // Check if report exists for this date
      const { data: existing } = await supabase
        .from('setter_daily_reports' as any)
        .select('id')
        .eq('client_id', clientId)
        .eq('report_date', input.report_date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('setter_daily_reports' as any)
          .update({
            ig_conversations: input.ig_conversations,
            wa_conversations: input.wa_conversations,
            followups: input.followups,
            appointments_made: input.appointments_made,
            day_notes: input.day_notes || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('setter_daily_reports' as any)
          .insert({
            client_id: clientId,
            report_date: input.report_date,
            ig_conversations: input.ig_conversations,
            wa_conversations: input.wa_conversations,
            followups: input.followups,
            appointments_made: input.appointments_made,
            day_notes: input.day_notes || null,
            created_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setter-daily-reports', clientId] });
    },
  });

  // Build a map of date string -> report for quick lookup
  const reportsByDate = (query.data || []).reduce((acc, r) => {
    acc[r.report_date] = r;
    return acc;
  }, {} as Record<string, SetterDailyReport>);

  // Aggregated totals for the month
  const totals = (query.data || []).reduce(
    (acc, r) => ({
      ig_conversations: acc.ig_conversations + r.ig_conversations,
      wa_conversations: acc.wa_conversations + r.wa_conversations,
      followups: acc.followups + r.followups,
      appointments_made: acc.appointments_made + r.appointments_made,
      totalConversations: acc.totalConversations + r.ig_conversations + r.wa_conversations,
    }),
    { ig_conversations: 0, wa_conversations: 0, followups: 0, appointments_made: 0, totalConversations: 0 }
  );

  return {
    reports: query.data || [],
    reportsByDate,
    totals,
    isLoading: query.isLoading,
    upsertReport,
  };
};
