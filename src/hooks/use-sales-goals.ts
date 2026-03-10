import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SalesGoal {
  id: string;
  client_id: string;
  target_amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useSalesGoal = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['sales-goal', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('sales_goals' as any)
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SalesGoal | null;
    },
    enabled: !!clientId,
  });

  const upsertGoal = useMutation({
    mutationFn: async (input: { target_amount: number; currency: string; start_date: string; end_date: string }) => {
      if (!clientId || !user) throw new Error('Missing client or user');
      
      // Check if exists
      const { data: existing } = await supabase
        .from('sales_goals' as any)
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('sales_goals' as any)
          .update({
            target_amount: input.target_amount,
            currency: input.currency,
            start_date: input.start_date,
            end_date: input.end_date,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sales_goals' as any)
          .insert({
            client_id: clientId,
            target_amount: input.target_amount,
            currency: input.currency,
            start_date: input.start_date,
            end_date: input.end_date,
            created_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-goal', clientId] });
    },
  });

  return {
    goal: query.data || null,
    isLoading: query.isLoading,
    upsertGoal,
  };
};
