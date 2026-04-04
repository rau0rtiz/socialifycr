import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  price: number | null;
  cost: number | null;
  currency: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  price?: number | null;
  cost?: number | null;
  currency?: string;
  description?: string;
  photo_url?: string | null;
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
    mutationFn: async (input: ProductInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_products' as any)
        .insert({
          client_id: clientId,
          name: input.name.trim(),
          price: input.price ?? null,
          cost: input.cost ?? null,
          currency: input.currency || 'CRC',
          description: input.description?.trim() || null,
          photo_url: input.photo_url ?? null,
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

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...input }: ProductInput & { id: string }) => {
      const { error } = await supabase
        .from('client_products' as any)
        .update({
          name: input.name.trim(),
          price: input.price ?? null,
          cost: input.cost ?? null,
          currency: input.currency || 'CRC',
          description: input.description?.trim() || null,
          photo_url: input.photo_url ?? null,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products', clientId] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_products' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products', clientId] });
    },
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
  };
};
