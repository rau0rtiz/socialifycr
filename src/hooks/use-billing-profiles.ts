import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BillingProfile } from './use-agency-payments';

export type BillingProfileDraft = Omit<BillingProfile, 'id' | 'payment_client_id'> & { id?: string };

export const useBillingProfiles = (paymentClientId?: string | null) => {
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ['agency-billing-profiles', paymentClientId],
    queryFn: async (): Promise<BillingProfile[]> => {
      const { data, error } = await (supabase as any)
        .from('agency_billing_profiles')
        .select('*')
        .eq('payment_client_id', paymentClientId)
        .order('is_default', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return (data || []) as BillingProfile[];
    },
    enabled: !!paymentClientId,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['agency-billing-profiles', paymentClientId] });

  const save = useMutation({
    mutationFn: async (draft: BillingProfileDraft) => {
      if (!paymentClientId) throw new Error('Guardá el cliente primero');
      const row = {
        payment_client_id: paymentClientId,
        label: draft.label?.trim() || 'Sin nombre',
        billing_name: draft.billing_name || null,
        billing_tax_id: draft.billing_tax_id || null,
        billing_email: draft.billing_email || null,
        billing_phone: draft.billing_phone || null,
        billing_address: draft.billing_address || null,
        is_default: !!draft.is_default,
      };
      if (draft.is_default) {
        await (supabase as any)
          .from('agency_billing_profiles')
          .update({ is_default: false })
          .eq('payment_client_id', paymentClientId);
      }
      if (draft.id) {
        const { error } = await (supabase as any)
          .from('agency_billing_profiles')
          .update(row)
          .eq('id', draft.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_billing_profiles').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Datos de facturación guardados');
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('agency_billing_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Ficha eliminada');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const makeDefault = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any)
        .from('agency_billing_profiles')
        .update({ is_default: false })
        .eq('payment_client_id', paymentClientId);
      const { error } = await (supabase as any)
        .from('agency_billing_profiles')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  return { profiles: listQ.data || [], isLoading: listQ.isLoading, save, remove, makeDefault };
};
