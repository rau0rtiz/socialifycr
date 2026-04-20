import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductCategory {
  id: string;
  client_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  name: string;
  color?: string;
  sort_order?: number;
}

export const useClientProductCategories = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-product-categories', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_product_categories' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as ProductCategory[];
    },
    enabled: !!clientId,
  });

  const addCategory = useMutation({
    mutationFn: async (input: CategoryInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_product_categories' as any)
        .insert({
          client_id: clientId,
          name: input.name.trim(),
          color: input.color || 'hsl(220, 70%, 50%)',
          sort_order: input.sort_order ?? 0,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-product-categories', clientId] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const { error } = await supabase
        .from('client_product_categories' as any)
        .update({
          name: input.name.trim(),
          color: input.color,
          sort_order: input.sort_order,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-product-categories', clientId] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Check if any product uses this category
      if (clientId) {
        const { data: cat } = await supabase
          .from('client_product_categories' as any)
          .select('name')
          .eq('id', id)
          .single();
        const catName = (cat as any)?.name;
        if (catName) {
          const { count } = await supabase
            .from('client_products' as any)
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('category', catName);
          if (count && count > 0) {
            throw new Error(`${count} producto${count > 1 ? 's usan' : ' usa'} esta categoría. Reasignalos primero.`);
          }
        }
      }
      const { error } = await supabase
        .from('client_product_categories' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-product-categories', clientId] });
    },
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};
