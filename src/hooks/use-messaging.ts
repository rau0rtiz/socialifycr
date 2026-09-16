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

export interface OfferInput {
  id?: string;
  label: string;
  detail?: string | null;
  price?: number | null;
  currency?: string;
  tax_note?: string | null;
  status?: 'publicado' | 'pendiente' | 'historico';
  sort_order?: number;
}

/** Alta y edición del catálogo de precios: solo administradores (validado en base de datos). */
export const useSaveOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offer: OfferInput) => {
      const { id, ...rest } = offer;
      if (id) {
        const { error } = await supabase.from('msg_offers').update(rest as never).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('msg_offers').insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['msg-offers'] });
      qc.invalidateQueries({ queryKey: ['msg-offers-fingerprint'] });
    },
  });
};

export const useDeleteOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('msg_offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['msg-offers'] });
      qc.invalidateQueries({ queryKey: ['msg-offers-fingerprint'] });
    },
  });
};

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
  version: number;
  human_takeover_at: string | null;
  msg_contacts: {
    display_name: string | null;
    business_name: string | null;
    do_not_contact: boolean;
    avatar_url?: string | null;
    profile_url?: string | null;
  } | null;
  msg_contact_identities?: { username: string | null; external_id: string } | null;
}

export const useMsgConversations = (filters?: { channel?: string; stage?: Stage; unreadOnly?: boolean }) =>
  useQuery({
    queryKey: ['msg-conversations', filters],
    queryFn: async () => {
      let q = supabase
        .from('msg_conversations')
        .select('id, channel, stage, intent, fit, bot_mode, unread_count, last_inbound_at, is_demo, assignee_id, version, human_takeover_at, msg_contacts(display_name, business_name, do_not_contact, avatar_url, profile_url), msg_contact_identities(username, external_id)')
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

/** Envía un mensaje escrito por una persona del equipo por el canal real. */
export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const { data, error } = await supabase.functions.invoke('ig-send-message', {
        body: { conversationId, text },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['msg-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['msg-conversations'] });
      qc.invalidateQueries({ queryKey: ['msg-draft', vars.conversationId] });
    },
  });
};



// ---------- Fase 2: borradores del setter ----------

export type DraftStatus = 'pendiente' | 'editado' | 'descartado' | 'obsoleto';

export interface MsgDraft {
  id: string;
  conversation_id: string | null;
  agent_run_id: string | null;
  is_simulation: boolean;
  status: DraftStatus;
  intent: string;
  proposed_reply: string;
  edited_reply: string | null;
  facts: Array<{ field: string; value: string; source_message_index: number; confidence: string }>;
  fit_signals: Record<string, string>;
  suggested_action: string;
  needs_human: boolean;
  needs_human_reason: string | null;
  model: string | null;
  knowledge_version: number | null;
  knowledge_is_draft: boolean;
  latency_ms: number | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  conversation_version: number | null;
  offers_fingerprint: string | null;
  human_takeover_at: string | null;
  stale_reason: string | null;
  created_at: string;
}

/** Huella de los precios publicados: si cambia, los borradores quedan obsoletos. */
export const useOffersFingerprint = () =>
  useQuery({
    queryKey: ['msg-offers-fingerprint'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('msg_offers_fingerprint');
      if (error) throw error;
      return data as string;
    },
    staleTime: 60 * 1000,
  });

export const useConversationDraft = (conversationId: string | null) =>
  useQuery({
    queryKey: ['msg-draft', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_drafts')
        .select('*')
        .eq('conversation_id', conversationId!)
        .in('status', ['pendiente', 'editado', 'obsoleto'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MsgDraft | null;
    },
    enabled: !!conversationId,
    staleTime: 15 * 1000,
  });

export const useGenerateDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      conversationId?: string;
      simulation?: { messages: Array<{ author: string; body: string }>; contact?: Record<string, unknown> };
      useDraftKnowledge?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('msg-generate-draft', { body: input });
      if (error) {
        const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(detail?.error ?? error.message);
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { draft: MsgDraft; proposal: Record<string, unknown>; latency_ms: number };
    },
    onSuccess: (_d, vars) => {
      if (vars.conversationId) qc.invalidateQueries({ queryKey: ['msg-draft', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['msg-metrics'] });
    },
  });
};

export const useUpdateDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<{ edited_reply: string; status: DraftStatus; stale_reason: string }> }) => {
      const { error } = await supabase.from('msg_drafts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-draft'] }),
  });
};

/** Publicar el manual comercial: solo administradores (validado en base de datos). */
export const usePublishKnowledge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: number) => {
      const { error } = await supabase.rpc('msg_publish_knowledge', { p_version: version });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-knowledge'] }),
  });
};

export const useSaveKnowledgeDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { manual: string; toneNotes: string; rules: string[] }) => {
      const { data, error } = await supabase.rpc('msg_save_knowledge_draft', {
        p_manual: payload.manual,
        p_tone_notes: payload.toneNotes,
        p_rules: payload.rules,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-knowledge'] }),
  });
};

export interface TestResult {
  test_case_id: string;
  title: string;
  is_critical: boolean;
  auto_result: 'pass' | 'fail' | 'requiere_humano' | 'error';
  failures?: string[];
  notes?: string | null;
  reply?: string;
  intent?: string;
  suggested_action?: string;
  needs_human?: boolean;
  latency_ms?: number;
  usage?: { total_tokens?: number } | null;
}

export const useRunTests = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { useDraftKnowledge?: boolean; testCaseIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('msg-run-tests', { body: input });
      if (error) {
        const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(detail?.error ?? error.message);
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as {
        summary: {
          total: number; pass: number; fail: number; requiere_humano: number; error: number;
          criticos_fallidos: number; knowledge_version: number; knowledge_is_draft: boolean; model: string;
        };
        results: TestResult[];
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-test-runs'] }),
  });
};

export const useMsgTestRuns = () =>
  useQuery({
    queryKey: ['msg-test-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msg_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

export const useSetHumanVerdict = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { runId: string; verdict: 'aprobado' | 'rechazado' | null }) => {
      const { error } = await supabase
        .from('msg_test_runs')
        .update({ human_verdict: input.verdict })
        .eq('id', input.runId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['msg-test-runs'] }),
  });
};

export const useMsgMetrics = () =>
  useQuery({
    queryKey: ['msg-metrics'],
    queryFn: async () => {
      const [convs, appts, runs] = await Promise.all([
        supabase.from('msg_conversations').select('stage, is_demo, human_takeover_at'),
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
        atencionHumana: real.filter((c) => !!c.human_takeover_at).length,
        ejecucionesIA: (runs.data ?? []).filter((r) => !r.is_simulation).length,
        fallos: (runs.data ?? []).filter((r) => r.outcome === 'error').length,
      };
    },
    staleTime: 60 * 1000,
  });
