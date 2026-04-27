import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseReferenceUrl, type ReferencePlatform } from '@/lib/embed-url';

export interface AdFrameworkReference {
  id: string;
  framework_id: string | null;
  variant_id: string | null;
  url: string;
  platform: ReferencePlatform | null;
  embed_url: string | null;
  title: string | null;
  notes: string | null;
  thumbnail_url: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type Scope = { framework_id?: string | null; variant_id?: string | null };

const scopeKey = (scope: Scope) =>
  scope.variant_id
    ? ['ad-framework-references', 'variant', scope.variant_id]
    : ['ad-framework-references', 'framework', scope.framework_id];

export const useAdReferences = (scope: Scope) => {
  const { framework_id, variant_id } = scope;
  return useQuery({
    queryKey: scopeKey(scope),
    queryFn: async () => {
      let q = supabase
        .from('ad_framework_references')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (variant_id) q = q.eq('variant_id', variant_id);
      else if (framework_id) q = q.eq('framework_id', framework_id).is('variant_id', null);
      else return [] as AdFrameworkReference[];
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdFrameworkReference[];
    },
    enabled: !!(variant_id || framework_id),
  });
};

export const useCreateAdReference = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      framework_id?: string | null;
      variant_id?: string | null;
      url: string;
      notes?: string;
      title?: string;
    }) => {
      const parsed = parseReferenceUrl(input.url);
      const { data, error } = await supabase
        .from('ad_framework_references')
        .insert({
          framework_id: input.framework_id ?? null,
          variant_id: input.variant_id ?? null,
          url: input.url.trim(),
          platform: parsed.platform,
          embed_url: parsed.embedUrl,
          title: input.title?.trim() || null,
          notes: input.notes?.trim() || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: scopeKey(vars) });
      toast.success('Referencia agregada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error al agregar referencia'),
  });
};

export const useUpdateAdReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      framework_id?: string | null;
      variant_id?: string | null;
      notes?: string | null;
      title?: string | null;
      position?: number;
    }) => {
      const { id, framework_id, variant_id, ...rest } = input;
      const { data, error } = await supabase
        .from('ad_framework_references')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: scopeKey(vars) });
    },
  });
};

export const useDeleteAdReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; framework_id?: string | null; variant_id?: string | null }) => {
      const { error } = await supabase.from('ad_framework_references').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: scopeKey(vars) });
      toast.success('Referencia eliminada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error al eliminar'),
  });
};
