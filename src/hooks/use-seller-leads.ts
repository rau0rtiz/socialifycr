import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InstantFormLead, InstantFormLeadStatus } from '@/hooks/use-instant-form-leads';
import { toast } from 'sonner';

export interface SellerLead extends InstantFormLead {
  client_name?: string | null;
  is_recontact?: boolean;
}

const normalizePhone = (p?: string | null) => (p || '').replace(/\D/g, '');

interface UseSellerLeadsOpts {
  /** When provided, fetch leads for a specific seller (manager view). */
  sellerId?: string | null;
  /** Limit to one client (managers). When null, all clients the user can access. */
  clientId?: string | null;
  /** "self" = leads assigned to current user (vendedor view). */
  mode: 'self' | 'manager';
}

const statusRank = (s?: string | null) => {
  const v = (s || '').toString().trim().toLowerCase();
  if (v === 'venta') return 5;
  if (v === 'seguimiento') return 4;
  if (v === 'visita_tienda') return 3;
  if (v === 'contactado') return 2;
  if (v === 'perdido') return 1;
  return 0;
};

const collapseLeads = (leads: SellerLead[]): SellerLead[] => {
  const timeOf = (l: SellerLead) =>
    new Date(l.created_time || (l as any).created_at || 0).getTime();
  const seen = new Map<string, SellerLead>();
  const collapsed: SellerLead[] = [];
  for (const l of leads) {
    const ph = normalizePhone(l.phone);
    if (ph.length < 6) { collapsed.push(l); continue; }
    const key = `${l.client_id}|${ph}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, l);
      collapsed.push(l);
      continue;
    }
    const prevScore = statusRank(prev.lead_status);
    const curScore = statusRank(l.lead_status);
    const preferCurrent =
      curScore > prevScore ||
      (curScore === prevScore && timeOf(l) > timeOf(prev));
    if (preferCurrent) {
      const idx = collapsed.indexOf(prev);
      if (idx !== -1) collapsed[idx] = l;
      l.is_recontact = true;
      seen.set(key, l);
    } else {
      prev.is_recontact = true;
    }
  }
  return collapsed;
};

const attachClientNames = async (leads: SellerLead[]) => {
  const clientIds = Array.from(new Set(leads.map((l) => l.client_id))).filter(Boolean);
  if (clientIds.length === 0) return;
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .in('id', clientIds);
  const nameMap = new Map<string, string>((clients || []).map((c: any) => [c.id, c.name]));
  leads.forEach((l) => { l.client_name = nameMap.get(l.client_id) || null; });
};

export const useSellerLeads = ({ sellerId, clientId, mode }: UseSellerLeadsOpts) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const effectiveSellerId = mode === 'self' ? user?.id : sellerId;

  const [data, setData] = useState<SellerLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const buildQuery = useCallback((from: number, to: number) => {
    let q = supabase
      .from('instant_form_leads')
      .select('*')
      .order('created_time', { ascending: false, nullsFirst: false })
      .range(from, to);
    if (mode === 'self') {
      q = q.eq('assigned_seller_id', user!.id);
    } else {
      if (effectiveSellerId) q = q.eq('assigned_seller_id', effectiveSellerId);
      if (clientId) q = q.eq('client_id', clientId);
    }
    return q;
  }, [mode, user?.id, effectiveSellerId, clientId]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setIsLoading(true);
    setIsLoadingMore(false);

    (async () => {
      // 1) Fast first paint: 100 most recent
      const FIRST = 100;
      const { data: firstBatch, error } = await buildQuery(0, FIRST - 1);
      if (cancelled) return;
      if (error) {
        setIsLoading(false);
        return;
      }
      const first = (firstBatch || []) as unknown as SellerLead[];
      await attachClientNames(first);
      if (cancelled) return;
      setData(collapseLeads([...first]));
      setIsLoading(false);

      if (first.length < FIRST) return; // no more

      // 2) Background load the rest, appending progressively
      setIsLoadingMore(true);
      const acc: SellerLead[] = [...first];
      const PAGE = 1000;
      for (let from = FIRST; ; from += PAGE) {
        const { data: chunkData, error: chunkErr } = await buildQuery(from, from + PAGE - 1);
        if (cancelled) return;
        if (chunkErr) break;
        const chunk = (chunkData || []) as unknown as SellerLead[];
        if (chunk.length === 0) break;
        await attachClientNames(chunk);
        if (cancelled) return;
        acc.push(...chunk);
        setData(collapseLeads([...acc]));
        if (chunk.length < PAGE) break;
        if (acc.length >= 20000) break;
      }
      if (!cancelled) setIsLoadingMore(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, mode, effectiveSellerId, clientId, reloadKey, buildQuery]);

  // Realtime: receive INSERT/UPDATE on instant_form_leads relevant to this user.
  const lastNotifiedIdRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`seller-leads-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instant_form_leads' },
        (payload: any) => {
          const row = (payload.new || payload.old) as InstantFormLead | undefined;
          if (!row) return;

          if (mode === 'self' && row.assigned_seller_id !== user.id) return;
          if (mode === 'manager' && clientId && row.client_id !== clientId) return;
          if (mode === 'manager' && effectiveSellerId && row.assigned_seller_id !== effectiveSellerId) return;

          setReloadKey((k) => k + 1);

          if (payload.eventType === 'INSERT' && mode === 'self') {
            if (lastNotifiedIdRef.current.has(row.id)) return;
            lastNotifiedIdRef.current.add(row.id);
            toast.success('Nuevo lead asignado', {
              description: row.full_name || row.phone || 'Lead nuevo',
              duration: 8000,
            });
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Nuevo lead asignado', {
                  body: row.full_name || row.phone || 'Tienes un nuevo lead.',
                  tag: row.id,
                });
              } catch { /* ignore */ }
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, mode, clientId, effectiveSellerId]);

  // Allow external invalidation via queryClient to trigger a refetch.
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event: any) => {
      const key = event?.query?.queryKey;
      if (Array.isArray(key) && key[0] === 'seller-leads' && event.type === 'updated' && event.action?.type === 'invalidate') {
        setReloadKey((k) => k + 1);
      }
    });
    return () => unsub();
  }, [qc]);

  return { data, isLoading, isLoadingMore, refetch: () => setReloadKey((k) => k + 1) };
};

import { withFreshAuth } from '@/lib/auth-retry';

export const useUpdateSellerLeadStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: InstantFormLeadStatus }) => {
      return await withFreshAuth(async () => {
        const res = await supabase
          .from('instant_form_leads')
          .update({ lead_status: status })
          .eq('id', leadId)
          .select('id, lead_status')
          .single();
        if (res.error) throw res.error;
        return res.data;
      });
    },
    onMutate: async ({ leadId, status }) => {
      // Cancel in-flight refetches that would overwrite optimistic update
      await qc.cancelQueries({ queryKey: ['seller-leads'] });
      await qc.cancelQueries({ queryKey: ['instant-form-leads'] });

      const prevSeller = qc.getQueriesData<SellerLead[]>({ queryKey: ['seller-leads'] });
      const prevInstant = qc.getQueriesData<any>({ queryKey: ['instant-form-leads'] });

      // Optimistically patch every matching cache entry
      qc.setQueriesData<SellerLead[]>({ queryKey: ['seller-leads'] }, (old) => {
        if (!Array.isArray(old)) return old as any;
        return old.map((l) => (l.id === leadId ? { ...l, lead_status: status } : l));
      });
      qc.setQueriesData<any>({ queryKey: ['instant-form-leads'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((l: any) => (l.id === leadId ? { ...l, lead_status: status } : l));
      });

      return { prevSeller, prevInstant };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback
      ctx?.prevSeller?.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.prevInstant?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seller-leads'] });
      qc.invalidateQueries({ queryKey: ['instant-form-leads'] });
    },
  });
};


export const useSellerLeadCounts = (leads: SellerLead[]) =>
  useMemo(() => {
    const counts = { new: 0, contactado: 0, seguimiento: 0, visita_tienda: 0, venta: 0, perdido: 0, total: leads.length };
    const allowed = ['new', 'contactado', 'seguimiento', 'visita_tienda', 'venta', 'perdido'];
    leads.forEach((l) => {
      const raw = (l.lead_status || '').toString().trim().toLowerCase();
      const s = (allowed.includes(raw) ? raw : 'new') as keyof typeof counts;
      (counts as any)[s] += 1;
    });
    return counts;
  }, [leads]);
