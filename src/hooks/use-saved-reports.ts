import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SavedReport {
  id: string;
  client_id: string;
  title: string;
  template_type: string | null;
  prompt: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavedReports(clientId: string | null) {
  return useQuery({
    queryKey: ['saved-reports', clientId],
    queryFn: async (): Promise<SavedReport[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SavedReport[];
    },
    enabled: !!clientId,
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      title,
      templateType,
      prompt,
      content,
    }: {
      clientId: string;
      title: string;
      templateType?: string;
      prompt: string;
      content: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('saved_reports')
        .insert({
          client_id: clientId,
          title,
          template_type: templateType || null,
          prompt,
          content,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports', variables.clientId] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, clientId }: { reportId: string; clientId: string }) => {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      return { reportId, clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports', result.clientId] });
    },
  });
}
