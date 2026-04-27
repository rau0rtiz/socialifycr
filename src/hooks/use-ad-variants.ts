import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VariantStatus = 'draft' | 'in_progress' | 'ready' | 'published';

export interface AdVariantAsset {
  url: string;
  label?: string;
  type?: 'image' | 'video' | 'link' | 'file';
}

export interface AdVariant {
  id: string;
  campaign_id: string;
  angle_id: string;
  format_id: string;
  hook_id: string;
  hook_text: string | null;
  script: string | null;
  copy: string | null;
  cta: string | null;
  assets: AdVariantAsset[];
  notes: string | null;
  status: VariantStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export const useAdVariants = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ['ad-variants', campaignId],
    queryFn: async () => {
      if (!campaignId) return [] as AdVariant[];
      const { data, error } = await supabase
        .from('ad_variants')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        ...v,
        assets: Array.isArray(v.assets) ? v.assets : [],
      })) as AdVariant[];
    },
    enabled: !!campaignId,
  });
};

export const useUpdateAdVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdVariant> & { id: string }) => {
      const { id, ...rest } = input;
      const payload: any = { ...rest };
      if (rest.assets !== undefined) payload.assets = rest.assets;
      const { data, error } = await supabase
        .from('ad_variants')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AdVariant;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', data.campaign_id] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });
};
