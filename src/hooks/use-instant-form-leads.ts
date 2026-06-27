import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InstantFormLead {
  id: string;
  client_id: string;
  external_id: string;
  created_time: string | null;
  ad_id: string | null;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  form_id: string | null;
  form_name: string | null;
  platform: string | null;
  is_organic: boolean | null;
  full_name: string | null;
  phone: string | null;
  lead_status: string | null;
  custom_answers: Record<string, any>;
  customer_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstantFormLeadSource {
  id: string;
  client_id: string;
  spreadsheet_id: string;
  sheet_name: string;
  header_row: number;
  last_synced_at: string | null;
  last_row_count: number | null;
  last_error: string | null;
}

export const useInstantFormLeads = (clientId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['instant-form-leads', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('instant_form_leads')
        .select('*')
        .eq('client_id', clientId)
        .order('created_time', { ascending: false, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as InstantFormLead[];
    },
    enabled: !!clientId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
};

export const useInstantFormLeadSource = (clientId: string | null) => {
  return useQuery({
    queryKey: ['instant-form-lead-source', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('instant_form_lead_sources')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as InstantFormLeadSource | null;
    },
    enabled: !!clientId,
  });
};

export const useSaveInstantFormLeadSource = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spreadsheet_id: string; sheet_name: string }) => {
      if (!clientId) throw new Error('No client');
      const { error } = await supabase
        .from('instant_form_lead_sources')
        .upsert(
          {
            client_id: clientId,
            spreadsheet_id: input.spreadsheet_id.trim(),
            sheet_name: input.sheet_name.trim() || 'Sheet1',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-lead-source', clientId] });
    },
  });
};

export const useSyncInstantFormLeads = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase.functions.invoke('sync-instant-form-leads', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; synced: number; skipped: number; total: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
      qc.invalidateQueries({ queryKey: ['instant-form-lead-source', clientId] });
      qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
    },
  });
};
