import { createClient } from 'npm:@supabase/supabase-js@2';
import { callSetterModel, type HistoryMessage } from '../_shared/setter-agent.ts';
import { buildRollingContext } from '../_shared/conversation-summary.ts';
import { FOLLOWUP_RULES, cancelPendingFollowups, scheduleFollowupJob } from '../_shared/followups.ts';
import { notifyHumanNeeded } from '../_shared/human-alert.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SECOND_DELAY_H = 24;
const FLAG_DELAY_H = 24;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Acepta llamada interna (service key) o el cron (apikey anon).
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const apikey = req.headers.get('apikey') ?? '';
    if (bearer !== serviceKey && apikey !== anonKey && bearer !== anonKey) {
      return json({ error: 'No autorizado' }, 401);
    }
    if (!lovableKey) return json({ error: 'LOVABLE_API_KEY no está configurada' }, 500);

    const { data: settings } = await admin
      .from('msg_settings')
      .select('followups_enabled, followup_delay_hours, booking_url')
      .eq('id', true)
      .maybeSingle();
    if (!settings?.followups_enabled) return json({ skipped: 'seguimientos_apagados' });

    const { data: jobs } = await admin
      .from('msg_followup_jobs')
      .select('id, conversation_id, rule_key')
      .eq('status', 'pendiente')
      .lte('due_at', new Date().toISOString())
      .order('due_at', { ascending: true })
      .limit(10);

    if (!jobs?.length) return json({ processed: 0 });

    const { data: knowledge } = await admin
      .from('msg_knowledge_versions')
      .select('manual, tone_notes, rules, examples')
      .eq('is_published', true)
      .maybeSingle();
    const { data: offers } = await admin.from('msg_offers').select('*').eq('status', 'publicado');
    const { data: secret } = await admin
      .from('channel_secrets')
      .select('access_token')
      .eq('channel', 'instagram')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const results: unknown[] = [];

    for (const job of jobs) {
      // Reclamar el trabajo para no procesarlo dos veces.
      const { data: claimed } = await admin
        .from('msg_followup_jobs')
        .update({ status: 'procesando', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'pendiente')
        .select('id')
        .maybeSingle();
      if (!claimed) continue;

      const finish = async (status: string, reason?: string) => {
        await admin
          .from('msg_followup_jobs')
          .update({ status, cancel_reason: reason ?? null, updated_at: new Date().toISOString() })
          .eq('id', job.id);
      };

      const { data: conv } = await admin
        .from('msg_conversations')
        .select('id, channel, stage, version, contact_id, is_demo, context_summary, context_summary_at, msg_contact_identities!inner(external_id, receiving_account_id)')
        .eq('id', job.conversation_id)
        .maybeSingle();

      if (!conv || conv.is_demo || conv.channel !== 'instagram') {
        await finish('cancelado', 'conversacion_no_valida');
        continue;
      }

      // ¿La persona ya respondió? Entonces no hay nada que hacer.
      const { data: lastMsg } = await admin
        .from('msg_messages')
        .select('direction')
        .eq('conversation_id', conv.id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastMsg?.direction !== 'outbound') {
        await finish('cancelado', 'respondio');
        continue;
      }

      if (job.rule_key === FOLLOWUP_RULES.FLAG) {
        // Siguió sin contestar después del segundo seguimiento: se marca no interesado.
        await admin
          .from('msg_conversations')
          .update({ stage: 'no_interesado', updated_at: new Date().toISOString() })
          .eq('id', conv.id)
          .neq('stage', 'cita_confirmada');
        await finish('procesado');
        results.push({ conversation: conv.id, action: 'no_interesado' });
        continue;
      }

      if (conv.stage === 'cita_confirmada' || conv.stage === 'no_interesado') {
        await finish('cancelado', 'etapa_final');
        continue;
      }
      if (!secret?.access_token) {
        await finish('fallido', 'sin_token');
        continue;
      }

      const identity = (conv as any).msg_contact_identities as { external_id: string; receiving_account_id: string };
      const { data: contact } = await admin
        .from('msg_contacts')
        .select('display_name, business_name, email, phone, notes, do_not_contact')
        .eq('id', conv.contact_id)
        .maybeSingle();
      if (contact?.do_not_contact) {
        await finish('cancelado', 'no_contactar');
        continue;
      }

      const { data: historyRows } = await admin
        .from('msg_messages')
        .select('author, body, occurred_at')
        .eq('conversation_id', conv.id)
        .order('occurred_at', { ascending: false })
        .limit(40);
      const history: HistoryMessage[] = (historyRows ?? []).reverse().map((m: any) => ({
        author: m.author,
        body: m.body,
        occurred_at: m.occurred_at,
      }));

      const isSecond = job.rule_key === FOLLOWUP_RULES.SECOND;
      const followupRule = isSecond
        ? 'Este mensaje es el SEGUNDO Y ÚLTIMO SEGUIMIENTO porque la persona no respondió dos veces. Despedite con amabilidad dejando la puerta abierta (ej: "quedo atenta por si más adelante te sirve 😊"), sin insistir ni presionar. No des precios salvo que los haya pedido.'
        : 'Este mensaje es un SEGUIMIENTO porque la persona no respondió tu último mensaje. Sé breve (1-2 oraciones), amigable, no repitas lo que ya dijiste, retomá la conversación con una sola pregunta que la haga avanzar. No des precios salvo que los haya pedido.';

      const result = await callSetterModel(lovableKey, {
        manual: knowledge?.manual ?? '',
        toneNotes: knowledge?.tone_notes ?? null,
        rules: [...((knowledge?.rules as string[]) ?? []), followupRule],
        examples: knowledge?.examples ?? null,
        offers: (offers ?? []) as any,
        bookingUrl: settings.booking_url ?? '',
        contact: contact ?? null,
        ...(await buildRollingContext(
          admin,
          lovableKey,
          conv.id,
          history,
          (conv as any).context_summary ?? null,
          (conv as any).context_summary_at ?? null,
        )),
        channel: 'instagram',
        stage: conv.stage,
      });

      const reply = (result.proposal?.reply ?? '').trim().slice(0, 950);
      if (!reply || result.proposal?.needs_human) {
        if (result.proposal?.needs_human) {
          await notifyHumanNeeded({
            conversationId: conv.id,
            contactName: (contact as any)?.display_name ?? null,
            handle: (identity as any)?.username ?? null,
            reason: result.proposal?.needs_human_reason ?? 'Ari pidió revisión humana durante un seguimiento.',
            lastMessage: history[history.length - 1]?.body ?? null,
            draftReply: result.proposal?.reply ?? null,
          });
        }
        await finish('cancelado', result.proposal?.needs_human ? 'requiere_humano' : 'sin_texto');
        continue;
      }

      const sendRes = await fetch('https://graph.instagram.com/v21.0/me/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: identity.external_id },
          message: { text: reply },
          access_token: secret.access_token,
        }),
      });
      const sendBody = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        console.error('followup send error', sendBody);
        await finish('fallido', sendBody?.error?.message ?? 'instagram_rechazo');
        continue;
      }

      const nowIso = new Date().toISOString();
      await admin.from('msg_messages').insert({
        conversation_id: conv.id,
        receiving_account_id: identity.receiving_account_id,
        external_message_id: sendBody?.message_id ?? null,
        direction: 'outbound',
        author: 'bot',
        body: reply,
        delivery_status: 'enviado',
        occurred_at: nowIso,
      });
      await admin.from('msg_conversations').update({ last_outbound_at: nowIso }).eq('id', conv.id);
      await finish('procesado');

      // Encadenar el siguiente paso de la cadencia.
      if (!isSecond) {
        await scheduleFollowupJob(admin, conv, FOLLOWUP_RULES.SECOND, SECOND_DELAY_H);
      } else {
        await scheduleFollowupJob(admin, conv, FOLLOWUP_RULES.FLAG, FLAG_DELAY_H);
      }

      results.push({ conversation: conv.id, action: isSecond ? 'seguimiento_2' : 'seguimiento_1' });
    }

    return json({ processed: results.length, results });
  } catch (err) {
    console.error('msg-followup-dispatch fatal', err);
    return json({ error: String(err) }, 500);
  }
});
