import { useEffect, useMemo, useRef } from 'react';
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

export const useSellerLeads = ({ sellerId, clientId, mode }: UseSellerLeadsOpts) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const effectiveSellerId = mode === 'self' ? user?.id : sellerId;

  const query = useQuery({
    queryKey: ['seller-leads', mode, effectiveSellerId, clientId],
    queryFn: async () => {
      if (!user?.id) return [] as SellerLead[];

      let q = supabase
        .from('instant_form_leads')
        .select('*')
        .order('created_time', { ascending: false, nullsFirst: false })
        .limit(2000);

      if (mode === 'self') {
        if (!user.id) return [];
        q = q.eq('assigned_seller_id', user.id);
      } else {
        if (effectiveSellerId) {
          q = q.eq('assigned_seller_id', effectiveSellerId);
        }
        if (clientId) q = q.eq('client_id', clientId);
      }

      const { data, error } = await q;
      if (error) throw error;
      const leads = (data || []) as unknown as SellerLead[];

      // Fetch client names for display
      const clientIds = Array.from(new Set(leads.map((l) => l.client_id))).filter(Boolean);
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        const nameMap = new Map<string, string>((clients || []).map((c: any) => [c.id, c.name]));
        leads.forEach((l) => { l.client_name = nameMap.get(l.client_id) || null; });
      }

      // Recontact detection: same phone across different form_id within the same client.
      const phones = Array.from(new Set(leads.map((l) => normalizePhone(l.phone)).filter((p) => p.length >= 6)));
      if (phones.length > 0 && clientIds.length > 0) {
        const { data: allSubs } = await supabase
          .from('instant_form_leads')
          .select('phone, form_id, client_id')
          .in('client_id', clientIds);
        // Map: `${client_id}|${normalizedPhone}` -> Set of form_ids
        const formsByKey = new Map<string, Set<string>>();
        (allSubs || []).forEach((row: any) => {
          const ph = normalizePhone(row.phone);
          if (ph.length < 6) return;
          const key = `${row.client_id}|${ph}`;
          if (!formsByKey.has(key)) formsByKey.set(key, new Set());
          formsByKey.get(key)!.add(row.form_id || '__null__');
        });
        leads.forEach((l) => {
          const ph = normalizePhone(l.phone);
          if (ph.length < 6) return;
          const key = `${l.client_id}|${ph}`;
          const forms = formsByKey.get(key);
          l.is_recontact = !!forms && forms.size > 1;
        });
      }

      // Collapse duplicates: same client + same phone → keep only the newest lead card,
      // flag it as recontact so the seller sees history without duplicated rows.
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
        } else {
          // Already have a newer entry (leads are ordered by created_time desc).
          prev.is_recontact = true;
        }
      }
      return collapsed;

    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

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

          // For self mode: only act when the row is assigned to me.
          if (mode === 'self' && row.assigned_seller_id !== user.id) return;
          // For manager mode: respect client filter
          if (mode === 'manager' && clientId && row.client_id !== clientId) return;
          if (mode === 'manager' && effectiveSellerId && row.assigned_seller_id !== effectiveSellerId) return;

          qc.invalidateQueries({ queryKey: ['seller-leads'] });

          // Toast on INSERT only and dedupe
          if (payload.eventType === 'INSERT' && mode === 'self') {
            if (lastNotifiedIdRef.current.has(row.id)) return;
            lastNotifiedIdRef.current.add(row.id);
            toast.success('Nuevo lead asignado', {
              description: row.full_name || row.phone || 'Lead nuevo',
              duration: 8000,
            });
            // Native browser notification
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
  }, [user?.id, mode, clientId, effectiveSellerId, qc]);

  return query;
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
