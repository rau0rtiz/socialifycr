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
  notes: string | null;
  product: string | null;
  message_platform: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  closer_name: string | null;
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
  notes?: string;
  product?: string;
  message_platform?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  closer_name?: string;
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
    mutationFn: async (input: SaleInput) => {
      if (!clientId || !user) throw new Error('Missing client or user');
      const { error } = await supabase.from('message_sales').insert({
        client_id: clientId,
        created_by: user.id,
        ...input,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.from('message_sales').delete().eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ saleId, updates }: { saleId: string; updates: Partial<SaleInput & { ad_id?: string; ad_name?: string }> }) => {
      const { error } = await supabase.from('message_sales').update(updates as any).eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });

  // Summary calculations
  const completedSales = sales.filter(s => s.status === 'completed');
  const totalSalesCRC = completedSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSalesUSD = completedSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const adAttributedCRC = completedSales.filter(s => s.source === 'ad' && s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const adAttributedUSD = completedSales.filter(s => s.source === 'ad' && s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

  const sourceBreakdown = completedSales.reduce((acc, s) => {
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
      totalCount: completedSales.length,
      totalCRC: totalSalesCRC,
      totalUSD: totalSalesUSD,
      adAttributedCRC,
      adAttributedUSD,
      sourceBreakdown,
    },
  };
};
