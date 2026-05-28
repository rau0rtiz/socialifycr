import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const DEFAULT_SELLER = 'Lucía';
export const DEFAULT_RATE_INITIAL = 15;
export const DEFAULT_RATE_PERPETUAL = 8;
export const DEFAULT_INITIAL_MONTHS = 3;

export interface SellerContract {
  id: string;
  client_id: string | null;
  customer_name: string | null;
  seller_name: string | null;
  monthly_amount: number;
  currency: string;
  billing_frequency: string;
  services: any;
  start_date: string;
  end_date: string | null;
  status: string;
  commission_rate_initial: number | null;
  commission_rate_perpetual: number | null;
  commission_initial_months: number | null;
  crm_lead_id: string | null;
  lead_source: string | null;
  lead_source_detail: string | null;
  notes: string | null;
  created_at: string;
}

export const LEAD_SOURCES = [
  { value: 'outbound', label: 'Outbound', color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
  { value: 'ads', label: 'Publicidad', color: 'border-pink-500/40 text-pink-300 bg-pink-500/10' },
  { value: 'inbound', label: 'Inbound', color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' },
  { value: 'referral', label: 'Referido', color: 'border-green-500/40 text-green-300 bg-green-500/10' },
  { value: 'event', label: 'Evento', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  { value: 'partner', label: 'Partner', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
  { value: 'other', label: 'Otro', color: 'border-muted-foreground/40 text-muted-foreground bg-muted/30' },
] as const;
export type LeadSource = typeof LEAD_SOURCES[number]['value'];


export interface SellerPaymentSchedule {
  id: string;
  contract_id: string;
  payments_per_month: number;
  payment_days: number[];
  amount_per_payment: number;
  currency: string;
}

export interface SellerCollection {
  id: string;
  client_id: string | null;
  contract_id: string | null;
  customer_name: string;
  due_date: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | string;
  paid_at: string | null;
  paid_amount: number | null;
  service_month: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  seller_name: string | null;
  notes: string | null;
}

export interface CommissionPayout {
  id: string;
  seller_name: string;
  period_start: string;
  period_end: string;
  total_commission: number;
  currency: string;
  paid_at: string;
  notes: string | null;
}

export interface NewSaleInput {
  // contract
  client_id?: string | null;
  customer_name: string;
  seller_name: string;
  start_date: string; // YYYY-MM-DD
  monthly_amount: number;
  currency: 'USD' | 'CRC';
  services?: string[];
  notes?: string;
  crm_lead_id?: string | null;
  lead_source?: string | null;
  lead_source_detail?: string | null;
  commission_rate_initial: number;
  commission_rate_perpetual: number;
  commission_initial_months: number;
  // schedule
  payments_per_month: number;
  payment_days: number[];
  amount_per_payment: number;
  months_to_generate: number;
}

// ----- Queries -----

export const useSellerContracts = (sellerName: string = DEFAULT_SELLER) => {
  return useQuery({
    queryKey: ['seller-contracts', sellerName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_contracts')
        .select('*')
        .eq('seller_name', sellerName)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SellerContract[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useSellerCollections = (sellerName: string = DEFAULT_SELLER) => {
  return useQuery({
    queryKey: ['seller-collections', sellerName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_collections')
        .select('*')
        .eq('seller_name', sellerName)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SellerCollection[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePaymentSchedules = (contractIds: string[]) => {
  return useQuery({
    queryKey: ['payment-schedules', contractIds.sort().join(',')],
    queryFn: async () => {
      if (contractIds.length === 0) return [] as SellerPaymentSchedule[];
      const { data, error } = await (supabase as any)
        .from('agency_payment_schedules')
        .select('*')
        .in('contract_id', contractIds);
      if (error) throw error;
      return (data || []) as SellerPaymentSchedule[];
    },
    enabled: contractIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommissionPayouts = (sellerName: string = DEFAULT_SELLER) => {
  return useQuery({
    queryKey: ['commission-payouts', sellerName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_commission_payouts')
        .select('*')
        .eq('seller_name', sellerName)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CommissionPayout[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ----- Mutations -----

/** Genera las cuotas a partir del cronograma para los próximos N meses. */
const generateCollectionsForSchedule = (
  contractId: string,
  clientId: string | null,
  customerName: string,
  sellerName: string,
  startDate: string, // YYYY-MM-DD
  paymentDays: number[],
  amountPerPayment: number,
  currency: string,
  monthsToGenerate: number,
) => {
  const rows: any[] = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const startMonth = new Date(sy, sm - 1, 1);
  for (let i = 0; i < monthsToGenerate; i++) {
    const month = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const days = [...paymentDays].sort((a, b) => a - b);
    for (const day of days) {
      const dayClamped = Math.min(day, lastDay);
      const due = new Date(year, monthIdx, dayClamped);
      // Skip cuotas anteriores a start_date
      if (due < new Date(sy, sm - 1, sd)) continue;
      const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      rows.push({
        contract_id: contractId,
        client_id: clientId,
        customer_name: customerName,
        seller_name: sellerName,
        due_date: dueStr,
        amount: amountPerPayment,
        currency,
        status: 'pending',
        collection_type: 'subscription',
      });
    }
  }
  return rows;
};

export const useCreateSale = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: NewSaleInput) => {
      // 1. Create contract
      const contractPayload = {
        client_id: input.client_id || null,
        customer_name: input.customer_name.trim(),
        seller_name: input.seller_name,
        monthly_amount: input.monthly_amount,
        currency: input.currency,
        billing_frequency: 'monthly',
        services: input.services || [],
        start_date: input.start_date,
        status: 'active',
        notes: input.notes || null,
        crm_lead_id: input.crm_lead_id || null,
        lead_source: input.lead_source || null,
        lead_source_detail: input.lead_source_detail || null,
        commission_rate_initial: input.commission_rate_initial,
        commission_rate_perpetual: input.commission_rate_perpetual,
        commission_initial_months: input.commission_initial_months,
      };
      const { data: contract, error: e1 } = await (supabase as any)
        .from('agency_contracts')
        .insert(contractPayload)
        .select()
        .single();
      if (e1) throw e1;

      // 2. Create schedule
      const { error: e2 } = await (supabase as any)
        .from('agency_payment_schedules')
        .insert({
          contract_id: contract.id,
          payments_per_month: input.payments_per_month,
          payment_days: input.payment_days,
          amount_per_payment: input.amount_per_payment,
          currency: input.currency,
        });
      if (e2) throw e2;

      // 3. Generate collections
      const rows = generateCollectionsForSchedule(
        contract.id,
        input.client_id || null,
        input.customer_name.trim(),
        input.seller_name,
        input.start_date,
        input.payment_days,
        input.amount_per_payment,
        input.currency,
        input.months_to_generate,
      ).map((r) => ({ ...r, created_by: user?.id || null }));
      if (rows.length > 0) {
        const { error: e3 } = await (supabase as any).from('agency_collections').insert(rows);
        if (e3) throw e3;
      }

      return contract as SellerContract;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-contracts'] });
      qc.invalidateQueries({ queryKey: ['seller-collections'] });
      qc.invalidateQueries({ queryKey: ['payment-schedules'] });
      toast.success('Venta registrada y cuotas generadas');
    },
    onError: (e: any) => toast.error(e.message || 'Error al crear venta'),
  });
};

export const useMarkCollectionPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paid_at,
      paid_amount,
    }: {
      id: string;
      paid_at: string; // YYYY-MM-DD
      paid_amount: number;
    }) => {
      const { error } = await (supabase as any)
        .from('agency_collections')
        .update({
          status: 'paid',
          paid_at: new Date(paid_at + 'T12:00:00').toISOString(),
          paid_amount,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-collections'] });
      toast.success('Cobro marcado como pagado');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUnmarkCollectionPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('agency_collections')
        .update({ status: 'pending', paid_at: null, paid_amount: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-collections'] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useChurnContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, churn_reason }: { id: string; churn_reason: string }) => {
      const { error } = await (supabase as any)
        .from('agency_contracts')
        .update({
          status: 'churned',
          churn_reason,
          end_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-contracts'] });
      qc.invalidateQueries({ queryKey: ['seller-collections'] });
      toast.success('Cliente marcado como churned');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useCreateCommissionPayout = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      seller_name: string;
      period_start: string;
      period_end: string;
      total_commission: number;
      currency: string;
      notes?: string;
    }) => {
      const { error } = await (supabase as any).from('agency_commission_payouts').insert({
        ...input,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-payouts'] });
      toast.success('Pago de comisión registrado');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ----- Helpers de cálculo (cliente) -----

export const computeServiceMonth = (startDate: string, refDate: Date = new Date()): number => {
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const months =
    (refDate.getFullYear() - start.getFullYear()) * 12 + (refDate.getMonth() - start.getMonth());
  return Math.max(1, months + 1);
};

export const computeContractRateNow = (contract: SellerContract): number => {
  const sm = computeServiceMonth(contract.start_date);
  const initial = contract.commission_rate_initial ?? DEFAULT_RATE_INITIAL;
  const perpetual = contract.commission_rate_perpetual ?? DEFAULT_RATE_PERPETUAL;
  const window = contract.commission_initial_months ?? DEFAULT_INITIAL_MONTHS;
  return sm <= window ? initial : perpetual;
};

export const isInRange = (dateStr: string | null, start: Date, end: Date) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
};
