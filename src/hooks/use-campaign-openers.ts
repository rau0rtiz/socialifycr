import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignRecipient {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  opened_at: string | null;
  created_at: string;
  error_message: string | null;
}

export const useCampaignOpeners = (campaignId: string | null) => {
  return useQuery({
    queryKey: ['campaign-openers', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('sent_emails')
        .select('id, recipient_email, recipient_name, status, opened_at, created_at, error_message')
        .eq('campaign_id', campaignId)
        .order('opened_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as CampaignRecipient[];
    },
    enabled: !!campaignId,
    staleTime: 60_000,
  });
};
