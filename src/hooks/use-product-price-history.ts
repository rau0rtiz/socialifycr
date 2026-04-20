import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  client_id: string;
  old_price: number | null;
  new_price: number | null;
  old_cost: number | null;
  new_cost: number | null;
  currency: string;
  changed_by: string | null;
  changed_by_name?: string | null;
  reason: string | null;
  changed_at: string;
}

export const useProductPriceHistory = (productId: string | null) => {
  return useQuery({
    queryKey: ['product-price-history', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_price_history' as any)
        .select('*')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data || []) as unknown as PriceHistoryEntry[];

      // Resolve user names
      const userIds = Array.from(new Set(rows.map(r => r.changed_by).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name || p.email]));
        rows.forEach(r => {
          if (r.changed_by) r.changed_by_name = nameMap.get(r.changed_by) || null;
        });
      }
      return rows;
    },
    enabled: !!productId,
  });
};
