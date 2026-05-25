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
}

export interface CrmLeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: AgencyCrmStatus;
  notes?: string | null;
}

export const CRM_STATUS_OPTIONS: { value: AgencyCrmStatus; label: string; color: string }[] = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'contactado', label: 'Contactado', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'en_conversacion', label: 'En conversación', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'agendado', label: 'Agendado', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { value: 'cliente', label: 'Cliente', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
];

export const getStatusMeta = (status: AgencyCrmStatus) =>
  CRM_STATUS_OPTIONS.find((s) => s.value === status) ?? CRM_STATUS_OPTIONS[0];

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
      const { data, error } = await supabase
        .from('agency_crm_leads' as any)
        .insert({
          name: input.name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          status: input.status || 'nuevo',
          notes: input.notes?.trim() || null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AgencyCrmLead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-crm-leads'] }),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CrmLeadInput> }) => {
      const payload: any = {};
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.email !== undefined) payload.email = patch.email?.trim() || null;
      if (patch.phone !== undefined) payload.phone = patch.phone?.trim() || null;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;
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
