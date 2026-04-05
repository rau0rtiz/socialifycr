import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentCollection {
  id: string;
  sale_id: string;
  client_id: string;
  installment_number: number;
  amount: number;
  currency: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  notes: string | null;
  payment_frequency: string;
  created_at: string;
  updated_at: string;
}

export type CollectionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export const FREQUENCY_LABELS: Record<CollectionFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizado',
};

export const FREQUENCY_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export const usePaymentCollections = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['payment-collections', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('payment_collections')
        .select('*')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as PaymentCollection[];
    },
    enabled: !!clientId,
  });

  const generateCollections = useMutation({
    mutationFn: async (params: {
      saleId: string;
      clientId: string;
      installmentAmount: number;
      currency: string;
      startDate: string;
      frequency: CollectionFrequency;
      startInstallment: number;
      totalInstallments: number;
      customDates?: string[];
    }) => {
      const { saleId, clientId: cId, installmentAmount, currency, startDate, frequency, startInstallment, totalInstallments, customDates } = params;
      const records: any[] = [];

      if (frequency === 'custom' && customDates && customDates.length > 0) {
        customDates.forEach((dateStr, idx) => {
          records.push({
            sale_id: saleId,
            client_id: cId,
            installment_number: startInstallment + idx,
            amount: installmentAmount,
            currency,
            due_date: dateStr,
            status: 'pending',
            payment_frequency: 'custom',
          });
        });
      } else {
        const daysInterval = FREQUENCY_DAYS[frequency] || 30;
        for (let i = startInstallment; i <= totalInstallments; i++) {
          const offset = (i - startInstallment + 1) * daysInterval;
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + offset);

          records.push({
            sale_id: saleId,
            client_id: cId,
            installment_number: i,
            amount: installmentAmount,
            currency,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
            payment_frequency: frequency,
          });
        }
      }

      if (records.length === 0) return;
      const { error } = await supabase.from('payment_collections').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-collections', clientId] });
    },
  });

  const updateCollection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<PaymentCollection, 'due_date' | 'amount' | 'notes' | 'status' | 'paid_at'>> }) => {
      const { error } = await supabase.from('payment_collections').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-collections', clientId] });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-collections', clientId] });
    },
  });

  return { collections, isLoading, generateCollections, updateCollection, deleteCollection };
};
