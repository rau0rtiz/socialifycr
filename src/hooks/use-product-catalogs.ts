import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type CatalogTable = 'product_brands' | 'product_categories_catalog' | 'product_sizes' | 'product_colors';

export interface CatalogItem {
  id: string;
  name: string;
  hex_code?: string | null;
  sort_order?: number | null;
}

function useCatalog(table: CatalogTable, clientId: string | null) {
  const qc = useQueryClient();
  const key = ['catalog', table, clientId];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!clientId) return [] as CatalogItem[];
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('client_id', clientId)
        .order(table === 'product_sizes' ? 'sort_order' : 'name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const add = useMutation({
    mutationFn: async (payload: { name: string; hex_code?: string; sort_order?: number }) => {
      if (!clientId) throw new Error('No client');
      const insertPayload: any = { client_id: clientId, name: payload.name.trim() };
      if (table === 'product_colors' && payload.hex_code) insertPayload.hex_code = payload.hex_code;
      if (table === 'product_sizes' && payload.sort_order != null) insertPayload.sort_order = payload.sort_order;
      const { data, error } = await supabase.from(table).insert(insertPayload).select().single();
      if (error) throw error;
      return data as CatalogItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { items: data, isLoading, add, remove };
}

export const useProductBrands = (clientId: string | null) => useCatalog('product_brands', clientId);
export const useProductCategoriesCatalog = (clientId: string | null) => useCatalog('product_categories_catalog', clientId);
export const useProductSizes = (clientId: string | null) => useCatalog('product_sizes', clientId);
export const useProductColors = (clientId: string | null) => useCatalog('product_colors', clientId);
