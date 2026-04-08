import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageSale {
  id: string;
  client_id: string;
  created_by: string;
  sale_date: string;
  amount: number;
  currency: 'CRC' | 'USD';
  source: 'story' | 'ad' | 'referral' | 'organic' | 'other';
  ad_campaign_id: string | null;
  ad_campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  brand: string | null;
  notes: string | null;
  product: string | null;
  message_platform: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  closer_name: string | null;
  payment_scheme_id: string | null;
  total_sale_amount: number | null;
  num_installments: number | null;
  installments_paid: number | null;
  installment_amount: number | null;
  created_at: string;
}

export interface SaleInput {
  sale_date: string;
  amount: number;
  currency: 'CRC' | 'USD';
  source: 'story' | 'ad' | 'referral' | 'organic' | 'other';
  ad_campaign_id?: string;
  ad_campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  customer_name?: string;
  customer_phone?: string;
  brand?: string;
  notes?: string;
  product?: string;
  message_platform?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  closer_name?: string;
  payment_scheme_id?: string;
  total_sale_amount?: number;
  num_installments?: number;
  installments_paid?: number;
  installment_amount?: number;
  payment_method?: string;
  story_id?: string;
}

export const useSalesTracking = (clientId: string | null, month?: Date) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['message-sales', clientId, startOfMonth, endOfMonth],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('message_sales')
        .select('*')
        .eq('client_id', clientId)
        .gte('sale_date', startOfMonth)
        .lte('sale_date', endOfMonth)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return data as MessageSale[];
    },
    enabled: !!clientId,
  });

  const addSale = useMutation({
    mutationFn: async (input: SaleInput): Promise<string> => {
      if (!clientId || !user) throw new Error('Missing client or user');
      const { data, error } = await supabase.from('message_sales').insert({
        client_id: clientId,
        created_by: user.id,
        ...input,
      } as any).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (saleId: string) => {
      // Clean up payment_collections linked to this sale
      await supabase.from('payment_collections').delete().eq('sale_id', saleId);
      // Unlink any setter_appointment pointing to this sale
      const { data: linkedApts } = await supabase
        .from('setter_appointments')
        .select('id')
        .eq('sale_id', saleId);
      if (linkedApts && linkedApts.length > 0) {
        for (const apt of linkedApts) {
          await supabase.from('setter_appointments').update({
            sale_id: null,
            status: 'completed',
          } as any).eq('id', apt.id);
        }
      }
      const { error } = await supabase.from('message_sales').delete().eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
      queryClient.invalidateQueries({ queryKey: ['setter-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-collections'] });
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ saleId, updates }: { saleId: string; updates: Partial<SaleInput & { ad_id?: string; ad_name?: string }> }) => {
      const { error } = await supabase.from('message_sales').update(updates as any).eq('id', saleId);
      if (error) throw error;

      // Sync to linked appointment if contact/ad fields changed
      const syncFields = ['customer_name', 'ad_id', 'ad_name', 'ad_campaign_id', 'ad_campaign_name'];
      const hasSyncableChange = syncFields.some(f => f in updates);
      if (hasSyncableChange) {
        // Find linked appointment
        const { data: linked } = await supabase
          .from('setter_appointments')
          .select('id')
          .eq('sale_id', saleId)
          .limit(1);
        if (linked && linked.length > 0) {
          const aptUpdates: Record<string, any> = {};
          if ('customer_name' in updates) aptUpdates.lead_name = updates.customer_name;
          if ('ad_id' in updates) aptUpdates.ad_id = updates.ad_id;
          if ('ad_name' in updates) aptUpdates.ad_name = updates.ad_name;
          if ('ad_campaign_id' in updates) aptUpdates.ad_campaign_id = updates.ad_campaign_id;
          if ('ad_campaign_name' in updates) aptUpdates.ad_campaign_name = updates.ad_campaign_name;
          if (Object.keys(aptUpdates).length > 0) {
            await supabase.from('setter_appointments').update(aptUpdates as any).eq('id', linked[0].id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
      queryClient.invalidateQueries({ queryKey: ['setter-appointments'] });
    },
  });

  // Summary calculations
  const activeSales = sales.filter(s => s.status !== 'cancelled');
  const totalSalesCRC = activeSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSalesUSD = activeSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const adAttributedCRC = activeSales.filter(s => s.source === 'ad' && s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const adAttributedUSD = activeSales.filter(s => s.source === 'ad' && s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

  const sourceBreakdown = activeSales.reduce((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    sales,
    isLoading,
    addSale,
    deleteSale,
    updateSale,
    summary: {
      totalCount: activeSales.length,
      totalCRC: totalSalesCRC,
      totalUSD: totalSalesUSD,
      adAttributedCRC,
      adAttributedUSD,
      sourceBreakdown,
    },
  };
};
