import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerAddress } from '@/hooks/use-customer-contacts';

export interface OrderItem {
  id: string;
  order_id: string;
  client_id: string;
  product_id: string | null;
  variant_id: string | null;
  story_id: string | null;
  product_name: string | null;
  garment_size: string | null;
  brand: string | null;
  garment_type: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
}

export interface Order {
  id: string;
  client_id: string;
  customer_contact_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: CustomerAddress | null;
  status: string;
  payment_method: string | null;
  currency: string;
  total_amount: number;
  order_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  items?: OrderItem[];
}

export interface NewOrderInput {
  customer_contact_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: CustomerAddress | null;
  status?: string;
  payment_method?: string;
  currency?: string;
  order_date?: string;
  notes?: string;
  items: Array<{
    product_id?: string | null;
    variant_id?: string | null;
    story_id?: string | null;
    product_name?: string;
    garment_size?: string;
    brand?: string;
    garment_type?: string;
    quantity?: number;
    unit_price: number;
    subtotal: number;
    notes?: string;
  }>;
}

export const useOrders = (clientId: string | null) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const ordersQuery = useQuery({
    queryKey: ['orders', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*, items:order_items(*)')
        .eq('client_id', clientId)
        .order('order_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as Order[];
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const createOrder = useMutation({
    mutationFn: async (input: NewOrderInput) => {
      if (!clientId || !user) throw new Error('Missing context');
      const { data: order, error } = await supabase
        .from('orders' as any)
        .insert({
          client_id: clientId,
          created_by: user.id,
          customer_contact_id: input.customer_contact_id || null,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          shipping_address: input.shipping_address || null,
          status: input.status || 'pending',
          payment_method: input.payment_method || null,
          currency: input.currency || 'CRC',
          order_date: input.order_date || new Date().toISOString().split('T')[0],
          notes: input.notes || null,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      const orderId = (order as any).id;

      if (input.items.length > 0) {
        const rows = input.items.map(it => ({
          order_id: orderId,
          client_id: clientId,
          product_id: it.product_id || null,
          variant_id: it.variant_id || null,
          story_id: it.story_id || null,
          product_name: it.product_name || null,
          garment_size: it.garment_size || null,
          quantity: it.quantity ?? 1,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
          notes: it.notes || null,
        }));
        const { error: itemsErr } = await supabase.from('order_items' as any).insert(rows as any);
        if (itemsErr) throw itemsErr;
      }
      return orderId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from('orders' as any).delete().eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from('orders' as any).update({ status } as any).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', clientId] }),
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    createOrder,
    deleteOrder,
    updateOrderStatus,
  };
};
