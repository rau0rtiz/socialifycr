import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Módulo Chats (setter de IA) — Fase 1: lectura de configuración y bandeja. */

export type BotMode = 'apagado' | 'borrador' | 'automatico';
export type ConnStatus = 'pendiente' | 'configurando' | 'conectado' | 'error' | 'desconectado';
export type Stage = 'nuevo' | 'conversando' | 'calificado' | 'enlace_enviado' | 'cita_confirmada' | 'no_interesado';

const CACHE = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };

export const useMsgSettings = () =>
  useQuery({
    queryKey: ['msg-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('msg_settings').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
    ...CACHE,
  });

export const useUpdateMsgSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<{
      bot_mode: BotMode;
      auto_send_enabled: boolean;
      followups_enabled: boolean;
      followup_delay_hours: number;
      timezone: string;
      provider: string | null;
      model: string | null;
      tone_notes: string | null;
      booking_url: string;
    }>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('msg_settings')
        .update({ ...patch, updated_by: userRes.user?.id ?? null })
        .eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-settings'] }),
  });
};

export const useChannelConnections = () =>
  useQuery({
    queryKey: ['msg-channel-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_connections')
        .select('*')
        .order('channel');
      if (error) throw error;
      return data ?? [];
    },
    ...CACHE,
  });

export const useMsgOffers = () =>
  useQuery({
    queryKey: ['msg-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_offers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    ...CACHE,
  });

export const useMsgKnowledge = () =>
  useQuery({
    queryKey: ['msg-knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_knowledge_versions')
        .select('*')
        .order('version', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    ...CACHE,
  });

export const useMsgTestCases = () =>
  useQuery({
    queryKey: ['msg-test-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_test_cases')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    ...CACHE,
  });

export interface InboxRow {
  id: string;
  channel: string;
  stage: Stage;
  intent: string;
  fit: string;
  bot_mode: BotMode;
  unread_count: number;
  last_inbound_at: string | null;
  is_demo: boolean;
  assignee_id: string | null;
  msg_contacts: { display_name: string | null; business_name: string | null; do_not_contact: boolean } | null;
}

export const useMsgConversations = (filters?: { channel?: string; stage?: Stage; unreadOnly?: boolean }) =>
  useQuery({
    queryKey: ['msg-conversations', filters],
    queryFn: async () => {
      let q = supabase
        .from('msg_conversations')
        .select('id, channel, stage, intent, fit, bot_mode, unread_count, last_inbound_at, is_demo, assignee_id, msg_contacts(display_name, business_name, do_not_contact)')
        .order('last_inbound_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (filters?.channel) q = q.eq('channel', filters.channel as never);
      if (filters?.stage) q = q.eq('stage', filters.stage as never);
      if (filters?.unreadOnly) q = q.gt('unread_count', 0);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as InboxRow[];
    },
    staleTime: 60 * 1000,
  });

export const useMsgMessages = (conversationId: string | null) =>
  useQuery({
    queryKey: ['msg-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('occurred_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000,
  });

export const useMsgMetrics = () =>
  useQuery({
    queryKey: ['msg-metrics'],
    queryFn: async () => {
      const [convs, appts, runs] = await Promise.all([
        supabase.from('msg_conversations').select('stage, is_demo'),
        supabase.from('msg_appointments').select('status, conversation_id'),
        supabase.from('msg_agent_runs').select('outcome, is_simulation'),
      ]);
      const real = (convs.data ?? []).filter((c) => !c.is_demo);
      const count = (s: string) => real.filter((c) => c.stage === s).length;
      const appointments = appts.data ?? [];
      return {
        conversaciones: real.length,
        calificados: count('calificado'),
        enlacesEnviados: count('enlace_enviado'),
        citasVinculadas: appointments.filter((a) => a.status === 'activa' && a.conversation_id).length,
        cancelaciones: appointments.filter((a) => a.status === 'cancelada').length,
        atencionHumana: real.filter((c) => c.stage !== 'no_interesado').length === 0 ? 0 : (convs.data ?? []).filter((c) => !c.is_demo).length - real.length,
        ejecucionesIA: (runs.data ?? []).filter((r) => !r.is_simulation).length,
        fallos: (runs.data ?? []).filter((r) => r.outcome === 'error').length,
      };
    },
    staleTime: 60 * 1000,
  });
