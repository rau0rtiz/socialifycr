import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  audioReceived,
  callSetterModel,
  mentionsMoney,
  priceAsked,
  type AgentContext,
  type HistoryMessage,
} from '../_shared/setter-agent.ts';
import { buildRollingContext } from '../_shared/conversation-summary.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'LOVABLE_API_KEY no está configurada' }, 500);

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await authed.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'No autorizado' }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    // Pertenencia a la agencia, verificada en servidor.
    const { data: isMember, error: memberErr } = await admin.rpc('is_agency_member', { _user_id: userId });
    if (memberErr || !isMember) return json({ error: 'Sin acceso al panel de agencia' }, 403);

    const body = await req.json().catch(() => ({}));
    const conversationId: string | null = typeof body?.conversationId === 'string' ? body.conversationId : null;
    const simulation = body?.simulation && typeof body.simulation === 'object' ? body.simulation : null;
    const useDraftKnowledge = Boolean(body?.useDraftKnowledge);

    if (!conversationId && !simulation) return json({ error: 'Falta la conversación o la simulación' }, 400);

    // Contexto de conversación real (RLS del usuario decide si puede verla).
    let conversation: any = null;
    let history: HistoryMessage[] = [];
    let contact: AgentContext['contact'] = null;
    let appointments: NonNullable<AgentContext['appointments']> = [];

    if (conversationId) {
      const { data: conv, error: convErr } = await authed
        .from('msg_conversations')
        .select('id, channel, stage, version, human_takeover_at, contact_id, is_demo, context_summary, context_summary_at')
        .eq('id', conversationId)
        .maybeSingle();
      if (convErr) return json({ error: convErr.message }, 400);
      if (!conv) return json({ error: 'Sin acceso a esa conversación' }, 403);
      conversation = conv;

      const { data: recentMsgs } = await authed
        .from('msg_messages')
        .select('author, body, occurred_at, is_draft')
        .eq('conversation_id', conversationId)
        .eq('is_draft', false)
        .order('occurred_at', { ascending: false })
        .limit(40);
      const msgs = (recentMsgs ?? []).slice().reverse();
      history = (msgs ?? []).map((m: any) => ({ author: m.author, body: m.body ?? '', occurred_at: m.occurred_at }));

      const { data: c } = await authed
        .from('msg_contacts')
        .select('display_name, business_name, email, phone, notes, do_not_contact')
        .eq('id', conv.contact_id)
        .maybeSingle();
      contact = c ?? null;

      const { data: appts } = await admin
        .from('msg_appointments')
        .select('event_name, starts_at, status, host_name, invitee_name, invitee_email, match_confidence, match_source')
        .or(`conversation_id.eq.${conversationId},contact_id.eq.${conv.contact_id}`)
        .order('starts_at', { ascending: false })
        .limit(5);
      appointments = appts ?? [];
    } else {
      const rawMessages = Array.isArray(simulation.messages) ? simulation.messages.slice(0, 40) : [];
      history = rawMessages.map((m: any) => ({
        author: typeof m?.author === 'string' ? m.author : 'externo',
        body: typeof m?.body === 'string' ? m.body.slice(0, 4000) : '',
      }));
      if (!history.length) return json({ error: 'La simulación no tiene mensajes' }, 400);
      contact = simulation.contact ?? null;
    }

    // Manual comercial: real exige versión publicada; el laboratorio puede probar borrador.
    const isSimulation = !conversationId;
    let knowledge: any = null;
    if (isSimulation && useDraftKnowledge) {
      const { data } = await admin
        .from('msg_knowledge_versions')
        .select('version, manual, tone_notes, rules, examples, is_published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      knowledge = data;
    } else {
      const { data } = await admin
        .from('msg_knowledge_versions')
        .select('version, manual, tone_notes, rules, examples, is_published')
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      knowledge = data;
      if (!knowledge) {
        return json(
          { error: 'No hay una versión publicada del manual comercial. Un administrador debe publicarla.' },
          409,
        );
      }
    }
    if (!knowledge) return json({ error: 'No hay manual comercial cargado' }, 409);

    const [{ data: offers }, { data: settings }, { data: fingerprint }] = await Promise.all([
      admin
        .from('msg_offers')
        .select('label, intent, price, currency, tax_note, scope_note, detail, sort_order')
        .eq('status', 'publicado')
        .order('sort_order'),
      admin.from('msg_settings').select('booking_url, tone_notes').eq('id', true).maybeSingle(),
      admin.rpc('msg_offers_fingerprint'),
    ]);

    const ctx: AgentContext = {
      manual: knowledge.manual,
      toneNotes: settings?.tone_notes ?? knowledge.tone_notes,
      rules: Array.isArray(knowledge.rules) ? knowledge.rules : [],
      examples: knowledge.examples,
      offers: offers ?? [],
      bookingUrl: settings?.booking_url ?? 'https://socialifycr.com/agendar',
      contact,
      ...(conversationId
        ? await buildRollingContext(
            admin,
            lovableKey!,
            conversationId,
            history,
            conversation?.context_summary ?? null,
            conversation?.context_summary_at ?? null,
          )
        : { summary: null, history }),
      channel: conversation?.channel ?? 'simulacion',
      stage: conversation?.stage ?? 'nuevo',
      appointments,
    };

    const result = await callSetterModel(lovableKey, ctx);

    const runPayload = {
      conversation_id: conversationId,
      model: 'openai/gpt-6-astra',
      knowledge_version: knowledge.version,
      is_simulation: isSimulation,
      latency_ms: result.latencyMs,
    };

    if (!result.ok) {
      await admin.from('msg_agent_runs').insert({
        ...runPayload,
        outcome: 'error',
        proposal: null,
        validations: { error: result.error, status: result.status },
      });
      const message =
        result.status === 402
          ? 'Se agotaron los créditos de IA del espacio de trabajo. Hay que recargar créditos para generar borradores.'
          : result.status === 429
            ? 'El proveedor de IA está limitando las solicitudes. Intentá de nuevo en unos segundos.'
            : `Error del proveedor de IA (${result.status}): ${result.error}`;
      return json({ error: message, status: result.status }, result.status === 402 ? 402 : 502);
    }

    const { data: run } = await admin
      .from('msg_agent_runs')
      .insert({
        ...runPayload,
        outcome: 'ok',
        proposal: result.proposal,
        usage: result.usage,
        validations: {},
      })
      .select('id')
      .maybeSingle();

    // Un solo borrador vivo por conversación: se reescribe en el mismo lugar.
    let existingDraftId: string | null = null;
    if (conversationId && !isSimulation) {
      const { data: prev } = await admin
        .from('msg_drafts')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('is_simulation', false)
        .in('status', ['pendiente', 'editado', 'obsoleto'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingDraftId = prev?.id ?? null;
      if (existingDraftId) {
        // Cualquier otro sobrante queda descartado para que no se apilen.
        await admin
          .from('msg_drafts')
          .update({ status: 'descartado', stale_reason: 'Reemplazado por el borrador al día' })
          .eq('conversation_id', conversationId)
          .eq('is_simulation', false)
          .in('status', ['pendiente', 'editado', 'obsoleto'])
          .neq('id', existingDraftId);
      }
    }

    const p = result.proposal;

    // Guardarraíl: si nadie preguntó por precio y la respuesta trae montos, exige revisión humana.
    const priceLeak = history.length > 0 && !priceAsked(history) && mentionsMoney(p.reply ?? '');
    const audioIn = history.length > 0 && audioReceived(history);
    const needsHuman = Boolean(p.needs_human) || priceLeak || audioIn;
    const needsHumanReason = audioIn
      ? 'La persona envió un audio de voz. Ari no lo escucha: revisalo vos y respondé.'
      : priceLeak
        ? 'Dio precio sin que lo pidieran. Revisá la respuesta: primero hay que entender el negocio.'
        : (p.needs_human_reason ?? null);

    const payloadRow = {
        conversation_id: conversationId,
        agent_run_id: run?.id ?? null,
        is_simulation: isSimulation,
        status: 'pendiente',
        stale_reason: null,
        edited_reply: null,
        intent: p.intent ?? 'desconocido',
        proposed_reply: p.reply,
        facts: p.facts ?? [],
        fit_signals: { fit: p.fit, ...(p.fit_signals ?? {}) },
        suggested_action: p.suggested_action ?? 'responder',
        needs_human: needsHuman,
        needs_human_reason: needsHumanReason,
        model: result.model,
        knowledge_version: knowledge.version,
        knowledge_is_draft: !knowledge.is_published,
        latency_ms: result.latencyMs,
        usage: result.usage,
        conversation_version: conversation?.version ?? null,
        offers_fingerprint: (fingerprint as string) ?? null,
        human_takeover_at: conversation?.human_takeover_at ?? null,
        validations: { ...(priceLeak ? { price_leak: true } : {}), ...(audioIn ? { audio: 'derivar_humano' } : {}) },
        created_by: userId,
    };

    const { data: draft, error: draftErr } = existingDraftId
      ? await admin.from('msg_drafts').update(payloadRow).eq('id', existingDraftId).select('*').maybeSingle()
      : await admin.from('msg_drafts').insert(payloadRow).select('*').maybeSingle();

    if (draftErr) return json({ error: draftErr.message }, 400);

    return json({
      draft,
      proposal: p,
      latency_ms: result.latencyMs,
      usage: result.usage,
      model: result.model,
      knowledge_version: knowledge.version,
      knowledge_is_draft: !knowledge.is_published,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
