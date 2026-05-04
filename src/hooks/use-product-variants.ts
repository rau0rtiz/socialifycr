import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  id: string;
  client_id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  price: number | null;
  photo_url: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VariantInput {
  product_id: string;
  client_id: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  price?: number | null;
  photo_url?: string | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
}

export function useProductVariants(clientId: string | null, productId?: string | null) {
  const qc = useQueryClient();
  const key = ['product_variants', clientId, productId ?? 'all'];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!clientId) return [] as ProductVariant[];
      let q = supabase.from('product_variants').select('*').eq('client_id', clientId);
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q.order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });

  const upsert = useMutation({
    mutationFn: async (variant: VariantInput & { id?: string }) => {
      const payload: any = { ...variant };
      if (variant.id) {
        const { data, error } = await supabase.from('product_variants').update(payload).eq('id', variant.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('product_variants').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product_variants'] });
      qc.invalidateQueries({ queryKey: ['client_products'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_variants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_variants'] }),
  });

  const receiveStock = useMutation({
    mutationFn: async (entries: { variant_id: string; product_id: string; quantity: number; reason?: string }[]) => {
      if (!clientId || entries.length === 0) return;
      // Update each variant stock and write a movement row
      for (const e of entries) {
        if (!e.quantity || e.quantity <= 0) continue;
        const { data: v, error: ve } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', e.variant_id)
          .single();
        if (ve) throw ve;
        const newStock = Number(v.stock_quantity || 0) + e.quantity;
        const { error: ue } = await supabase
          .from('product_variants')
          .update({ stock_quantity: newStock })
          .eq('id', e.variant_id);
        if (ue) throw ue;
        const { error: me } = await supabase.from('product_stock_movements').insert({
          client_id: clientId,
          product_id: e.product_id,
          variant_id: e.variant_id,
          movement_type: 'in',
          quantity: e.quantity,
          resulting_stock: newStock,
          reason: e.reason || 'Recepción de mercadería',
        });
        if (me) throw me;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product_variants'] });
    },
  });

  return { variants: data, isLoading, upsert, remove, receiveStock };
}
