import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentScheme {
  id: string;
  product_id: string;
  client_id: string;
  name: string;
  total_price: number;
  num_installments: number;
  installment_amount: number;
  currency: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentSchemeInput {
  name: string;
  total_price: number;
  num_installments: number;
  installment_amount: number;
  currency?: string;
  sort_order?: number;
}

export const usePaymentSchemes = (productId: string | null, clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payment-schemes', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_payment_schemes' as any)
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as PaymentScheme[];
    },
    enabled: !!productId,
  });

  const addScheme = useMutation({
    mutationFn: async (input: PaymentSchemeInput) => {
      if (!productId || !clientId) throw new Error('Missing IDs');
      const { data, error } = await supabase
        .from('product_payment_schemes' as any)
        .insert({
          product_id: productId,
          client_id: clientId,
          name: input.name,
          total_price: input.total_price,
          num_installments: input.num_installments,
          installment_amount: input.installment_amount,
          currency: input.currency || 'CRC',
          sort_order: input.sort_order || 0,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PaymentScheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schemes', productId] });
    },
  });

  const updateScheme = useMutation({
    mutationFn: async ({ id, ...input }: PaymentSchemeInput & { id: string }) => {
      const { error } = await supabase
        .from('product_payment_schemes' as any)
        .update({
          name: input.name,
          total_price: input.total_price,
          num_installments: input.num_installments,
          installment_amount: input.installment_amount,
          currency: input.currency || 'CRC',
          sort_order: input.sort_order || 0,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schemes', productId] });
    },
  });

  const deleteScheme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_payment_schemes' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schemes', productId] });
    },
  });

  return {
    schemes: query.data || [],
    isLoading: query.isLoading,
    addScheme,
    updateScheme,
    deleteScheme,
  };
};

// Hook to get all schemes for a client (used in sales)
export const useClientPaymentSchemes = (clientId: string | null) => {
  return useQuery({
    queryKey: ['all-payment-schemes', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('product_payment_schemes' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as PaymentScheme[];
    },
    enabled: !!clientId,
  });
};
