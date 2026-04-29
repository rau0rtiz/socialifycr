import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailCampaign {
  id: string;
  client_id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  html_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  target_tags: string[] | null;
  total_recipients: number | null;
  sent_count: number | null;
  failed_count: number | null;
  opened_count: number | null;
  scheduled_for: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmailCampaigns = (clientId?: string) => {
  return useQuery({
    queryKey: ['email-campaigns', clientId],
    queryFn: async () => {
      let q = supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EmailCampaign[];
    },
  });
};

export const useCancelScheduledCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ status: 'draft', scheduled_for: null })
        .eq('id', id)
        .eq('status', 'scheduled');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Programación cancelada');
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo cancelar'),
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campaña eliminada');
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo eliminar'),
  });
};
