import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassFrequency {
  sessions_per_week: number;
  hours_per_session: number;
}

export interface ScheduleBlock {
  day: string;
  start: string;
  end: string;
}

export interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  price: number | null;
  cost: number | null;
  currency: string;
  description: string | null;
  photo_url: string | null;
  category: string | null;
  audience: string | null;
  is_recurring: boolean;
  class_frequency: ClassFrequency | null;
  available_schedules: ScheduleBlock[];
  tax_applicable: boolean;
  tax_rate: number;
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
  category?: string | null;
  audience?: string | null;
  is_recurring?: boolean;
  class_frequency?: ClassFrequency | null;
  available_schedules?: ScheduleBlock[];
  tax_applicable?: boolean;
  tax_rate?: number;
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
          category: input.category ?? null,
          audience: input.audience ?? 'all',
          is_recurring: input.is_recurring ?? false,
          class_frequency: (input.class_frequency ?? null) as any,
          available_schedules: (input.available_schedules ?? []) as any,
          tax_applicable: input.tax_applicable ?? false,
          tax_rate: input.tax_rate ?? 13,
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
          category: input.category ?? null,
          audience: input.audience ?? 'all',
          is_recurring: input.is_recurring ?? false,
          class_frequency: (input.class_frequency ?? null) as any,
          available_schedules: (input.available_schedules ?? []) as any,
          tax_applicable: input.tax_applicable ?? false,
          tax_rate: input.tax_rate ?? 13,
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
