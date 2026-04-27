import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BillingAccount {
  id: string;
  name: string;
  contact_email: string | null;
  notes: string | null;
}

export interface AgencyContract {
  id: string;
  client_id: string;
  billing_account_id: string | null;
  monthly_amount: number;
  currency: 'USD' | 'CRC';
  billing_frequency: 'monthly' | 'quarterly' | 'annual';
  posts_per_month: number;
  services: string[];
  start_date: string;
  end_date: string | null;
  status: 'active' | 'paused' | 'churned';
  churn_reason: string | null;
  notes: string | null;
}

const CRC_PER_USD = 520;

export const toUsd = (amount: number, currency: string) =>
  currency === 'CRC' ? amount / CRC_PER_USD : amount;

export const monthlyEquivalent = (c: Pick<AgencyContract, 'monthly_amount' | 'billing_frequency' | 'currency'>) => {
  const usd = toUsd(c.monthly_amount, c.currency);
  if (c.billing_frequency === 'quarterly') return usd / 3;
  if (c.billing_frequency === 'annual') return usd / 12;
  return usd;
};

export const useBillingAccounts = () => {
  return useQuery({
    queryKey: ['agency-billing-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_billing_accounts')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as BillingAccount[];
    },
  });
};

export const useAgencyContracts = () => {
  return useQuery({
    queryKey: ['agency-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_contracts')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AgencyContract[];
    },
  });
};

export const useUpsertContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contract: Partial<AgencyContract> & { client_id: string }) => {
      if (contract.id) {
        const { error } = await supabase
          .from('agency_contracts')
          .update(contract as any)
          .eq('id', contract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agency_contracts').insert(contract as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-contracts'] });
      toast.success('Contrato guardado');
    },
    onError: (e: any) => toast.error(e.message || 'Error guardando'),
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agency_contracts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-contracts'] });
      toast.success('Contrato eliminado');
    },
  });
};

export const useUpsertBillingAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (acc: Partial<BillingAccount>) => {
      if (acc.id) {
        const { error } = await supabase.from('agency_billing_accounts').update(acc as any).eq('id', acc.id);
        if (error) throw error;
        return acc.id;
      } else {
        const { data, error } = await supabase
          .from('agency_billing_accounts')
          .insert({ name: acc.name!, contact_email: acc.contact_email, notes: acc.notes })
          .select()
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-billing-accounts'] });
    },
  });
};

// ----- KPI calculations (client-side, derived) -----

export interface MonthlyMrrPoint {
  month: string; // YYYY-MM
  mrr: number;
  newMrr: number;
  lostMrr: number;
  activeClients: number;
  churned: number;
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export const computeMrrTimeline = (contracts: AgencyContract[], months = 12): MonthlyMrrPoint[] => {
  const now = new Date();
  const points: MonthlyMrrPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    const key = monthKey(d);

    let mrr = 0;
    let newMrr = 0;
    let lostMrr = 0;
    let activeClients = 0;
    let churned = 0;

    for (const c of contracts) {
      const start = new Date(c.start_date + 'T00:00:00Z');
      const end = c.end_date ? new Date(c.end_date + 'T00:00:00Z') : null;
      const monthly = monthlyEquivalent(c);

      const wasActiveDuringMonth = start <= monthEnd && (!end || end >= d);
      if (wasActiveDuringMonth && c.status !== 'paused') {
        mrr += monthly;
        activeClients += 1;
        if (start >= d && start <= monthEnd) newMrr += monthly;
      }
      if (end && end >= d && end <= monthEnd && c.status === 'churned') {
        lostMrr += monthly;
        churned += 1;
      }
    }

    points.push({ month: key, mrr, newMrr, lostMrr, activeClients, churned });
  }
  return points;
};

export const computeChurnRate = (timeline: MonthlyMrrPoint[]) => {
  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  if (!last || !prev || prev.activeClients === 0) return 0;
  return (last.churned / prev.activeClients) * 100;
};

export const computeLtv = (c: AgencyContract): number => {
  const start = new Date(c.start_date + 'T00:00:00Z');
  const end = c.end_date ? new Date(c.end_date + 'T00:00:00Z') : new Date();
  const months = Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1
  );
  return monthlyEquivalent(c) * months;
};

export const computeMonthsActive = (c: AgencyContract): number => {
  const start = new Date(c.start_date + 'T00:00:00Z');
  const end = c.end_date && c.status === 'churned' ? new Date(c.end_date + 'T00:00:00Z') : new Date();
  return Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1
  );
};
