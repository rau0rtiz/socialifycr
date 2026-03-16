import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PublicationGoal {
  id: string;
  client_id: string;
  month: string;
  target_posts: number;
  target_reach: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const usePublicationGoals = (clientId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['publication-goals', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('publication_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('month', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PublicationGoal[];
    },
    enabled: !!clientId,
  });

  const upsertGoal = useMutation({
    mutationFn: async (input: { month: string; target_posts: number; target_reach: number }) => {
      if (!clientId || !user?.id) throw new Error('Missing client or user');
      
      // Check if exists
      const { data: existing } = await supabase
        .from('publication_goals')
        .select('id')
        .eq('client_id', clientId)
        .eq('month', input.month)
        .maybeSingle() as any;

      if (existing?.id) {
        const { error } = await supabase
          .from('publication_goals')
          .update({ target_posts: input.target_posts, target_reach: input.target_reach } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('publication_goals')
          .insert({
            client_id: clientId,
            month: input.month,
            target_posts: input.target_posts,
            target_reach: input.target_reach,
            created_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-goals', clientId] });
    },
  });

  return {
    goals: query.data || [],
    isLoading: query.isLoading,
    upsertGoal,
  };
};
