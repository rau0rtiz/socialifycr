import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';

export interface InstantFormLead {
  id: string;
  client_id: string;
  external_id: string;
  created_time: string | null;
  ad_id: string | null;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  form_id: string | null;
  form_name: string | null;
  platform: string | null;
  is_organic: boolean | null;
  full_name: string | null;
  phone: string | null;
  lead_status: string | null;
  custom_answers: Record<string, any>;
  customer_contact_id: string | null;
  message_sale_id: string | null;
  assigned_seller_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstantFormLeadSource {
  id: string;
  client_id: string;
  spreadsheet_id: string;
  sheet_name: string;
  header_row: number;
  last_synced_at: string | null;
  last_row_count: number | null;
  last_error: string | null;
}

export const useInstantFormLeads = (clientId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['instant-form-leads', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('instant_form_leads')
        .select('*')
        .eq('client_id', clientId)
        .order('created_time', { ascending: false, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as InstantFormLead[];
    },
    enabled: !!clientId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
};

export const useInstantFormLeadSource = (clientId: string | null) => {
  return useQuery({
    queryKey: ['instant-form-lead-source', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('instant_form_lead_sources')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as InstantFormLeadSource | null;
    },
    enabled: !!clientId,
  });
};

export const useSaveInstantFormLeadSource = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spreadsheet_id: string; sheet_name: string }) => {
      if (!clientId) throw new Error('No client');
      const { error } = await supabase
        .from('instant_form_lead_sources')
        .upsert(
          {
            client_id: clientId,
            spreadsheet_id: input.spreadsheet_id.trim(),
            sheet_name: input.sheet_name.trim() || 'Sheet1',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-lead-source', clientId] });
    },
  });
};

export const useSyncInstantFormLeads = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase.functions.invoke('sync-instant-form-leads', {
        body: { client_id: clientId },
      });
      if (error) {
        let detail = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.detail) {
              try {
                const parsed = JSON.parse(body.detail);
                detail = parsed?.error?.message || body.error || detail;
              } catch { detail = body.error || detail; }
            } else if (body?.error) {
              detail = body.error;
            }
          }
        } catch {/* ignore */}
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; synced: number; skipped: number; total: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
      qc.invalidateQueries({ queryKey: ['instant-form-lead-source', clientId] });
      qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
    },
  });
};

export type InstantFormLeadStatus = 'new' | 'contactado' | 'seguimiento' | 'venta' | 'perdido';

export const useUpdateInstantFormLeadStatus = (clientId: string | null) => {
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
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
    },
  });
};

export const useUpdateInstantFormLeadSeller = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, sellerId }: { leadId: string; sellerId: string | null }) => {
      const { error } = await supabase
        .from('instant_form_leads')
        .update({ assigned_seller_id: sellerId })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
    },
  });
};

export interface ClientSeller {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const useClientSellers = (clientId: string | null) => {
  return useQuery({
    queryKey: ['client-sellers', clientId],
    queryFn: async () => {
      if (!clientId) return [] as ClientSeller[];
      // Members of this client...
      const { data: members, error: mErr } = await supabase
        .from('client_team_members')
        .select('user_id')
        .eq('client_id', clientId);
      if (mErr) throw mErr;
      const userIds = (members || []).map((m: any) => m.user_id);
      if (userIds.length === 0) return [];

      // ...who have system role setter or closer
      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['setter', 'closer']);
      if (rErr) throw rErr;
      const sellerIds = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      if (sellerIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', sellerIds);
      if (pErr) throw pErr;
      return (profiles || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
      })) as ClientSeller[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useIsClientManager = (clientId: string | null): boolean => {
  const { user } = useAuth();
  const { systemRole } = useUserRole();
  const { data } = useQuery({
    queryKey: ['is-account-manager', clientId, user?.id],
    queryFn: async () => {
      if (!user?.id || !clientId) return false;
      const { data, error } = await supabase
        .from('client_team_members')
        .select('role')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('role', 'account_manager')
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id && !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  if (systemRole === 'owner' || systemRole === 'admin' || systemRole === 'manager') return true;
  return !!data;
};

export interface RegisterFormSaleInput {
  lead: InstantFormLead;
  quantity: number;
  embroidery: boolean;
  subtotal: number;
  tax_rate: number; // 0..1 (e.g. 0.13)
  shipping?: number; // CRC, added on top of total
  notes?: string;
}

const buildSaleProductLabel = (qty: number, embroidery: boolean, shipping?: number) =>
  `${qty} camisa${qty === 1 ? '' : 's'}${embroidery ? ' c/bordado' : ''}${shipping && shipping > 0 ? ' + envío' : ''}`;

const buildSaleNotes = (input: { quantity: number; embroidery: boolean; tax_rate: number; shipping?: number; extra?: string | null }) => {
  const meta = `__formsale__:${JSON.stringify({
    quantity: input.quantity,
    embroidery: input.embroidery,
    tax_rate: input.tax_rate,
    shipping: input.shipping || 0,
  })}`;
  return input.extra ? `${input.extra}\n${meta}` : meta;
};

export const parseFormSaleNotes = (notes: string | null): { quantity?: number; embroidery?: boolean; tax_rate?: number; shipping?: number; extra?: string } => {
  if (!notes) return {};
  const m = notes.match(/__formsale__:(\{.*\})/);
  if (!m) return { extra: notes };
  try {
    const parsed = JSON.parse(m[1]);
    const extra = notes.replace(m[0], '').trim();
    return { ...parsed, extra: extra || undefined };
  } catch {
    return { extra: notes };
  }
};

export const useRegisterSaleFromInstantFormLead = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, quantity, embroidery, subtotal, tax_rate, shipping, notes }: RegisterFormSaleInput) => {
      if (!clientId) throw new Error('No client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tax_amount = Math.round(subtotal * tax_rate * 100) / 100;
      const shippingAmount = Math.max(0, Math.round((shipping || 0) * 100) / 100);
      const amount = Math.round((subtotal + tax_amount + shippingAmount) * 100) / 100;

      // 1) Upsert customer_contacts (find by phone first)
      let contactId = lead.customer_contact_id;
      const phone = (lead.phone || '').trim() || null;
      const fullName = (lead.full_name || 'Lead sin nombre').trim();

      if (!contactId && phone) {
        const { data: existing } = await supabase
          .from('customer_contacts')
          .select('id')
          .eq('client_id', clientId)
          .eq('phone', phone)
          .maybeSingle();
        if (existing) contactId = existing.id;
      }

      if (!contactId) {
        const { data: created, error: ccErr } = await supabase
          .from('customer_contacts')
          .insert({ client_id: clientId, full_name: fullName, phone })
          .select('id')
          .single();
        if (ccErr) throw ccErr;
        contactId = created.id;
      }

      // 2) Insert message_sales
      const { data: sale, error: saleErr } = await supabase
        .from('message_sales')
        .insert({
          client_id: clientId,
          created_by: user.id,
          sale_date: new Date().toISOString().slice(0, 10),
          amount,
          subtotal,
          tax_amount,
          currency: 'CRC',
          source: 'ad',
          ad_campaign_id: lead.campaign_id,
          ad_campaign_name: lead.campaign_name,
          ad_id: lead.ad_id,
          ad_name: lead.ad_name,
          customer_name: fullName,
          customer_phone: phone,
          product: buildSaleProductLabel(quantity, embroidery, shippingAmount),
          notes: buildSaleNotes({ quantity, embroidery, tax_rate, shipping: shippingAmount, extra: notes }),
          status: 'completed',
        } as any)
        .select('id')
        .single();
      if (saleErr) throw saleErr;

      // 3) Link lead -> sale
      const { error: updErr } = await supabase
        .from('instant_form_leads')
        .update({
          lead_status: 'venta',
          customer_contact_id: contactId,
          message_sale_id: sale.id,
        } as any)
        .eq('id', lead.id);
      if (updErr) throw updErr;

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
      qc.invalidateQueries({ queryKey: ['instant-form-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });
};

export interface UpdateFormSaleInput {
  saleId: string;
  quantity: number;
  embroidery: boolean;
  subtotal: number;
  tax_rate: number;
  shipping?: number;
  notes?: string;
}

export const useUpdateInstantFormSale = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, quantity, embroidery, subtotal, tax_rate, shipping, notes }: UpdateFormSaleInput) => {
      const tax_amount = Math.round(subtotal * tax_rate * 100) / 100;
      const shippingAmount = Math.max(0, Math.round((shipping || 0) * 100) / 100);
      const amount = Math.round((subtotal + tax_amount + shippingAmount) * 100) / 100;
      const { error } = await supabase
        .from('message_sales')
        .update({
          subtotal,
          tax_amount,
          amount,
          product: buildSaleProductLabel(quantity, embroidery, shippingAmount),
          notes: buildSaleNotes({ quantity, embroidery, tax_rate, shipping: shippingAmount, extra: notes }),
        } as any)
        .eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });
};

export const useDeleteInstantFormSale = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, leadId }: { saleId: string; leadId?: string | null }) => {
      if (leadId) {
        await supabase
          .from('instant_form_leads')
          .update({ message_sale_id: null, lead_status: 'seguimiento' } as any)
          .eq('id', leadId);
      }
      const { error } = await supabase.from('message_sales').delete().eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instant-form-leads', clientId] });
      qc.invalidateQueries({ queryKey: ['instant-form-sales', clientId] });
      qc.invalidateQueries({ queryKey: ['message-sales', clientId] });
    },
  });
};

export interface InstantFormSale {
  id: string;
  sale_date: string;
  amount: number;
  subtotal: number | null;
  tax_amount: number | null;
  currency: string;
  customer_name: string | null;
  product: string | null;
  notes: string | null;
  ad_campaign_name: string | null;
  created_at: string;
  lead_id?: string | null;
}

export const useInstantFormSales = (clientId: string | null) => {
  return useQuery({
    queryKey: ['instant-form-sales', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data: leads, error: leadsErr } = await supabase
        .from('instant_form_leads')
        .select('id, message_sale_id')
        .eq('client_id', clientId)
        .not('message_sale_id', 'is', null);
      if (leadsErr) throw leadsErr;
      const leadsBySaleId = new Map<string, string>();
      (leads || []).forEach((l: any) => {
        if (l.message_sale_id) leadsBySaleId.set(l.message_sale_id, l.id);
      });
      const ids = Array.from(leadsBySaleId.keys());
      if (ids.length === 0) return [] as InstantFormSale[];
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, sale_date, amount, subtotal, tax_amount, currency, customer_name, product, notes, ad_campaign_name, created_at')
        .in('id', ids)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((s) => ({
        ...s,
        lead_id: leadsBySaleId.get(s.id) || null,
      })) as InstantFormSale[];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
};
