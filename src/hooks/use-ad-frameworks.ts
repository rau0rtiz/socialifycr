import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DimensionType = 'angle' | 'format' | 'hook' | 'phase' | 'awareness_level' | 'core_message' | 'content_type';
export type TemplateKind = 'pool' | 'awareness' | 'launch' | 'legacy_matrix';

export interface AdFramework {
  id: string;
  name: string;
  description: string | null;
  template_kind: TemplateKind;
  client_id: string | null; // null = agency-owned
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdFrameworkDimension {
  id: string;
  framework_id: string;
  dimension_type: DimensionType;
  label: string;
  description: string | null;
  color: string | null;
  position: number;
  metadata: Record<string, any>;
}

export interface AdFrameworkWithDimensions extends AdFramework {
  dimensions: AdFrameworkDimension[];
  campaign_count?: number;
  variant_count?: number;
}

/**
 * List frameworks.
 * - scope='agency'  -> only frameworks where client_id IS NULL
 * - scope='client'  -> only frameworks for the given clientId
 * - scope='all' or undefined -> whatever RLS allows (legacy behavior)
 */
export const useAdFrameworks = (opts?: { scope?: 'agency' | 'client' | 'all'; clientId?: string | null }) => {
  const scope = opts?.scope ?? 'all';
  const clientId = opts?.clientId ?? null;
  return useQuery({
    queryKey: ['ad-frameworks', scope, clientId],
    enabled: scope !== 'client' || !!clientId,
    queryFn: async () => {
      let q = supabase
        .from('ad_frameworks')
        .select('*')
        .order('created_at', { ascending: false });

      if (scope === 'agency') {
        q = q.is('client_id', null);
      } else if (scope === 'client' && clientId) {
        q = q.eq('client_id', clientId);
      }

      const { data: frameworks, error } = await q;
      if (error) throw error;

      const ids = (frameworks ?? []).map((f) => f.id);
      if (ids.length === 0) return [] as AdFrameworkWithDimensions[];

      const [{ data: dims }, { data: campaigns }] = await Promise.all([
        supabase
          .from('ad_framework_dimensions')
          .select('*')
          .in('framework_id', ids)
          .order('position', { ascending: true }),
        supabase
          .from('ad_campaigns')
          .select('id, framework_id')
          .in('framework_id', ids),
      ]);

      const variantsByCampaign: Record<string, number> = {};
      if (campaigns && campaigns.length > 0) {
        const { data: variants } = await supabase
          .from('ad_variants')
          .select('campaign_id')
          .in('campaign_id', campaigns.map((c) => c.id));
        (variants ?? []).forEach((v: any) => {
          variantsByCampaign[v.campaign_id] = (variantsByCampaign[v.campaign_id] ?? 0) + 1;
        });
      }

      return (frameworks ?? []).map((f) => {
        const fwCampaigns = (campaigns ?? []).filter((c) => c.framework_id === f.id);
        const variantCount = fwCampaigns.reduce((acc, c) => acc + (variantsByCampaign[c.id] ?? 0), 0);
        return {
          ...f,
          dimensions: (dims ?? []).filter((d) => d.framework_id === f.id) as AdFrameworkDimension[],
          campaign_count: fwCampaigns.length,
          variant_count: variantCount,
        } as AdFrameworkWithDimensions;
      });
    },
  });
};

export const useAdFramework = (frameworkId: string | undefined) => {
  return useQuery({
    queryKey: ['ad-framework', frameworkId],
    queryFn: async () => {
      if (!frameworkId) return null;
      const { data: framework, error } = await supabase
        .from('ad_frameworks')
        .select('*')
        .eq('id', frameworkId)
        .single();
      if (error) throw error;

      const { data: dims, error: dimErr } = await supabase
        .from('ad_framework_dimensions')
        .select('*')
        .eq('framework_id', frameworkId)
        .order('position', { ascending: true });
      if (dimErr) throw dimErr;

      return { ...framework, dimensions: (dims ?? []) as AdFrameworkDimension[] } as AdFrameworkWithDimensions;
    },
    enabled: !!frameworkId,
  });
};

export interface CreateFrameworkDimensions {
  angles?: { label: string; color?: string }[];
  formats?: { label: string; color?: string }[];
  hooks?: { label: string; color?: string }[];
}

export interface CreateMoldDimension {
  dimension_type: DimensionType;
  label: string;
  color?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export const useCreateAdFramework = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      template_kind?: TemplateKind;
      template?: CreateFrameworkDimensions;
      // For mold-based creation (pool/awareness/launch), provide a flat list of dimensions:
      mold_dimensions?: CreateMoldDimension[];
    }) => {
      const { data, error } = await supabase
        .from('ad_frameworks')
        .insert({
          name: input.name,
          description: input.description ?? null,
          template_kind: input.template_kind ?? 'legacy_matrix',
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Mold-based dimensions (used for pool, awareness, launch)
      if (input.mold_dimensions && input.mold_dimensions.length > 0) {
        const positions: Record<string, number> = {};
        const rows = input.mold_dimensions.map((d) => {
          positions[d.dimension_type] = (positions[d.dimension_type] ?? -1) + 1;
          return {
            framework_id: data.id,
            dimension_type: d.dimension_type,
            label: d.label,
            color: d.color ?? null,
            description: d.description ?? null,
            metadata: d.metadata ?? {},
            position: positions[d.dimension_type],
          };
        });
        const { error: dErr } = await supabase.from('ad_framework_dimensions').insert(rows);
        if (dErr) throw dErr;
      }

      // Legacy matrix template
      const tmpl = input.template;
      if (tmpl) {
        const rows: any[] = [];
        (tmpl.angles ?? []).forEach((d, i) =>
          rows.push({ framework_id: data.id, dimension_type: 'angle', label: d.label, color: d.color ?? null, position: i }),
        );
        (tmpl.formats ?? []).forEach((d, i) =>
          rows.push({ framework_id: data.id, dimension_type: 'format', label: d.label, color: d.color ?? null, position: i }),
        );
        (tmpl.hooks ?? []).forEach((d, i) =>
          rows.push({ framework_id: data.id, dimension_type: 'hook', label: d.label, color: d.color ?? null, position: i }),
        );
        if (rows.length > 0) {
          const { error: dErr } = await supabase.from('ad_framework_dimensions').insert(rows);
          if (dErr) throw dErr;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      toast.success('Framework creado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error creando framework'),
  });
};

export const useUpdateAdFramework = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null }) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from('ad_frameworks')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      qc.invalidateQueries({ queryKey: ['ad-framework', vars.id] });
    },
  });
};

export const useDeleteAdFramework = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ad_frameworks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      toast.success('Framework eliminado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error eliminando'),
  });
};

export const useUpsertDimension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdFrameworkDimension> & { framework_id: string; dimension_type: DimensionType; label: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from('ad_framework_dimensions')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('ad_framework_dimensions')
        .insert({
          framework_id: input.framework_id,
          dimension_type: input.dimension_type,
          label: input.label,
          description: input.description ?? null,
          color: input.color ?? null,
          position: input.position ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-framework', vars.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      qc.invalidateQueries({ queryKey: ['ad-variants'] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });
};

export const useDeleteDimension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; framework_id: string }) => {
      const { error } = await supabase.from('ad_framework_dimensions').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-framework', vars.framework_id] });
      qc.invalidateQueries({ queryKey: ['ad-frameworks'] });
      qc.invalidateQueries({ queryKey: ['ad-variants'] });
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });
};

export const useReorderDimensions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { framework_id: string; items: { id: string; position: number }[] }) => {
      // Use parallel updates
      await Promise.all(
        input.items.map((it) =>
          supabase.from('ad_framework_dimensions').update({ position: it.position }).eq('id', it.id),
        ),
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ad-framework', vars.framework_id] });
    },
  });
};
