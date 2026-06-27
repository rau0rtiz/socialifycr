import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InstantFormLead, InstantFormLeadStatus } from '@/hooks/use-instant-form-leads';
import { toast } from 'sonner';

export interface SellerLead extends InstantFormLead {
  client_name?: string | null;
}

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
      return leads;
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

export const useUpdateSellerLeadStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: InstantFormLeadStatus }) => {
      const { error } = await supabase
        .from('instant_form_leads')
        .update({ lead_status: status })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-leads'] });
      qc.invalidateQueries({ queryKey: ['instant-form-leads'] });
    },
  });
};

export const useSellerLeadCounts = (leads: SellerLead[]) =>
  useMemo(() => {
    const counts = { new: 0, contactado: 0, seguimiento: 0, venta: 0, perdido: 0, total: leads.length };
    leads.forEach((l) => {
      const s = (l.lead_status || 'new') as keyof typeof counts;
      if (s in counts) (counts as any)[s] += 1;
    });
    return counts;
  }, [leads]);
