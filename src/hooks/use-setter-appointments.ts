import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'sold' | 'cancelled';

export interface SetterAppointment {
  id: string;
  client_id: string;
  lead_name: string;
  lead_goal: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  lead_context: string | null;
  appointment_date: string;
  sales_call_date: string | null;
  setter_name: string | null;
  estimated_value: number;
  currency: 'CRC' | 'USD';
  status: AppointmentStatus;
  ad_campaign_id: string | null;
  ad_campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  sale_id: string | null;
  notes: string | null;
  source: string;
  checklist_quiz: boolean;
  checklist_video: boolean;
  checklist_whatsapp: boolean;
  checklist_testimonials: boolean;
  not_sold_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentInput {
  lead_name: string;
  lead_goal?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_context?: string;
  appointment_date: string;
  sales_call_date?: string;
  setter_name?: string;
  estimated_value?: number;
  currency?: 'CRC' | 'USD';
  status?: AppointmentStatus;
  ad_campaign_id?: string;
  ad_campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  sale_id?: string | null;
  notes?: string;
  source?: string;
  product?: string;
  checklist_quiz?: boolean;
  checklist_video?: boolean;
  checklist_whatsapp?: boolean;
  checklist_testimonials?: boolean;
}

export const useSetterAppointments = (clientId: string | null, period?: string, startIso?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['setter-appointments', clientId, period, startIso],
    queryFn: async () => {
      if (!clientId) return [];

      let q = supabase
        .from('setter_appointments')
        .select('*')
        .eq('client_id', clientId)
        .order('appointment_date', { ascending: false });

      // If a raw ISO start date is provided, use it directly
      if (startIso) {
        q = q.gte('appointment_date', startIso);
      } else if (period) {
        const now = new Date();
        let start: Date;
        switch (period) {
          case 'last_7d':
            start = new Date(now.getTime() - 7 * 86400000);
            break;
          case 'last_30d':
            start = new Date(now.getTime() - 30 * 86400000);
            break;
          case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            start = new Date(now.getTime() - 30 * 86400000);
        }
        q = q.gte('appointment_date', start.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SetterAppointment[];
    },
    enabled: !!clientId,
  });

  const addAppointment = useMutation({
    mutationFn: async (input: AppointmentInput) => {
      if (!clientId || !user?.id) throw new Error('Missing client or user');
      const { error } = await supabase.from('setter_appointments').insert({
        client_id: clientId,
        created_by: user.id,
        lead_name: input.lead_name,
        lead_goal: input.lead_goal || null,
        lead_phone: input.lead_phone || null,
        lead_email: input.lead_email || null,
        lead_context: input.lead_context || null,
        appointment_date: input.appointment_date,
        sales_call_date: input.sales_call_date || null,
        setter_name: input.setter_name || null,
        estimated_value: input.estimated_value || 0,
        currency: input.currency || 'CRC',
        status: input.status || 'scheduled',
        ad_campaign_id: input.ad_campaign_id || null,
        ad_campaign_name: input.ad_campaign_name || null,
        ad_id: input.ad_id || null,
        ad_name: input.ad_name || null,
        notes: input.notes || null,
        source: input.source || 'ads',
        product: input.product || null,
        checklist_quiz: input.checklist_quiz || false,
        checklist_video: input.checklist_video || false,
        checklist_whatsapp: input.checklist_whatsapp || false,
        checklist_testimonials: input.checklist_testimonials || false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setter-appointments', clientId] });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...input }: AppointmentInput & { id: string }) => {
      const updateData: Record<string, any> = {};
      if (input.lead_name !== undefined) updateData.lead_name = input.lead_name;
      if (input.lead_goal !== undefined) updateData.lead_goal = input.lead_goal || null;
      if (input.lead_phone !== undefined) updateData.lead_phone = input.lead_phone || null;
      if (input.lead_email !== undefined) updateData.lead_email = input.lead_email || null;
      if (input.appointment_date !== undefined) updateData.appointment_date = input.appointment_date;
      if (input.sales_call_date !== undefined) updateData.sales_call_date = input.sales_call_date || null;
      if (input.setter_name !== undefined) updateData.setter_name = input.setter_name || null;
      if (input.estimated_value !== undefined) updateData.estimated_value = input.estimated_value;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.ad_campaign_id !== undefined) updateData.ad_campaign_id = input.ad_campaign_id || null;
      if (input.ad_campaign_name !== undefined) updateData.ad_campaign_name = input.ad_campaign_name || null;
      if (input.ad_id !== undefined) updateData.ad_id = input.ad_id || null;
      if (input.ad_name !== undefined) updateData.ad_name = input.ad_name || null;
      if (input.sale_id !== undefined) updateData.sale_id = input.sale_id;
      if (input.notes !== undefined) updateData.notes = input.notes || null;
      if (input.source !== undefined) updateData.source = input.source;
      if (input.product !== undefined) updateData.product = input.product || null;
      if ((input as any).lead_context !== undefined) updateData.lead_context = (input as any).lead_context || null;
      if (input.checklist_quiz !== undefined) updateData.checklist_quiz = input.checklist_quiz;
      if (input.checklist_video !== undefined) updateData.checklist_video = input.checklist_video;
      if (input.checklist_whatsapp !== undefined) updateData.checklist_whatsapp = input.checklist_whatsapp;
      if (input.checklist_testimonials !== undefined) updateData.checklist_testimonials = input.checklist_testimonials;

      const { error } = await supabase
        .from('setter_appointments')
        .update(updateData as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setter-appointments', clientId] });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('setter_appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setter-appointments', clientId] });
    },
  });

  return {
    appointments: query.data || [],
    isLoading: query.isLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  };
};
