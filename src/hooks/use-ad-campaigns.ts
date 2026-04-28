import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdCampaign {
  id: string;
  framework_id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  target_date: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdCampaignWithStats extends AdCampaign {
  variant_count: number;
  ready_count: number;
  in_progress_count: number;
  draft_count: number;
}

export const useAdCampaigns = (frameworkId: string | undefined) => {
  return useQuery({
    queryKey: ['ad-campaigns', frameworkId],
    queryFn: async () => {
      if (!frameworkId) return [] as AdCampaignWithStats[];
      const { data: campaigns, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('framework_id', frameworkId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (campaigns ?? []).map((c) => c.id);
      if (ids.length === 0) return [] as AdCampaignWithStats[];

      const { data: variants } = await supabase
        .from('ad_variants')
        .select('campaign_id, status')
        .in('campaign_id', ids);

      const stats: Record<string, { total: number; ready: number; in_progress: number; draft: number }> = {};
      (variants ?? []).forEach((v: any) => {
        if (!stats[v.campaign_id]) stats[v.campaign_id] = { total: 0, ready: 0, in_progress: 0, draft: 0 };
        stats[v.campaign_id].total++;
        if (v.status === 'ready' || v.status === 'published') stats[v.campaign_id].ready++;
        else if (v.status === 'in_progress') stats[v.campaign_id].in_progress++;
        else stats[v.campaign_id].draft++;
      });

      return (campaigns ?? []).map((c) => ({
        ...c,
        variant_count: stats[c.id]?.total ?? 0,
        ready_count: stats[c.id]?.ready ?? 0,
        in_progress_count: stats[c.id]?.in_progress ?? 0,
        draft_count: stats[c.id]?.draft ?? 0,
      })) as AdCampaignWithStats[];
    },
    enabled: !!frameworkId,
  });
};

export const useAdCampaign = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ['ad-campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      return data as AdCampaign;
    },
    enabled: !!campaignId,
  });
};

export const useCreateAdCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { framework_id: string; name: string; description?: string; client_id?: string | null; target_date?: string | null }) => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .insert({
          framework_id: input.framework_id,
          name: input.name,
          description: input.description ?? null,
          client_id: input.client_id ?? null,
          target_date: input.target_date ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-campaigns', vars.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      toast.success('Campaña creada — variantes generadas automáticamente');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error creando campaña'),
  });
};

export const useUpdateAdCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdCampaign> & { id: string }) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase.from('ad_campaigns').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ad-campaigns', data.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-campaign', data.id] });
    },
  });
};

export const useDeleteAdCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; framework_id: string }) => {
      const { error } = await supabase.from('ad_campaigns').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-campaigns', vars.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      toast.success('Campaña eliminada');
    },
  });
};

export const useSyncCampaignVariants = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.rpc('generate_ad_variants', { _campaign_id: campaignId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, campaignId) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', campaignId] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
      toast.success(count > 0 ? `${count} nuevas variantes generadas` : 'Variantes ya estaban sincronizadas');
    },
  });
};

export const useDuplicateCampaign = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { source: AdCampaign; newName: string; copyContent: boolean }) => {
      const { source, newName, copyContent } = input;
      // Create campaign
      const { data: newCamp, error: cErr } = await supabase
        .from('ad_campaigns')
        .insert({
          framework_id: source.framework_id,
          name: newName,
          description: source.description,
          client_id: source.client_id,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // Sync variants (creates empty variants for every dimension combination)
      const { error: syncErr } = await supabase.rpc('generate_ad_variants', { _campaign_id: newCamp.id });
      if (syncErr) throw syncErr;

      if (copyContent) {
        // Copy content from source variants matched by (angle_id, format_id, hook_id)
        const { data: srcVariants } = await supabase
          .from('ad_variants')
          .select('*')
          .eq('campaign_id', source.id);
        const { data: tgtVariants } = await supabase
          .from('ad_variants')
          .select('id, angle_id, format_id, hook_id')
          .eq('campaign_id', newCamp.id);

        const tgtMap: Record<string, string> = {};
        (tgtVariants ?? []).forEach((v: any) => {
          tgtMap[`${v.angle_id}|${v.format_id}|${v.hook_id}`] = v.id;
        });

        await Promise.all(
          (srcVariants ?? []).map((s: any) => {
            const tgtId = tgtMap[`${s.angle_id}|${s.format_id}|${s.hook_id}`];
            if (!tgtId) return Promise.resolve();
            return supabase
              .from('ad_variants')
              .update({
                hook_text: s.hook_text,
                script: s.script,
                copy: s.copy,
                cta: s.cta,
                notes: s.notes,
                assets: s.assets,
                slides: s.slides,
                creative_type: s.creative_type,
              })
              .eq('id', tgtId);
          }),
        );
      }
      return newCamp;
    },
    onSuccess: (newCamp) => {
      qc.invalidateQueries({ queryKey: ['ad-campaigns', newCamp.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      toast.success('Campaña duplicada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error duplicando campaña'),
  });
};
