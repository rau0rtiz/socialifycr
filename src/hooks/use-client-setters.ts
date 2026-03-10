import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useClientSetters = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-setters', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_setters' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as { id: string; client_id: string; name: string; created_at: string }[];
    },
    enabled: !!clientId,
  });

  const addSetter = useMutation({
    mutationFn: async (name: string) => {
      if (!clientId) throw new Error('Missing client');
      const { data, error } = await supabase
        .from('client_setters' as any)
        .insert({ client_id: clientId, name: name.trim() } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as { id: string; name: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-setters', clientId] });
    },
  });

  const deleteSetter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_setters' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-setters', clientId] });
    },
  });

  return {
    setters: query.data || [],
    setterNames: (query.data || []).map(s => s.name),
    isLoading: query.isLoading,
    addSetter,
    deleteSetter,
  };
};
