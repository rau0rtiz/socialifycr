import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductionFolder {
  id: string;
  client_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export const useProductionFolders = (clientId: string | null) =>
  useQuery({
    queryKey: ['production-folders', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_folders')
        .select('*')
        .eq('client_id', clientId!)
        .order('sort_order', { ascending: true })
        .order('name');
      if (error) throw error;
      return (data || []) as ProductionFolder[];
    },
  });

export const useReorderFolders = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, client_id }: { items: { id: string; sort_order: number }[]; client_id: string }) => {
      await Promise.all(
        items.map((it) =>
          supabase.from('production_folders').update({ sort_order: it.sort_order } as any).eq('id', it.id)
        )
      );
      return { client_id };
    },
    onSuccess: ({ client_id }) => qc.invalidateQueries({ queryKey: ['production-folders', client_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCreateFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; parent_id: string | null; name: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('production_folders')
        .insert({ ...input, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as ProductionFolder;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['production-folders', d.client_id] });
      toast.success('Carpeta creada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useRenameFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('production_folders')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionFolder;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['production-folders', d.client_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from('production_folders').delete().eq('id', id);
      if (error) throw error;
      return { client_id };
    },
    onSuccess: ({ client_id }) => {
      qc.invalidateQueries({ queryKey: ['production-folders', client_id] });
      qc.invalidateQueries({ queryKey: ['production-sheets'] });
      toast.success('Carpeta eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoveSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, folder_id }: { id: string; folder_id: string | null }) => {
      const { error } = await supabase
        .from('production_sheets')
        .update({ folder_id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-sheets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoveFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parent_id, client_id }: { id: string; parent_id: string | null; client_id: string }) => {
      const { error } = await supabase
        .from('production_folders')
        .update({ parent_id })
        .eq('id', id);
      if (error) throw error;
      return { client_id };
    },
    onSuccess: ({ client_id }) => {
      qc.invalidateQueries({ queryKey: ['production-folders', client_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
