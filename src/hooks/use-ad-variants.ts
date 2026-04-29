import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VariantStatus = 'draft' | 'in_progress' | 'ready' | 'published';
export type CreativeType = 'photo' | 'reel' | 'carousel';

export interface AdVariantAsset {
  url: string;
  label?: string;
  type?: 'image' | 'video' | 'link' | 'file';
}

export interface CarouselSlide {
  title?: string;
  text?: string;
}

export interface AdVariant {
  id: string;
  campaign_id: string;
  angle_id: string | null;
  format_id: string | null;
  hook_id: string | null;
  // New mold-specific links (all nullable)
  phase_id: string | null;
  awareness_level_id: string | null;
  core_message_id: string | null;
  position: number;
  title: string | null;
  // Content
  hook_text: string | null;
  script: string | null;
  copy: string | null;
  cta: string | null;
  assets: AdVariantAsset[];
  slides: CarouselSlide[];
  creative_type: CreativeType | null;
  notes: string | null;
  status: VariantStatus;
  assigned_to: string | null;
  due_date: string | null;
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
        slides: Array.isArray(v.slides) ? v.slides : [],
        creative_type: v.creative_type ?? null,
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
      if (rest.slides !== undefined) payload.slides = rest.slides;
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

export const useBulkUpdateVariants = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; campaign_id: string; patch: Partial<AdVariant> }) => {
      const { ids, patch } = input;
      const payload: any = { ...patch };
      delete payload.id;
      const { error } = await supabase.from('ad_variants').update(payload).in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
      toast.success(`${count} variante${count === 1 ? '' : 's'} actualizada${count === 1 ? '' : 's'}`);
    },
    onError: (e: any) => toast.error(e.message ?? 'Error en actualización masiva'),
  });
};

export const useDuplicateVariantContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: AdVariant; targetId: string }) => {
      const { source, targetId } = input;
      const payload: any = {
        hook_text: source.hook_text,
        script: source.script,
        copy: source.copy,
        cta: source.cta,
        notes: source.notes,
        assets: source.assets,
        slides: source.slides,
        creative_type: source.creative_type,
      };
      const { data, error } = await supabase
        .from('ad_variants')
        .update(payload)
        .eq('id', targetId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AdVariant;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', data.campaign_id] });
      toast.success('Contenido copiado a la variante destino');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error duplicando contenido'),
  });
};

// Create a new variant manually (for non-matrix molds: pool, launch, awareness)
export const useCreateAdVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      phase_id?: string | null;
      awareness_level_id?: string | null;
      core_message_id?: string | null;
      angle_id?: string | null;
      format_id?: string | null;
      hook_id?: string | null;
      title?: string | null;
      position?: number;
      status?: VariantStatus;
    }) => {
      const payload: any = {
        campaign_id: input.campaign_id,
        phase_id: input.phase_id ?? null,
        awareness_level_id: input.awareness_level_id ?? null,
        core_message_id: input.core_message_id ?? null,
        angle_id: input.angle_id ?? null,
        format_id: input.format_id ?? null,
        hook_id: input.hook_id ?? null,
        title: input.title ?? null,
        position: input.position ?? 0,
        status: input.status ?? 'draft',
      };
      const { data, error } = await supabase.from('ad_variants').insert(payload).select().single();
      if (error) throw error;
      return data as unknown as AdVariant;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', data.campaign_id] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Error creando variante'),
  });
};

export const useDeleteAdVariant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; campaign_id: string }) => {
      const { error } = await supabase.from('ad_variants').delete().eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['ad-variants', vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
      toast.success('Variante eliminada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error eliminando variante'),
  });
};
