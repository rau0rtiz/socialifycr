import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  audioReceived,
  callSetterModel,
  mentionsMoney,
  priceAsked,
  type AgentContext,
  type HistoryMessage,
} from '../_shared/setter-agent.ts';
import { scheduleFirstFollowup } from '../_shared/followups.ts';
import { notifyHumanNeeded } from '../_shared/human-alert.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Llamada interna (receptor de Instagram) o un miembro de la agencia probando a mano.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'No autorizado' }, 401);
    if (jwt !== serviceKey) {
      const { data: userData } = await admin.auth.getUser(jwt);
      const user = userData?.user;
      if (!user) return json({ error: 'No autorizado' }, 401);
      const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: user.id });
      if (!isMember) return json({ error: 'Sin permiso' }, 403);
    }
    if (!lovableKey) return json({ error: 'LOVABLE_API_KEY no está configurada' }, 500);

    const body = await req.json().catch(() => null);
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
    if (!conversationId) return json({ error: 'Falta la conversación' }, 400);

    // ─── El interruptor manda: solo responde solo en modo automático ───
    const { data: settings } = await admin
      .from('msg_settings')
      .select('bot_mode, auto_send_enabled, booking_url, tone_notes, followups_enabled, followup_delay_hours')
      .eq('id', true)
      .maybeSingle();
    if (settings?.bot_mode !== 'automatico' || !settings?.auto_send_enabled) {
      return json({ skipped: 'modo_borrador' });
    }

    const { data: conv } = await admin
      .from('msg_conversations')
      .select(
        'id, channel, stage, version, human_takeover_at, contact_id, is_demo, msg_contact_identities!inner(external_id, receiving_account_id, username)',
      )
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv) return json({ error: 'Conversación no encontrada' }, 404);
    if (conv.is_demo) return json({ skipped: 'simulacion' });
    if (conv.channel !== 'instagram') return json({ skipped: 'canal_no_soportado' });


    const identity = (conv as any).msg_contact_identities as {
      external_id: string;
      receiving_account_id: string;
      username?: string | null;
    };

    const { data: contactRow } = await admin
      .from('msg_contacts')
      .select('display_name, business_name, email, phone, notes, do_not_contact')
      .eq('id', conv.contact_id)
      .maybeSingle();
    if (contactRow?.do_not_contact) return json({ skipped: 'no_contactar' });

    const { data: recentMsgs } = await admin
      .from('msg_messages')
      .select('author, body, occurred_at, direction, is_draft')
      .eq('conversation_id', conversationId)
      .eq('is_draft', false)
      .order('occurred_at', { ascending: false })
      .limit(40);
    // Traemos los 40 más recientes y los devolvemos a orden cronológico.
    const msgs = (recentMsgs ?? []).slice().reverse();
    const history: HistoryMessage[] = (msgs ?? []).map((m: any) => ({
      author: m.author,
      body: m.body ?? '',
      occurred_at: m.occurred_at,
    }));
    if (!history.length) return json({ skipped: 'sin_mensajes' });
    const last = (msgs ?? [])[msgs!.length - 1] as any;
    if (last?.direction !== 'inbound') return json({ skipped: 'ultimo_no_entrante' });
    // Ari retoma en cuanto la persona vuelve a escribir después de la intervención humana.
    // Solo se hace a un lado si el humano escribió y la persona todavía no contestó.
    if (
      conv.human_takeover_at &&
      new Date(conv.human_takeover_at).getTime() > new Date(last.occurred_at).getTime()
    ) {
      return json({ skipped: 'control_humano' });
    }


    // Manual comercial publicado (nunca el borrador en conversaciones reales).
    const { data: knowledge } = await admin
      .from('msg_knowledge_versions')
      .select('version, manual, tone_notes, rules, examples, is_published')
      .eq('is_published', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!knowledge) return json({ skipped: 'sin_manual_publicado' });

    const [{ data: offers }, { data: fingerprint }, { data: appts }] = await Promise.all([
      admin
        .from('msg_offers')
        .select('label, intent, price, currency, tax_note, scope_note, detail, sort_order')
        .eq('status', 'publicado')
        .order('sort_order'),
      admin.rpc('msg_offers_fingerprint'),
      admin
        .from('msg_appointments')
        .select('event_name, starts_at, status, host_name, invitee_name, invitee_email, match_confidence, match_source')
        .or(`conversation_id.eq.${conversationId},contact_id.eq.${conv.contact_id}`)
        .order('starts_at', { ascending: false })
        .limit(5),
    ]);

    const ctx: AgentContext = {
      manual: knowledge.manual,
      toneNotes: settings?.tone_notes ?? knowledge.tone_notes,
      rules: Array.isArray(knowledge.rules) ? knowledge.rules : [],
      examples: knowledge.examples,
      offers: offers ?? [],
      bookingUrl: settings?.booking_url ?? 'https://socialifycr.com/agendar',
      contact: contactRow ?? null,
      history,
      channel: conv.channel,
      stage: conv.stage ?? 'nuevo',
      appointments: appts ?? [],
    };

    const result = await callSetterModel(lovableKey, ctx);

    const runPayload = {
      conversation_id: conversationId,
      model: 'openai/gpt-6-astra',
      knowledge_version: knowledge.version,
      is_simulation: false,
      latency_ms: result.latencyMs,
    };

    if (!result.ok) {
      await admin.from('msg_agent_runs').insert({
        ...runPayload,
        outcome: 'error',
        proposal: null,
        validations: { error: result.error, status: result.status, auto: true },
      });
      return json({ error: result.error, status: result.status }, 502);
    }

    const { data: run } = await admin
      .from('msg_agent_runs')
      .insert({ ...runPayload, outcome: 'ok', proposal: result.proposal, usage: result.usage, validations: { auto: true } })
      .select('id')
      .maybeSingle();

    const p = result.proposal;
    const priceLeak = !priceAsked(history) && mentionsMoney(p.reply ?? '');
    const audioIn = audioReceived(history);
    const needsHuman = Boolean(p.needs_human) || priceLeak || audioIn;
    const needsHumanReason = audioIn
      ? 'La persona envió un audio de voz. Ari no lo escucha: revisalo vos y respondé.'
      : priceLeak
        ? 'Dio precio sin que lo pidieran. Revisá la respuesta: primero hay que entender el negocio.'
        : (p.needs_human_reason ?? null);

    // Un solo borrador vivo por conversación.
    await admin
      .from('msg_drafts')
      .update({ status: 'descartado', stale_reason: 'Reemplazado por la respuesta automática' })
      .eq('conversation_id', conversationId)
      .eq('is_simulation', false)
      .in('status', ['pendiente', 'editado', 'obsoleto']);

    const draftRow = {
      conversation_id: conversationId,
      agent_run_id: run?.id ?? null,
      is_simulation: false,
      status: needsHuman ? 'pendiente' : 'enviado',
      intent: p.intent ?? 'desconocido',
      proposed_reply: p.reply,
      facts: p.facts ?? [],
      fit_signals: { fit: p.fit, ...(p.fit_signals ?? {}) },
      suggested_action: p.suggested_action ?? 'responder',
      needs_human: needsHuman,
      needs_human_reason: needsHumanReason,
      model: result.model,
      knowledge_version: knowledge.version,
      knowledge_is_draft: false,
      latency_ms: result.latencyMs,
      usage: result.usage,
      conversation_version: conv.version ?? null,
      offers_fingerprint: (fingerprint as string) ?? null,
    };

    // Si hay que derivar a humano, queda como borrador y NO se envía.
    if (needsHuman) {
      await admin.from('msg_drafts').insert(draftRow);
      await notifyHumanNeeded({
        conversationId,
        contactName: contactRow?.display_name ?? null,
        handle: identity.username ?? null,
        reason: needsHumanReason ?? 'Ari pidió revisión humana.',
        lastMessage: last?.body ?? null,
        draftReply: p.reply ?? null,
      });
      return json({ sent: false, reason: 'requiere_revision_humana' });
    }

    // ─── Envío real a Instagram ───────────────────────────────────────
    const { data: secret } = await admin
      .from('channel_secrets')
      .select('access_token')
      .eq('channel', 'instagram')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!secret?.access_token) {
      await admin.from('msg_drafts').insert({ ...draftRow, status: 'pendiente' });
      return json({ sent: false, reason: 'instagram_sin_token' });
    }

    const text = String(p.reply ?? '').slice(0, 950);
    const CALENDLY_RE = /https?:\/\/(?:www\.)?(?:calendly\.com\/[^\s)]+|socialifycr\.com\/agendar[^\s)]*)/i;
    const linkMatch = text.match(CALENDLY_RE);
    let sentText = text;
    let taggedUrl: string | null = null;
    if (linkMatch) {
      // Enlace limpio, sin UTM: el sitio de marketing no los procesa y el
      // enlace modificado queda raro. La cita se amarra después por las
      // respuestas del formulario de enrutamiento (IG, correo, nombre).
      try {
        const url = new URL(linkMatch[0]);
        ['utm_source', 'utm_medium', 'utm_content', 'utm_campaign', 'utm_term'].forEach((k) =>
          url.searchParams.delete(k),
        );
        taggedUrl = url.toString();
        sentText = text.replace(linkMatch[0], taggedUrl);
      } catch {
        taggedUrl = linkMatch[0];
      }
    }

    const res = await fetch('https://graph.instagram.com/v21.0/me/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: identity.external_id },
        message: { text: sentText },
        access_token: secret.access_token,
      }),
    });
    const sendResult = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('auto send error', sendResult);
      await admin.from('msg_drafts').insert({
        ...draftRow,
        status: 'pendiente',
        needs_human: true,
        needs_human_reason: `Instagram rechazó el envío automático: ${sendResult?.error?.message ?? 'error desconocido'}`,
      });
      await notifyHumanNeeded({
        conversationId,
        contactName: contactRow?.display_name ?? null,
        handle: identity.username ?? null,
        reason: `Instagram rechazó el envío automático: ${sendResult?.error?.message ?? 'error desconocido'}`,
        lastMessage: last?.body ?? null,
        draftReply: p.reply ?? null,
      });
      return json({ sent: false, reason: 'instagram_rechazo', detail: sendResult?.error?.message ?? null });
    }

    const nowIso = new Date().toISOString();
    const { data: inserted } = await admin
      .from('msg_messages')
      .insert({
        conversation_id: conversationId,
        receiving_account_id: identity.receiving_account_id,
        external_message_id: sendResult?.message_id ?? null,
        direction: 'outbound',
        author: 'bot',
        body: sentText,
        delivery_status: 'enviado',
        occurred_at: nowIso,
      })
      .select('id')
      .maybeSingle();

    await admin.from('msg_drafts').insert({ ...draftRow, status: 'enviado' });

    if (taggedUrl) {
      await admin.from('msg_link_offers').insert({
        conversation_id: conversationId,
        message_id: inserted?.id ?? null,
        url: taggedUrl,
        offered_by: 'bot',
        offered_at: nowIso,
      });
      await admin
        .from('msg_conversations')
        .update({ stage: 'enlace_enviado' })
        .eq('id', conversationId)
        .in('stage', ['nuevo', 'conversando', 'calificado']);
    }

    // El bot responde: no marca control humano y libera el traspaso anterior.
    await admin
      .from('msg_conversations')
      .update({ last_outbound_at: nowIso, human_takeover_at: null })
      .eq('id', conversationId);

    // Si la persona no contesta, arranca la cadencia de seguimiento (4 h → 24 h → no interesado).
    await scheduleFirstFollowup(admin, conv, settings);

    return json({ sent: true, message_id: sendResult?.message_id ?? null });
  } catch (err) {
    console.error('msg-auto-reply fatal', err);
    return json({ error: String(err) }, 500);
  }
});
