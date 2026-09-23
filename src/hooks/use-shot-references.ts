import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseReferenceUrl } from '@/lib/embed-url';

export interface ShotReference {
  id: string;
  sheet_id: string;
  shot_id: string;
  url: string;
  platform: string | null;
  embed_url: string | null;
  title: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** All references of a sheet, grouped client-side by shot. */
export const useSheetReferences = (sheetId: string | null) =>
  useQuery({
    queryKey: ['shot-references', sheetId],
    enabled: !!sheetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_shot_references')
        .select('*')
        .eq('sheet_id', sheetId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ShotReference[];
    },
  });

export const useAddShotReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sheet_id: string; shot_id: string; url: string; notes?: string }) => {
      const parsed = parseReferenceUrl(input.url);
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('production_shot_references')
        .insert({
          sheet_id: input.sheet_id,
          shot_id: input.shot_id,
          url: input.url.trim(),
          platform: parsed.platform,
          embed_url: parsed.embedUrl,
          notes: input.notes?.trim() || null,
          created_by: user.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ShotReference;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['shot-references', vars.sheet_id] });
      toast.success('Referencia agregada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo agregar la referencia'),
  });
};

export const useDeleteShotReference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; sheet_id: string }) => {
      const { error } = await supabase.from('production_shot_references').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['shot-references', vars.sheet_id] });
      toast.success('Referencia eliminada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo eliminar'),
  });
};
