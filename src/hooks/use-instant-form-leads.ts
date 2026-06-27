import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export interface RegisterFormSaleInput {
  lead: InstantFormLead;
  amount: number;
  currency: 'CRC' | 'USD';
  product?: string;
  payment_method?: string;
  sale_date?: string;
  notes?: string;
}

export const useRegisterSaleFromInstantFormLead = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, amount, currency, product, payment_method, sale_date, notes }: RegisterFormSaleInput) => {
      if (!clientId) throw new Error('No client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1) Upsert customer_contacts (find by phone first, else by name)
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
          .insert({
            client_id: clientId,
            full_name: fullName,
            phone,
          })
          .select('id')
          .single();
        if (ccErr) throw ccErr;
        contactId = created.id;
      }

      // 2) Insert message_sales
      const saleInsert: any = {
        client_id: clientId,
        created_by: user.id,
        sale_date: sale_date || new Date().toISOString().slice(0, 10),
        amount,
        currency,
        source: 'ad',
        ad_campaign_id: lead.campaign_id,
        ad_campaign_name: lead.campaign_name,
        ad_id: lead.ad_id,
        ad_name: lead.ad_name,
        customer_name: fullName,
        customer_phone: phone,
        product: product || null,
        payment_method: payment_method || null,
        notes: notes || `Venta desde Instant Form${lead.form_name ? ` (${lead.form_name})` : ''}`,
        status: 'completed',
      };
      const { data: sale, error: saleErr } = await supabase
        .from('message_sales')
        .insert(saleInsert)
        .select('id')
        .single();
      if (saleErr) throw saleErr;

      // 3) Update lead with sale link + status
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

export interface InstantFormSale {
  id: string;
  sale_date: string;
  amount: number;
  currency: string;
  customer_name: string | null;
  product: string | null;
  ad_campaign_name: string | null;
  created_at: string;
}

export const useInstantFormSales = (clientId: string | null) => {
  return useQuery({
    queryKey: ['instant-form-sales', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data: leads, error: leadsErr } = await supabase
        .from('instant_form_leads')
        .select('message_sale_id')
        .eq('client_id', clientId)
        .not('message_sale_id', 'is', null);
      if (leadsErr) throw leadsErr;
      const ids = (leads || []).map((l: any) => l.message_sale_id).filter(Boolean);
      if (ids.length === 0) return [] as InstantFormSale[];
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, sale_date, amount, currency, customer_name, product, ad_campaign_name, created_at')
        .in('id', ids)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return (data || []) as InstantFormSale[];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
};
