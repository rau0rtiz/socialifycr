import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UTMRecord {
  id: string;
  client_id: string;
  created_by: string | null;
  campaign_name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string | null;
  utm_content: string | null;
  destination_url: string;
  full_url: string;
  meta_campaign_id: string | null;
  meta_ad_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UTMInput {
  campaign_name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;
  destination_url: string;
  meta_campaign_id?: string;
  meta_ad_id?: string;
  notes?: string;
}

const buildUTMUrl = (baseUrl: string, params: Partial<UTMInput>): string => {
  try {
    const url = new URL(baseUrl);
    if (params.utm_source) url.searchParams.set('utm_source', params.utm_source);
    if (params.utm_medium) url.searchParams.set('utm_medium', params.utm_medium);
    if (params.utm_campaign) url.searchParams.set('utm_campaign', params.utm_campaign);
    if (params.utm_term) url.searchParams.set('utm_term', params.utm_term);
    if (params.utm_content) url.searchParams.set('utm_content', params.utm_content);
    return url.toString();
  } catch {
    return baseUrl;
  }
};

export const useUTMTracking = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['utm-tracking', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('utm_tracking')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UTMRecord[];
    },
    enabled: !!clientId,
  });

  const createUTM = useMutation({
    mutationFn: async (input: UTMInput) => {
      if (!clientId || !user) throw new Error('Missing client or user');
      const fullUrl = buildUTMUrl(input.destination_url, input);
      const { error } = await supabase.from('utm_tracking').insert({
        client_id: clientId,
        created_by: user.id,
        ...input,
        full_url: fullUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-tracking', clientId] });
    },
  });

  const deleteUTM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('utm_tracking').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-tracking', clientId] });
    },
  });

  return {
    records,
    isLoading,
    createUTM,
    deleteUTM,
    buildUTMUrl,
  };
};
