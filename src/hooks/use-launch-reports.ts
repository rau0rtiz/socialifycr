import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface LaunchReport {
  id: string;
  client_id: string;
  launch_id: string;
  report_date: string; // YYYY-MM-DD
  campaign_id: string | null;
  campaign_name: string | null;
  spend_snapshot: number;
  conversations_snapshot: number;
  currency: string;
  group_signups: number;
  manychat_ctr: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Launch {
  id: string;
  client_id: string;
  name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  status: 'active' | 'archived';
  started_at: string;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

export function useLaunches(clientId: string | null) {
  return useQuery({
    queryKey: ['launches', clientId],
    queryFn: async () => {
      if (!clientId) return [] as Launch[];
      const { data, error } = await supabase
        .from('launches' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Launch[];
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
}

export function useCreateLaunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      client_id: string;
      name: string;
      campaign_id?: string | null;
      campaign_name?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('launches' as any)
        .insert({ ...payload, status: 'active', created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Launch;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['launches', vars.client_id] });
    },
  });
}

export function useUpdateLaunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id, ...patch }: Partial<Launch> & { id: string; client_id: string }) => {
      const { error } = await supabase.from('launches' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['launches', vars.client_id] });
    },
  });
}

export function useArchiveLaunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase
        .from('launches' as any)
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['launches', vars.client_id] });
    },
  });
}

export function useLaunchReports(launchId: string | null) {
  return useQuery({
    queryKey: ['launch-reports', launchId],
    queryFn: async () => {
      if (!launchId) return [] as LaunchReport[];
      const { data, error } = await supabase
        .from('launch_daily_reports' as any)
        .select('*')
        .eq('launch_id', launchId)
        .order('report_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LaunchReport[];
    },
    enabled: !!launchId,
    staleTime: 60_000,
  });
}

export function useUpsertLaunchReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<LaunchReport> & { client_id: string; launch_id: string; report_date: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const created_by = userData.user?.id;

      const { data, error } = await supabase
        .from('launch_daily_reports' as any)
        .upsert({ ...payload, created_by }, { onConflict: 'launch_id,report_date' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LaunchReport;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['launch-reports', vars.launch_id] });
    },
  });
}

export function useDeleteLaunchReport(launchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('launch_daily_reports' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['launch-reports', launchId] });
    },
  });
}

export interface MetaCampaignOption {
  id: string;
  name: string;
  objective?: string;
}

export interface CampaignInsightsForDay {
  spend: number;
  conversations: number;
  currency: string;
}

/** Fetch all campaigns (including paused/completed) for the selector. */
export function useLaunchCampaigns(clientId: string | null, connectionId: string | null) {
  return useQuery({
    queryKey: ['launch-campaigns', clientId, connectionId],
    queryFn: async () => {
      if (!clientId || !connectionId) return [] as MetaCampaignOption[];
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint: 'campaigns', connectionId, params: { includeAllStatuses: true } },
      });
      if (error || data?.error) {
        console.error('useLaunchCampaigns error', error || data?.error);
        return [];
      }
      const list = (data?.data || data?.campaigns || []) as any[];
      return list.map((c) => ({ id: c.id, name: c.name, objective: c.objective })) as MetaCampaignOption[];
    },
    enabled: !!clientId && !!connectionId,
    staleTime: 5 * 60_000,
  });
}

/** Fetch insights for a single campaign on a specific date — uses dedicated endpoint. */
export function useCampaignDayInsights(
  clientId: string | null,
  connectionId: string | null,
  campaignId: string | null,
  date: Date | null,
) {
  return useQuery({
    queryKey: ['launch-campaign-insights', clientId, connectionId, campaignId, date ? toDateStr(date) : null],
    queryFn: async (): Promise<CampaignInsightsForDay | null> => {
      if (!clientId || !connectionId || !campaignId || !date) return null;
      const dateStr = toDateStr(date);
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'campaign-insights',
          connectionId,
          params: {
            campaignId,
            since: dateStr,
            until: dateStr,
          },
        },
      });
      if (error || data?.error) {
        console.error('useCampaignDayInsights error', error || data?.error);
        return null;
      }
      const insights = (data?.data || [])[0];
      const currency = data?.currency || 'USD';
      if (!insights) return { spend: 0, conversations: 0, currency };
      const spend = parseFloat(insights?.spend || '0') || 0;
      const convAction = (insights?.actions || []).find((a: any) =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.total_messaging_connection',
      );
      const conversations = convAction ? parseInt(convAction.value) : 0;
      return { spend, conversations, currency };
    },
    enabled: !!clientId && !!connectionId && !!campaignId && !!date,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
