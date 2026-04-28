import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencyCollection {
  id: string;
  customer_name: string;
  client_id: string | null;
  due_date: string;
  amount: number;
  currency: 'USD' | 'CRC';
  collection_type: 'recurring' | 'one_off' | 'post_production';
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgencyCollections = () => {
  return useQuery({
    queryKey: ['agency-collections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_collections')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as AgencyCollection[];
    },
    staleTime: 60 * 1000,
  });
};

export const useUpsertCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<AgencyCollection> & { customer_name: string; due_date: string; amount: number }) => {
      if (c.id) {
        const { error } = await (supabase as any).from('agency_collections').update(c).eq('id', c.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_collections').insert({
          customer_name: c.customer_name,
          client_id: c.client_id ?? null,
          due_date: c.due_date,
          amount: c.amount,
          currency: c.currency || 'USD',
          collection_type: c.collection_type || 'recurring',
          notes: c.notes ?? null,
          status: 'pending',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-collections'] });
      toast.success('Cobro guardado');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });
};

export const useMarkCollectionPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid_amount }: { id: string; paid_amount?: number }) => {
      const updates: any = { status: 'paid', paid_at: new Date().toISOString() };
      if (paid_amount != null) updates.paid_amount = paid_amount;
      const { error } = await (supabase as any).from('agency_collections').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-collections'] });
      toast.success('Marcado como cobrado');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });
};

export const useDeleteCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('agency_collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-collections'] });
      toast.success('Cobro eliminado');
    },
  });
};

export const useSendDailyCollectionsEmail = () => {
  return useMutation({
    mutationFn: async ({ test_email }: { test_email?: string } = {}) => {
      const { data, error } = await supabase.functions.invoke('agency-daily-collections', {
        body: test_email ? { test_email } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(`Correo enviado a ${(data.sent_to || []).join(', ')}`);
      } else {
        toast.info(data?.message || 'Sin cobros pendientes hoy');
      }
    },
    onError: (e: any) => toast.error(e.message || 'Error enviando correo'),
  });
};
