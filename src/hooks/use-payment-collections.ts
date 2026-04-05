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

export interface EnrichedCollection extends PaymentCollection {
  customer_name: string | null;
  product: string | null;
  total_sale_amount: number | null;
  num_installments: number | null;
}

export interface SaleGroup {
  saleId: string;
  customerName: string;
  product: string | null;
  totalAmount: number | null;
  currency: string;
  collections: EnrichedCollection[];
  nextPendingCollection: EnrichedCollection | null;
  allPaid: boolean;
  paidCount: number;
  totalCount: number;
  totalCollected: number;
  totalPending: number;
  lastPaidAt: string | null;
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
        .select('*, message_sales(customer_name, product, total_sale_amount, num_installments)')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        sale_id: row.sale_id,
        client_id: row.client_id,
        installment_number: row.installment_number,
        amount: row.amount,
        currency: row.currency,
        due_date: row.due_date,
        status: row.status,
        paid_at: row.paid_at,
        notes: row.notes,
        payment_frequency: row.payment_frequency,
        created_at: row.created_at,
        updated_at: row.updated_at,
        customer_name: row.message_sales?.customer_name || null,
        product: row.message_sales?.product || null,
        total_sale_amount: row.message_sales?.total_sale_amount || null,
        num_installments: row.message_sales?.num_installments || null,
      })) as EnrichedCollection[];
    },
    enabled: !!clientId,
  });

  // Group by sale_id
  const saleGroups: SaleGroup[] = (() => {
    const map = new Map<string, EnrichedCollection[]>();
    for (const c of collections) {
      const existing = map.get(c.sale_id) || [];
      existing.push(c);
      map.set(c.sale_id, existing);
    }
    const groups: SaleGroup[] = [];
    map.forEach((colls, saleId) => {
      const sorted = [...colls].sort((a, b) => a.due_date.localeCompare(b.due_date));
      const pending = sorted.filter(c => c.status !== 'paid');
      const paid = sorted.filter(c => c.status === 'paid');
      const totalCollected = paid.reduce((s, c) => s + Number(c.amount), 0);
      const totalPending = pending.reduce((s, c) => s + Number(c.amount), 0);
      const lastPaidAt = paid.length > 0
        ? paid.reduce((latest, c) => (!latest || (c.paid_at && c.paid_at > latest) ? c.paid_at : latest), null as string | null)
        : null;

      groups.push({
        saleId,
        customerName: colls[0].customer_name || 'Sin nombre',
        product: colls[0].product,
        totalAmount: colls[0].total_sale_amount,
        currency: colls[0].currency,
        collections: sorted,
        nextPendingCollection: pending[0] || null,
        allPaid: pending.length === 0,
        paidCount: paid.length,
        totalCount: sorted.length,
        totalCollected,
        totalPending,
        lastPaidAt,
      });
    });
    return groups;
  })();

  // Sync sale after collection update
  const syncSaleInstallments = async (saleId: string) => {
    const { data: allInstallments } = await supabase
      .from('payment_collections')
      .select('amount, status')
      .eq('sale_id', saleId);

    if (!allInstallments) return;

    const paidCount = allInstallments.filter(i => i.status === 'paid').length;
    const totalCollected = allInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);

    await supabase.from('message_sales')
      .update({
        installments_paid: paidCount,
        amount: totalCollected,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', saleId);
  };

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
    mutationFn: async ({ id, updates, saleId }: { id: string; updates: Partial<Pick<PaymentCollection, 'due_date' | 'amount' | 'notes' | 'status' | 'paid_at'>>; saleId?: string }) => {
      const { error } = await supabase.from('payment_collections').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;

      // Sync sale when marking as paid
      if (saleId && updates.status === 'paid') {
        await syncSaleInstallments(saleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-collections', clientId] });
      queryClient.invalidateQueries({ queryKey: ['message-sales'] });
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

  return { collections, saleGroups, isLoading, generateCollections, updateCollection, deleteCollection };
};
