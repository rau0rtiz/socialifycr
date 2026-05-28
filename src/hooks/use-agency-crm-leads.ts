import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AgencyCrmStatus =
  | 'nuevo'
  | 'contactado'
  | 'en_conversacion'
  | 'agendado'
  | 'cliente'
  | 'perdido';

export type LostReason =
  | 'precio'
  | 'timing'
  | 'competencia'
  | 'sin_presupuesto'
  | 'no_calificado'
  | 'otro';

export interface SaleReceipt {
  url: string;
  name: string;
  uploaded_at: string;
}

export interface AgencyCrmLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: AgencyCrmStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Venta
  sale_package: string | null;
  sale_includes: string | null;
  sale_amount: number | null;
  sale_currency: string | null;
  sale_payment_scheme: string | null;
  sale_payment_date: string | null;
  sale_payment_method: string | null;
  sale_payment_receipts: SaleReceipt[];
  sale_closed_at: string | null;
  // Pérdida
  lost_reason: LostReason | null;
  lost_objection: string | null;
  lost_at: string | null;
}

export interface CrmLeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: AgencyCrmStatus;
  notes?: string | null;
  sale_package?: string | null;
  sale_includes?: string | null;
  sale_amount?: number | null;
  sale_currency?: string | null;
  sale_payment_scheme?: string | null;
  sale_payment_date?: string | null;
  sale_payment_method?: string | null;
  sale_payment_receipts?: SaleReceipt[];
  lost_reason?: LostReason | null;
  lost_objection?: string | null;
}

export const CRM_STATUS_OPTIONS: { value: AgencyCrmStatus; label: string; color: string }[] = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'contactado', label: 'Contactado', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'en_conversacion', label: 'En conversación', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'agendado', label: 'Agendado', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { value: 'cliente', label: 'Cliente', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
];

export const LOST_REASON_OPTIONS: { value: LostReason; label: string }[] = [
  { value: 'precio', label: 'Precio' },
  { value: 'timing', label: 'Timing / no es el momento' },
  { value: 'competencia', label: 'Eligió competencia' },
  { value: 'sin_presupuesto', label: 'Sin presupuesto' },
  { value: 'no_calificado', label: 'No calificado' },
  { value: 'otro', label: 'Otro' },
];

export const PAYMENT_SCHEME_OPTIONS = [
  'Pago completo',
  '2 pagos',
  'Mensual',
  'Trimestral',
  'Anual',
  'Setup + Mensualidad',
];

export const PAYMENT_METHOD_OPTIONS = [
  'Transferencia',
  'SINPE',
  'Tarjeta',
  'Stripe',
  'PayPal',
  'Efectivo',
  'Otro',
];

export const CURRENCY_OPTIONS = ['USD', 'CRC'];

export const getStatusMeta = (status: AgencyCrmStatus) =>
  CRM_STATUS_OPTIONS.find((s) => s.value === status) ?? CRM_STATUS_OPTIONS[0];

export const getLostReasonLabel = (reason: LostReason | null | undefined) =>
  LOST_REASON_OPTIONS.find((r) => r.value === reason)?.label ?? null;

const buildPayload = (input: Partial<CrmLeadInput>, opts: { setSaleClosedAt?: boolean; setLostAt?: boolean } = {}) => {
  const payload: any = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.email !== undefined) payload.email = input.email?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  if (input.sale_package !== undefined) payload.sale_package = input.sale_package?.trim() || null;
  if (input.sale_includes !== undefined) payload.sale_includes = input.sale_includes?.trim() || null;
  if (input.sale_amount !== undefined) payload.sale_amount = input.sale_amount ?? null;
  if (input.sale_currency !== undefined) payload.sale_currency = input.sale_currency || null;
  if (input.sale_payment_scheme !== undefined) payload.sale_payment_scheme = input.sale_payment_scheme?.trim() || null;
  if (input.sale_payment_date !== undefined) payload.sale_payment_date = input.sale_payment_date || null;
  if (input.sale_payment_method !== undefined) payload.sale_payment_method = input.sale_payment_method?.trim() || null;
  if (input.sale_payment_receipts !== undefined) payload.sale_payment_receipts = input.sale_payment_receipts ?? [];
  if (input.lost_reason !== undefined) payload.lost_reason = input.lost_reason || null;
  if (input.lost_objection !== undefined) payload.lost_objection = input.lost_objection?.trim() || null;
  if (opts.setSaleClosedAt) payload.sale_closed_at = new Date().toISOString().slice(0, 10);
  if (opts.setLostAt) payload.lost_at = new Date().toISOString().slice(0, 10);
  return payload;
};


export const useAgencyCrmLeads = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['agency-crm-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_crm_leads' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AgencyCrmLead[];
    },
    staleTime: 60_000,
  });

  const createLead = useMutation({
    mutationFn: async (input: CrmLeadInput) => {
      if (!user?.id) throw new Error('No autenticado');
      const payload = buildPayload(input, {
        setSaleClosedAt: input.status === 'cliente',
        setLostAt: input.status === 'perdido',
      });
      payload.created_by = user.id;
      if (!payload.status) payload.status = 'nuevo';
      const { data, error } = await supabase
        .from('agency_crm_leads' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AgencyCrmLead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-crm-leads'] }),
  });

  const updateLead = useMutation({
    mutationFn: async ({
      id,
      patch,
      prevStatus,
    }: {
      id: string;
      patch: Partial<CrmLeadInput>;
      prevStatus?: AgencyCrmStatus;
    }) => {
      const payload = buildPayload(patch, {
        setSaleClosedAt: patch.status === 'cliente' && prevStatus !== 'cliente',
        setLostAt: patch.status === 'perdido' && prevStatus !== 'perdido',
      });
      const { error } = await supabase
        .from('agency_crm_leads' as any)
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-crm-leads'] }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agency_crm_leads' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-crm-leads'] }),
  });

  return {
    leads: query.data || [],
    isLoading: query.isLoading,
    createLead,
    updateLead,
    deleteLead,
  };
};
