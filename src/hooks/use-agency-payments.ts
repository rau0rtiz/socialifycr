import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayClient {
  id: string;
  name: string;
  logo_url: string | null;
  client_id: string | null;
  monthly_amount: number;
  currency: string;
  notes: string | null;
  active: boolean;
  iva_rate: number;
  billing_frequency: 'monthly' | 'quarterly';
  anchor_month: string | null;
  invoice_day: number | null;
  billing_name: string | null;
  billing_tax_id: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address: string | null;
}

export interface PayDate {
  id: string;
  client_id: string;
  day_of_month: number;
  amount: number;
  label: string | null;
  sort_order: number;
}

export interface PayRecord {
  id: string;
  client_id: string;
  schedule_id: string | null;
  period: string;
  due_date: string;
  amount: number;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export const PAYMENT_METHODS = [
  { value: 'compra_click', label: 'Compra Click' },
  { value: 'sinpe', label: 'SINPE' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
] as const;

export const methodLabel = (v?: string | null) =>
  PAYMENT_METHODS.find(m => m.value === v)?.label || '';

export const symbolOf = (currency: string) => (currency === 'CRC' ? '₡' : '$');

export const fmtMoney = (n: number, currency: string) =>
  `${symbolOf(currency)}${Math.round(n).toLocaleString(currency === 'CRC' ? 'es-CR' : 'en-US')}`;

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** El módulo de pagos arranca en setiembre 2026 — nada anterior se cuenta. */
export const PAYMENTS_START = new Date(2026, 8, 1);
export const PAYMENTS_START_ISO = isoDate(PAYMENTS_START);
export const monthBeforeStart = (m: Date) =>
  m.getFullYear() < 2026 || (m.getFullYear() === 2026 && m.getMonth() < 8);

export const monthLabel = (d: Date) =>
  d.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

export const clampDay = (year: number, month0: number, day: number) =>
  Math.min(Math.max(day || 1, 1), new Date(year, month0 + 1, 0).getDate());

const monthsDiff = (a: Date, b: Date) =>
  (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

/** Does this client bill in the given month? */
export const billsInMonth = (c: PayClient, month: Date) => {
  if (c.billing_frequency !== 'quarterly') return true;
  if (!c.anchor_month) return true;
  const anchor = new Date(`${c.anchor_month.slice(0, 7)}-01T12:00:00`);
  const diff = monthsDiff(month, new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  if (diff < 0) return false;
  return diff % 3 === 0;
};

/** For quarterly clients that skip this month, the next month they bill. */
export const nextBillingMonth = (c: PayClient, month: Date): Date | null => {
  if (c.billing_frequency !== 'quarterly' || !c.anchor_month) return null;
  for (let i = 1; i <= 3; i++) {
    const m = new Date(month.getFullYear(), month.getMonth() + i, 1);
    if (billsInMonth(c, m)) return m;
  }
  return null;
};

export interface Installment {
  client: PayClient;
  schedule: PayDate;
  dueIso: string;
  dueDay: number;
  base: number;
  withIva: number;
  record?: PayRecord;
}

export const useAgencyPayments = (monthDate: Date) => {
  const qc = useQueryClient();
  const periodIso = isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));

  const clientsQ = useQuery({
    queryKey: ['agency-pay-clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as PayClient[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const datesQ = useQuery({
    queryKey: ['agency-pay-dates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_dates')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PayDate[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const recordsQ = useQuery({
    queryKey: ['agency-pay-records'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_records')
        .select('*')
        .order('due_date');
      if (error) throw error;
      return (data || []) as PayRecord[];
    },
    staleTime: 1000 * 60,
  });

  const clients = clientsQ.data || [];
  const dates = datesQ.data || [];
  const records = recordsQ.data || [];

  const buildInstallments = (month: Date, onlyActive = true): Installment[] => {
    if (monthBeforeStart(month)) return [];
    const period = isoDate(new Date(month.getFullYear(), month.getMonth(), 1));
    const out: Installment[] = [];
    clients
      .filter(c => (onlyActive ? c.active : true))
      .filter(c => billsInMonth(c, month))
      .forEach(c => {
        const ivaRate = Number(c.iva_rate || 0);
        dates
          .filter(d => d.client_id === c.id)
          .sort((a, b) => a.sort_order - b.sort_order || a.day_of_month - b.day_of_month)
          .forEach(d => {
            const day = clampDay(month.getFullYear(), month.getMonth(), d.day_of_month);
            const dueIso = isoDate(new Date(month.getFullYear(), month.getMonth(), day));
            const base = Number(d.amount || 0);
            out.push({
              client: c,
              schedule: d,
              dueIso,
              dueDay: day,
              base,
              withIva: base * (1 + ivaRate / 100),
              record: records.find(r => r.schedule_id === d.id && r.period === period),
            });
          });
      });
    return out.sort((a, b) => a.dueDay - b.dueDay);
  };

  /** Rows of the selected month, grouped by client (includes skipped quarterly clients). */
  const monthRows = useMemo(() => {
    const installments = buildInstallments(monthDate);
    return clients
      .filter(c => c.active)
      .map(c => {
        const bills = billsInMonth(c, monthDate);
        const items = installments.filter(i => i.client.id === c.id);
        const subtotal = items.reduce((s, i) => s + i.base, 0);
        const totalDue = items.reduce((s, i) => s + i.withIva, 0);
        const totalPaid = items.reduce(
          (s, i) => s + (i.record?.paid ? Number(i.record.amount || i.withIva) : 0),
          0,
        );
        return {
          client: c,
          bills,
          nextMonth: bills ? null : nextBillingMonth(c, monthDate),
          items,
          subtotal,
          totalDue,
          ivaAmount: totalDue - subtotal,
          totalPaid,
        };
      })
      .sort((a, b) => {
        if (a.bills !== b.bills) return a.bills ? -1 : 1;
        const da = a.items[0]?.dueDay ?? 99;
        const db = b.items[0]?.dueDay ?? 99;
        return da - db || a.client.name.localeCompare(b.client.name);
      });
  }, [clients, dates, records, monthDate]);

  /** Totals per currency for the selected month. */
  const totalsByCurrency = useMemo(() => {
    const t: Record<string, { billed: number; paid: number; pending: number }> = {};
    monthRows.filter(r => r.bills).forEach(r => {
      const cur = r.client.currency || 'USD';
      t[cur] ??= { billed: 0, paid: 0, pending: 0 };
      t[cur].billed += r.totalDue;
      t[cur].paid += r.totalPaid;
      t[cur].pending += Math.max(r.totalDue - r.totalPaid, 0);
    });
    return t;
  }, [monthRows]);

  /** Unpaid installments from the 12 previous months whose due date has passed. */
  const overdue = useMemo(() => {
    const todayIso = isoDate(new Date());
    const items: Installment[] = [];
    for (let i = 1; i <= 12; i++) {
      const m = new Date(monthDate.getFullYear(), monthDate.getMonth() - i, 1);
      buildInstallments(m).forEach(inst => {
        if (inst.withIva <= 0) return;
        if (inst.dueIso >= todayIso) return;
        if (inst.record?.paid) return;
        items.push(inst);
      });
    }
    return items.sort((a, b) => a.dueIso.localeCompare(b.dueIso));
  }, [clients, dates, records, monthDate]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['agency-pay-clients'] });
    qc.invalidateQueries({ queryKey: ['agency-pay-dates'] });
    qc.invalidateQueries({ queryKey: ['agency-pay-records'] });
  };

  const saveClient = useMutation({
    mutationFn: async ({
      client,
      tracts,
    }: {
      client: Partial<PayClient> & { id?: string };
      tracts: Array<{ id?: string; day_of_month: number; amount: number; label: string | null }>;
    }) => {
      let clientId = client.id;
      const payload = { ...client };
      delete (payload as any).id;
      if (clientId) {
        const { error } = await (supabase as any)
          .from('agency_payment_clients')
          .update(payload)
          .eq('id', clientId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('agency_payment_clients')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        clientId = data.id;
      }

      const { data: existing } = await (supabase as any)
        .from('agency_payment_dates')
        .select('id')
        .eq('client_id', clientId);
      const keep = tracts.filter(t => t.id).map(t => t.id);
      const toDelete = (existing || []).map((e: any) => e.id).filter((id: string) => !keep.includes(id));
      if (toDelete.length) {
        const { error } = await (supabase as any).from('agency_payment_dates').delete().in('id', toDelete);
        if (error) throw error;
      }
      for (let i = 0; i < tracts.length; i++) {
        const t = tracts[i];
        const row = {
          client_id: clientId,
          day_of_month: t.day_of_month,
          amount: t.amount,
          label: t.label,
          sort_order: i,
        };
        if (t.id) {
          const { error } = await (supabase as any).from('agency_payment_dates').update(row).eq('id', t.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from('agency_payment_dates').insert(row);
          if (error) throw error;
        }
      }
      const total = tracts.reduce((s, t) => s + Number(t.amount || 0), 0);
      await (supabase as any)
        .from('agency_payment_clients')
        .update({ monthly_amount: total })
        .eq('id', clientId);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Cliente guardado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from('agency_payment_records').delete().eq('client_id', id);
      await (supabase as any).from('agency_payment_dates').delete().eq('client_id', id);
      const { error } = await (supabase as any).from('agency_payment_clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Cliente eliminado');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const upsertRecord = useMutation({
    mutationFn: async ({
      inst,
      patch,
    }: {
      inst: Installment;
      patch: Partial<Pick<PayRecord, 'paid' | 'paid_at' | 'payment_method' | 'amount' | 'notes'>>;
    }) => {
      if (inst.record) {
        const { error } = await (supabase as any)
          .from('agency_payment_records')
          .update(patch)
          .eq('id', inst.record.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_payment_records').insert({
          client_id: inst.client.id,
          schedule_id: inst.schedule.id,
          period: `${inst.dueIso.slice(0, 7)}-01`,
          due_date: inst.dueIso,
          amount: inst.withIva,
          currency: inst.client.currency,
          paid: false,
          ...patch,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-pay-records'] }),
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const togglePaid = (inst: Installment) => {
    const next = !inst.record?.paid;
    upsertRecord.mutate({
      inst,
      patch: {
        paid: next,
        paid_at: next ? new Date().toISOString() : null,
        amount: inst.record?.amount ?? inst.withIva,
      },
    });
  };

  return {
    clients,
    dates,
    records,
    monthRows,
    totalsByCurrency,
    overdue,
    periodIso,
    isLoading: clientsQ.isLoading || datesQ.isLoading || recordsQ.isLoading,
    saveClient,
    deleteClient,
    upsertRecord,
    togglePaid,
  };
};
