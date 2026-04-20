import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductTag {
  id: string;
  client_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TagAssignment {
  product_id: string;
  tag_id: string;
}

export const useClientProductTags = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['client-product-tags', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_product_tags' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as ProductTag[];
    },
    enabled: !!clientId,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['product-tag-assignments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      // Fetch all assignments for products of this client
      const { data: prods } = await supabase
        .from('client_products' as any)
        .select('id')
        .eq('client_id', clientId);
      const ids = (prods || []).map((p: any) => p.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('product_tag_assignments' as any)
        .select('product_id, tag_id')
        .in('product_id', ids);
      if (error) throw error;
      return (data || []) as unknown as TagAssignment[];
    },
    enabled: !!clientId,
  });

  const addTag = useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_product_tags' as any)
        .insert({
          client_id: clientId,
          name: input.name.trim(),
          color: input.color || 'hsl(262, 83%, 58%)',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProductTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-product-tags', clientId] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_product_tags' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-product-tags', clientId] });
      queryClient.invalidateQueries({ queryKey: ['product-tag-assignments', clientId] });
    },
  });

  /** Set the full tag list for a product (replaces existing assignments). */
  const setProductTags = useMutation({
    mutationFn: async ({ productId, tagIds }: { productId: string; tagIds: string[] }) => {
      // Delete current
      const { error: delErr } = await supabase
        .from('product_tag_assignments' as any)
        .delete()
        .eq('product_id', productId);
      if (delErr) throw delErr;
      if (tagIds.length === 0) return;
      const rows = tagIds.map(tag_id => ({ product_id: productId, tag_id }));
      const { error: insErr } = await supabase
        .from('product_tag_assignments' as any)
        .insert(rows as any);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tag-assignments', clientId] });
    },
  });

  /** Helper: get tag IDs for a single product. */
  const getTagsForProduct = (productId: string): string[] => {
    return (assignmentsQuery.data || [])
      .filter(a => a.product_id === productId)
      .map(a => a.tag_id);
  };

  return {
    tags: tagsQuery.data || [],
    assignments: assignmentsQuery.data || [],
    isLoading: tagsQuery.isLoading || assignmentsQuery.isLoading,
    addTag,
    deleteTag,
    setProductTags,
    getTagsForProduct,
  };
};
