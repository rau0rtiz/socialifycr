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
  status: 'active' | 'paused' | 'churned' | 'discontinued';
  churn_reason: string | null;
  notes: string | null;
  customer_name: string | null;
  discontinued_at: string | null;
  discontinued_reason: string | null;
}

export interface AgencyInvoice {
  id: string;
  invoice_external_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  customer_name: string;
  client_id: string | null;
  currency: string;
  total: number;
  status: string | null;
}

export interface CustomerSummary {
  customer_name: string;
  client_id: string | null;
  invoice_count: number;
  first_invoice: string;
  last_invoice: string;
  total_revenue: number;
  avg_monthly: number; // last 6 months
  status: 'active' | 'inactive' | 'discontinued';
  daysSinceLastInvoice: number;
  discontinuedReason?: string | null;
}

export const useAgencyInvoices = () => {
  return useQuery({
    queryKey: ['agency-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_invoices')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as AgencyInvoice[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const computeCustomerSummaries = (
  invoices: AgencyInvoice[],
  discontinued: Map<string, { reason: string | null; at: string }>
): CustomerSummary[] => {
  const map = new Map<string, AgencyInvoice[]>();
  invoices.forEach(i => {
    const k = i.customer_name.trim();
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(i);
  });
  const now = Date.now();
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 180;
  const result: CustomerSummary[] = [];
  for (const [name, list] of map.entries()) {
    list.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
    const first = list[0].invoice_date;
    const last = list[list.length - 1].invoice_date;
    const total = list.reduce((s, i) => s + toUsd(Number(i.total) || 0, i.currency), 0);
    const sixCutoff = now - sixMonthsMs;
    const recent = list.filter(i => new Date(i.invoice_date).getTime() >= sixCutoff);
    const avg = recent.reduce((s, i) => s + toUsd(Number(i.total) || 0, i.currency), 0) / 6;
    const daysSince = Math.floor((now - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
    const disc = discontinued.get(name.toLowerCase());
    let status: CustomerSummary['status'] = 'active';
    if (disc) status = 'discontinued';
    else if (daysSince > 180) status = 'inactive';
    result.push({
      customer_name: name,
      client_id: list[0].client_id,
      invoice_count: list.length,
      first_invoice: first,
      last_invoice: last,
      total_revenue: total,
      avg_monthly: avg,
      status,
      daysSinceLastInvoice: daysSince,
      discontinuedReason: disc?.reason ?? null,
    });
  }
  return result.sort((a, b) => b.last_invoice.localeCompare(a.last_invoice));
};

export const computeInvoiceMrrTimeline = (invoices: AgencyInvoice[], months = 12) => {
  const now = new Date();
  const points: { month: string; revenue: number; activeCustomers: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthInv = invoices.filter(inv => inv.invoice_date.startsWith(key));
    const revenue = monthInv.reduce((s, inv) => s + toUsd(Number(inv.total) || 0, inv.currency), 0);
    const activeCustomers = new Set(monthInv.map(i => i.customer_name)).size;
    points.push({ month: key, revenue, activeCustomers });
  }
  return points;
};

export const useMarkDiscontinued = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_name, client_id, reason }: { customer_name: string; client_id: string | null; reason: string }) => {
      // Find or create contract record to flag discontinuation
      const { data: existing } = await (supabase as any)
        .from('agency_contracts')
        .select('id')
        .or(client_id ? `client_id.eq.${client_id},customer_name.eq.${customer_name}` : `customer_name.eq.${customer_name}`)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any).from('agency_contracts').update({
          status: 'discontinued',
          discontinued_at: new Date().toISOString(),
          discontinued_reason: reason,
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_contracts').insert({
          client_id: client_id,
          customer_name,
          monthly_amount: 0,
          status: 'discontinued',
          discontinued_at: new Date().toISOString(),
          discontinued_reason: reason,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-contracts'] });
      toast.success('Cliente marcado como no continúa');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });
};

export const useReactivateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_name, client_id }: { customer_name: string; client_id: string | null }) => {
      const { error } = await (supabase as any)
        .from('agency_contracts')
        .update({ status: 'active', discontinued_at: null, discontinued_reason: null })
        .or(client_id ? `client_id.eq.${client_id},customer_name.eq.${customer_name}` : `customer_name.eq.${customer_name}`)
        .eq('status', 'discontinued');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-contracts'] });
      toast.success('Cliente reactivado');
    },
  });
};

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
