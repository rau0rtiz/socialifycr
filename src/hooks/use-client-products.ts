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

export type ProductType = 'product' | 'service';

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
  product_type: ProductType;
  estimated_duration_min: number | null;
  is_recurring: boolean;
  class_frequency: ClassFrequency | null;
  available_schedules: ScheduleBlock[];
  tax_applicable: boolean;
  tax_rate: number;
  track_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_unit: string | null;
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
  product_type?: ProductType;
  estimated_duration_min?: number | null;
  is_recurring?: boolean;
  class_frequency?: ClassFrequency | null;
  available_schedules?: ScheduleBlock[];
  tax_applicable?: boolean;
  tax_rate?: number;
  track_stock?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  stock_unit?: string | null;
}

export interface StockMovement {
  id: string;
  product_id: string;
  client_id: string;
  movement_type: 'in' | 'out' | 'adjust' | 'sale';
  quantity: number;
  resulting_stock: number;
  reason: string | null;
  sale_id: string | null;
  created_by: string | null;
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

  const buildPayload = (input: ProductInput) => ({
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
    track_stock: input.track_stock ?? false,
    stock_quantity: input.stock_quantity ?? 0,
    low_stock_threshold: input.low_stock_threshold ?? 0,
    stock_unit: input.stock_unit ?? null,
  });

  const addProduct = useMutation({
    mutationFn: async (input: ProductInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_products' as any)
        .insert({ client_id: clientId, ...buildPayload(input) } as any)
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
        .update(buildPayload(input) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products', clientId] });
    },
  });

  /**
   * Apply a stock movement: in (entrada), out (salida), adjust (ajuste manual al valor exacto).
   * Updates product.stock_quantity and inserts a row in product_stock_movements.
   */
  const applyStockMovement = useMutation({
    mutationFn: async (params: {
      productId: string;
      type: 'in' | 'out' | 'adjust';
      quantity: number;
      reason?: string;
    }) => {
      if (!clientId) throw new Error('No client');
      const { productId, type, quantity, reason } = params;
      // Read current stock
      const { data: prod, error: pErr } = await supabase
        .from('client_products' as any)
        .select('stock_quantity')
        .eq('id', productId)
        .single();
      if (pErr) throw pErr;
      const current = Number((prod as any)?.stock_quantity ?? 0);
      let next = current;
      if (type === 'in') next = current + quantity;
      else if (type === 'out') next = Math.max(0, current - quantity);
      else next = quantity; // adjust = set absolute

      const { error: uErr } = await supabase
        .from('client_products' as any)
        .update({ stock_quantity: next } as any)
        .eq('id', productId);
      if (uErr) throw uErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: mErr } = await supabase
        .from('product_stock_movements' as any)
        .insert({
          client_id: clientId,
          product_id: productId,
          movement_type: type,
          quantity: type === 'adjust' ? next - current : quantity,
          resulting_stock: next,
          reason: reason?.trim() || null,
          created_by: user?.id ?? null,
        } as any);
      if (mErr) throw mErr;
      return next;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-products', clientId] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', vars.productId] });
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
    applyStockMovement,
  };
};

/** Fetch the recent stock movement history for a single product. */
export const useStockMovements = (productId: string | null) => {
  return useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_stock_movements' as any)
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as unknown as StockMovement[];
    },
    enabled: !!productId,
  });
};
