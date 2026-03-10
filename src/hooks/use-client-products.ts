import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  price: number | null;
  currency: string;
  created_at: string;
}

export const useClientProducts = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-products', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_products' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as ClientProduct[];
    },
    enabled: !!clientId,
  });

  const addProduct = useMutation({
    mutationFn: async (input: { name: string; price?: number; currency?: string }) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_products' as any)
        .insert({
          client_id: clientId,
          name: input.name.trim(),
          price: input.price ?? null,
          currency: input.currency || 'CRC',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClientProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products', clientId] });
    },
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    addProduct,
  };
};
