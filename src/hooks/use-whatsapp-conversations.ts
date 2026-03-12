import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConversationData {
  waba_id: string;
  conversations: {
    data: Array<{
      data_points: Array<{
        start: number;
        end: number;
        conversation: number;
        cost: number;
        phone_number?: string;
        country?: string;
        conversation_category?: string;
        conversation_type?: string;
      }>;
    }>;
  };
}

export interface WhatsAppCheckResult {
  hasAccess: boolean;
  wabaId?: string;
  wabaName?: string;
  reason?: string;
  error?: string;
}

export const useWhatsAppCheck = (clientId: string | null) => {
  return useQuery({
    queryKey: ['whatsapp-check', clientId],
    queryFn: async (): Promise<WhatsAppCheckResult> => {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint: 'whatsapp-check' },
      });
      if (error) return { hasAccess: false, reason: 'error', error: error.message };
      return data as WhatsAppCheckResult;
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
};

export const useWhatsAppConversations = (
  clientId: string | null,
  enabled: boolean,
  dateRange: 'last_7d' | 'last_30d' | 'last_90d' = 'last_30d'
) => {
  const days = dateRange === 'last_7d' ? 7 : dateRange === 'last_90d' ? 90 : 30;
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);

  return useQuery({
    queryKey: ['whatsapp-conversations', clientId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: {
          clientId,
          endpoint: 'whatsapp-conversations',
          params: { since, until, granularity: 'DAILY' },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || data.error);
      return data as WhatsAppConversationData;
    },
    enabled: !!clientId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
