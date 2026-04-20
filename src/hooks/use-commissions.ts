import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CloserCommission {
  id: string;
  sale_id: string;
  client_id: string;
  closer_user_id: string | null;
  closer_manual_id: string | null;
  closer_name: string;
  sale_total: number;
  currency: string;
  base_rate: number;
  payment_method: string | null;
  method_adjustment: number;
  effective_rate: number;
  full_payment_bonus: boolean;
  total_commission: number;
  earned_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enriched (joined)
  customer_name?: string | null;
  product?: string | null;
  sale_date?: string | null;
  cash_collected?: number; // sum of paid installments at view time
  cash_collected_pct?: number; // 0..1
  earned_to_date?: number; // total_commission * cash_collected_pct
  pending_to_pay?: number; // earned_to_date - paid_amount
}

export interface CommissionPayout {
  id: string;
  client_id: string;
  closer_user_id: string | null;
  closer_manual_id: string | null;
  closer_name: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  paid_at: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CloserDirectoryEntry {
  key: string;
  name: string;
  userId: string | null;
  manualId: string | null;
  avatarUrl: string | null;
}

export const useCommissions = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: closersDirectory = [] } = useQuery({
    queryKey: ['closers-directory', clientId],
    queryFn: async (): Promise<CloserDirectoryEntry[]> => {
      if (!clientId) return [];
      const map = new Map<string, CloserDirectoryEntry>();

      // 1) client_team_members con rol closer + perfiles (PRIORIDAD: usuarios reales)
      const { data: members } = await supabase
        .from('client_team_members')
        .select('user_id, role')
        .eq('client_id', clientId);
      const memberCloserIds = (members || [])
        .filter((m: any) => m.role === 'closer')
        .map((m: any) => m.user_id);

      const realNames = new Set<string>(); // para deduplicar manuales con el mismo nombre

      if (memberCloserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', memberCloserIds);
        (profiles || []).forEach((p: any) => {
          const displayName = p.full_name || p.email || 'Sin nombre';
          const key = `user:${p.id}`;
          map.set(key, {
            key,
            name: displayName,
            userId: p.id,
            manualId: null,
            avatarUrl: p.avatar_url,
          });
          realNames.add(displayName.trim().toLowerCase());
        });
      }

      // 2) client_closers (manual) — saltar si ya existe un usuario real con el mismo nombre
      const { data: manual } = await (supabase as any)
        .from('client_closers')
        .select('id, name')
        .eq('client_id', clientId);
      (manual || []).forEach((m: any) => {
        const normalized = (m.name || '').trim().toLowerCase();
        if (realNames.has(normalized)) return; // evitar duplicado
        const key = `manual:${m.id}`;
        map.set(key, { key, name: m.name, userId: null, manualId: m.id, avatarUrl: null });
      });

      return Array.from(map.values());
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['closer-commissions', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data: rawCommissions, error } = await (supabase as any)
        .from('closer_commissions')
        .select('*, message_sales(customer_name, product, sale_date, total_sale_amount, num_installments, installment_amount)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!rawCommissions?.length) return [];

      const saleIds = rawCommissions.map((c: any) => c.sale_id);

      // Fetch all paid collections for these sales
      const { data: collections } = await supabase
        .from('payment_collections')
        .select('sale_id, amount, status')
        .in('sale_id', saleIds);

      const cashBySale = new Map<string, { collected: number; total: number }>();
      for (const c of collections || []) {
        const cur = cashBySale.get(c.sale_id) || { collected: 0, total: 0 };
        cur.total += Number(c.amount);
        if (c.status === 'paid') cur.collected += Number(c.amount);
        cashBySale.set(c.sale_id, cur);
      }

      return rawCommissions.map((c: any): CloserCommission => {
        const sale = c.message_sales || {};
        const totalSale = Number(c.sale_total || sale.total_sale_amount || 0);
        const tracked = cashBySale.get(c.sale_id);
        // If sale has installments tracked, use them. Otherwise, assume fully collected if status sale completed.
        let cashCollected = 0;
        let cashPct = 0;

        if (tracked && tracked.total > 0) {
          // installments exist
          cashCollected = tracked.collected;
          cashPct = totalSale > 0 ? Math.min(cashCollected / totalSale, 1) : 0;
        } else {
          // No installments — assume single payment fully collected (heuristic)
          cashCollected = totalSale;
          cashPct = 1;
        }

        const earnedToDate = Number((c.total_commission * cashPct).toFixed(2));
        const pendingToPay = Math.max(earnedToDate - Number(c.paid_amount || 0), 0);

        return {
          ...c,
          customer_name: sale.customer_name ?? null,
          product: sale.product ?? null,
          sale_date: sale.sale_date ?? null,
          cash_collected: cashCollected,
          cash_collected_pct: cashPct,
          earned_to_date: earnedToDate,
          pending_to_pay: pendingToPay,
        };
      });
    },
    enabled: !!clientId,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['commission-payouts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await (supabase as any)
        .from('commission_payouts')
        .select('*')
        .eq('client_id', clientId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CommissionPayout[];
    },
    enabled: !!clientId,
  });

  const recordPayout = useMutation({
    mutationFn: async (params: {
      closerName: string;
      closerUserId: string | null;
      closerManualId: string | null;
      amount: number;
      currency: string;
      paymentMethod: string | null;
      paidAt: string;
      notes: string | null;
      commissionAllocations: { commissionId: string; amount: number }[];
    }) => {
      if (!user || !clientId) throw new Error('No auth or client');

      const { data: payout, error: payoutErr } = await (supabase as any)
        .from('commission_payouts')
        .insert({
          client_id: clientId,
          closer_user_id: params.closerUserId,
          closer_manual_id: params.closerManualId,
          closer_name: params.closerName,
          amount: params.amount,
          currency: params.currency,
          payment_method: params.paymentMethod,
          paid_at: params.paidAt,
          notes: params.notes,
          created_by: user.id,
        })
        .select()
        .single();
      if (payoutErr) throw payoutErr;

      // Create items + bump paid_amount on each commission
      for (const alloc of params.commissionAllocations) {
        if (alloc.amount <= 0) continue;
        await (supabase as any).from('commission_payout_items').insert({
          payout_id: payout.id,
          commission_id: alloc.commissionId,
          amount_applied: alloc.amount,
        });

        // Fetch current and update
        const { data: current } = await (supabase as any)
          .from('closer_commissions')
          .select('paid_amount')
          .eq('id', alloc.commissionId)
          .single();
        const newPaid = Number(current?.paid_amount || 0) + alloc.amount;
        await (supabase as any)
          .from('closer_commissions')
          .update({ paid_amount: newPaid })
          .eq('id', alloc.commissionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-commissions', clientId] });
      queryClient.invalidateQueries({ queryKey: ['commission-payouts', clientId] });
    },
  });

  const markCommissionPaid = useMutation({
    mutationFn: async (commissionId: string) => {
      const { data: c } = await (supabase as any)
        .from('closer_commissions')
        .select('total_commission')
        .eq('id', commissionId)
        .single();
      if (!c) throw new Error('Commission not found');
      await (supabase as any)
        .from('closer_commissions')
        .update({ paid_amount: c.total_commission })
        .eq('id', commissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-commissions', clientId] });
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<CloserCommission, 'notes' | 'paid_amount' | 'base_rate' | 'method_adjustment' | 'total_commission'>> }) => {
      const { error } = await (supabase as any)
        .from('closer_commissions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-commissions', clientId] });
    },
  });

  const deletePayout = useMutation({
    mutationFn: async (payoutId: string) => {
      // Reverse paid_amount on each commission
      const { data: items } = await (supabase as any)
        .from('commission_payout_items')
        .select('commission_id, amount_applied')
        .eq('payout_id', payoutId);

      for (const item of items || []) {
        const { data: current } = await (supabase as any)
          .from('closer_commissions')
          .select('paid_amount')
          .eq('id', item.commission_id)
          .single();
        const newPaid = Math.max(Number(current?.paid_amount || 0) - Number(item.amount_applied), 0);
        await (supabase as any)
          .from('closer_commissions')
          .update({ paid_amount: newPaid })
          .eq('id', item.commission_id);
      }

      await (supabase as any).from('commission_payouts').delete().eq('id', payoutId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-commissions', clientId] });
      queryClient.invalidateQueries({ queryKey: ['commission-payouts', clientId] });
    },
  });

  return { commissions, payouts, closersDirectory, isLoading, recordPayout, markCommissionPaid, updateCommission, deletePayout };
};
