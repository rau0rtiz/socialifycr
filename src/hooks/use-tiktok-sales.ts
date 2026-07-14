import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildSaleNotes, buildSaleProductLabel, type InstantFormSale } from './use-instant-form-leads';

export type TiktokSale = InstantFormSale;

export const useTiktokSales = (clientId: string | null) => {
  return useQuery({
    queryKey: ['tiktok-sales', clientId],
    queryFn: async () => {
      if (!clientId) return [] as TiktokSale[];
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, sale_date, amount, subtotal, tax_amount, currency, customer_name, customer_phone, product, notes, ad_campaign_name, ad_name, ad_id, created_at')
        .eq('client_id', clientId)
        .eq('source', 'tiktok')
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TiktokSale[];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
};

export interface RegisterTiktokSaleInput {
  clientId: string;
  fullName: string;
  phone?: string | null;
  quantity: number;
  subtotal: number;
  tax_rate: number; // 0..1
  notes?: string;
}

export const useRegisterTiktokSale = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId: cid, fullName, phone, quantity, subtotal, tax_rate, notes }: RegisterTiktokSaleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const tax_amount = Math.round(subtotal * tax_rate * 100) / 100;
      const amount = Math.round((subtotal + tax_amount) * 100) / 100;
      const cleanPhone = (phone || '').trim() || null;

      // Upsert customer_contacts
      let contactId: string | null = null;
      if (cleanPhone) {
        const { data: existing } = await supabase
          .from('customer_contacts')
          .select('id')
          .eq('client_id', cid)
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (existing) contactId = existing.id;
      }
      if (!contactId) {
        const { data: created, error: ccErr } = await supabase
          .from('customer_contacts')
          .insert({ client_id: cid, full_name: fullName.trim() || 'Cliente TikTok', phone: cleanPhone })
          .select('id')
          .single();
        if (ccErr) throw ccErr;
        contactId = created.id;
      }

      const { data: sale, error } = await supabase
        .from('message_sales')
        .insert({
          client_id: cid,
          created_by: user.id,
          sale_date: new Date().toISOString().slice(0, 10),
          amount,
          subtotal,
          tax_amount,
          currency: 'CRC',
          source: 'tiktok',
          customer_name: fullName.trim() || 'Cliente TikTok',
          customer_phone: cleanPhone,
          product: buildSaleProductLabel(quantity, false),
          notes: buildSaleNotes({ quantity, embroidery: false, tax_rate, extra: notes }),
          status: 'completed',
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return sale;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tiktok-sales', vars.clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', vars.clientId] });
      if (clientId) {
        qc.invalidateQueries({ queryKey: ['tiktok-sales', clientId] });
      }
    },
  });
};

export const useDeleteTiktokSale = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.from('message_sales').delete().eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tiktok-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });
};
