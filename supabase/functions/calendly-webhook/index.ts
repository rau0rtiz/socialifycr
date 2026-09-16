import { createClient } from 'npm:@supabase/supabase-js@2';
import { askModelForMatch, nameScore, type OfferCandidate } from '../_shared/appointment-match.ts';
import { cleanHandle, digitsOnly, fetchRoutingAnswers, intakeToNotes, type Intake } from '../_shared/routing-form.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Verifica la firma Calendly-Signature: "t=<ts>,v1=<hex_hmac>"
const verifySignature = async (header: string | null, rawBody: string, key: string) => {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (!parts.t || !parts.v1) return false;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${parts.t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === parts.v1;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.text();

    // Firma obligatoria: la clave la genera calendly-setup y vive en channel_secrets.
    const { data: secretRow } = await admin
      .from('channel_secrets')
      .select('access_token')
      .eq('channel', 'calendly')
      .eq('external_account_id', 'webhook')
      .maybeSingle();
    if (!secretRow?.access_token) {
      console.error('calendly-webhook: falta la clave de firma (correr calendly-setup)');
      return json({ error: 'Webhook no configurado' }, 500);
    }
    const ok = await verifySignature(req.headers.get('Calendly-Signature'), rawBody, secretRow.access_token);
    if (!ok) return json({ error: 'Firma inválida' }, 401);

    const body = JSON.parse(rawBody);
    const event = body?.event as string;
    const payload = body?.payload ?? {};
    const scheduled = payload?.scheduled_event ?? {};
    const eventUri: string | undefined = scheduled?.uri;
    if (!eventUri) return json({ received: true, ignored: 'sin evento' });

    if (event === 'invitee.created') {
      // Evitar duplicados
      const { data: existing } = await admin
        .from('msg_appointments')
        .select('id')
        .eq('external_uri', eventUri)
        .maybeSingle();
      if (existing) return json({ received: true, ignored: 'duplicado' });

      // Quién atiende la cita (el enrutamiento puede mandarla al calendario de Lucía).
      const membership = Array.isArray(scheduled?.event_memberships) ? scheduled.event_memberships[0] : null;
      const tracking = payload?.tracking ?? {};
      // Respuestas del formulario de enrutamiento (nombre, correo, IG, WhatsApp, presupuesto…).
      const submissionUri: string | null = payload?.routing_form_submission ?? null;
      const intake: Intake | null = submissionUri ? await fetchRoutingAnswers(submissionUri) : null;

      const inviteeName: string | null = payload?.name ?? intake?.nombre ?? null;
      const inviteeEmail: string | null = payload?.email ?? intake?.correo ?? null;

      // ── Atribución ──────────────────────────────────────────────────
      // Ari comparte socialifycr.com/agendar (el formulario de enrutamiento va embebido),
      // así que no siempre llega etiqueta. Cascada: etiqueta → correo → nombre → cerebro de Ari.
      let offerId: string | null = null;
      let conversationId: string | null = null;
      let contactId: string | null = null;
      let matchSource = 'sin_enlace';
      let confidence: string | null = null;
      let reason: string | null = null;

      const convContact = async (id: string) => {
        const { data } = await admin.from('msg_conversations').select('contact_id').eq('id', id).maybeSingle();
        return data?.contact_id ?? null;
      };
      const offerForConversation = async (id: string) => {
        const { data } = await admin
          .from('msg_link_offers')
          .select('id')
          .eq('conversation_id', id)
          .is('matched_appointment_id', null)
          .order('offered_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.id ?? null;
      };

      // 1) Etiqueta de seguimiento (cuando el enlace se pudo taguear).
      const utmConv: string | null =
        typeof tracking?.utm_content === 'string' && /^[0-9a-f-]{36}$/i.test(tracking.utm_content)
          ? tracking.utm_content
          : null;
      if (utmConv) {
        const { data: conv } = await admin
          .from('msg_conversations')
          .select('id, contact_id')
          .eq('id', utmConv)
          .maybeSingle();
        if (conv) {
          conversationId = conv.id;
          contactId = conv.contact_id;
          matchSource = 'enlace_chat';
          confidence = 'alta';
          reason = 'El enlace compartido en el chat traía la etiqueta de esta conversación.';
          offerId = await offerForConversation(conv.id);
        }
      }

      // 1.b) Usuario de Instagram del formulario: la pista más fuerte del flujo real.
      const formHandle = cleanHandle(intake?.instagram);
      if (!conversationId && formHandle) {
        const { data: ident } = await admin
          .from('msg_contact_identities')
          .select('contact_id, username')
          .ilike('username', formHandle)
          .limit(1)
          .maybeSingle();
        if (ident?.contact_id) {
          const { data: conv } = await admin
            .from('msg_conversations')
            .select('id')
            .eq('contact_id', ident.contact_id)
            .order('last_inbound_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();
          if (conv?.id) {
            conversationId = conv.id;
            contactId = ident.contact_id;
            matchSource = 'enlace_chat';
            confidence = 'alta';
            reason = `En el formulario puso su Instagram @${formHandle}, el mismo del chat.`;
            offerId = await offerForConversation(conv.id);
          }
        }
      }

      // Candidatos: enlaces de agenda ofrecidos y sin cita en los últimos 21 días.
      const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      const { data: offers } = conversationId
        ? { data: [] as any[] }
        : await admin
            .from('msg_link_offers')
            .select('id, conversation_id, offered_at')
            .is('matched_appointment_id', null)
            .gte('offered_at', since)
            .order('offered_at', { ascending: false })
            .limit(15);

      const candidates: OfferCandidate[] = [];
      for (const o of offers ?? []) {
        const { data: conv } = await admin
          .from('msg_conversations')
          .select('contact_id, msg_contacts(display_name, email, business_name)')
          .eq('id', o.conversation_id)
          .maybeSingle();
        const c: any = (conv as any)?.msg_contacts ?? null;
        const { data: msgs } = await admin
          .from('msg_messages')
          .select('body, direction')
          .eq('conversation_id', o.conversation_id)
          .order('occurred_at', { ascending: false })
          .limit(6);
        candidates.push({
          offer_id: o.id,
          conversation_id: o.conversation_id,
          contact_id: (conv as any)?.contact_id ?? null,
          contact_name: c?.display_name ?? null,
          contact_username: c?.business_name ?? null,
          contact_email: c?.email ?? null,
          offered_at: o.offered_at,
          last_messages: (msgs ?? [])
            .reverse()
            .map((m: any) => `${m.direction === 'inbound' ? 'contacto' : 'nosotros'}: ${String(m.body ?? '').slice(0, 160)}`),
        } as OfferCandidate & { contact_email: string | null });
      }

      // 2) Correo idéntico al del contacto.
      if (!conversationId && inviteeEmail) {
        const hit = candidates.find(
          (c: any) => c.contact_email && String(c.contact_email).toLowerCase() === inviteeEmail.toLowerCase(),
        );
        if (hit) {
          conversationId = hit.conversation_id;
          contactId = hit.contact_id;
          offerId = hit.offer_id;
          matchSource = 'enlace_chat';
          confidence = 'alta';
          reason = 'El correo de quien agendó es el mismo del contacto del chat.';
        }
      }

      // 3) Nombre del invitado igual al del contacto (nombre + apellido).
      if (!conversationId && inviteeName) {
        const scored = candidates
          .map((c) => ({ c, s: nameScore(inviteeName, c.contact_name) }))
          .filter((x) => x.s >= 0.9)
          .sort((a, b) => b.s - a.s);
        if (scored.length === 1) {
          conversationId = scored[0].c.conversation_id;
          contactId = scored[0].c.contact_id;
          offerId = scored[0].c.offer_id;
          matchSource = 'enlace_chat';
          confidence = 'alta';
          reason = `El nombre de quien agendó coincide con el contacto (${scored[0].c.contact_name}).`;
        }
      }

      // 4) Cerebro de Ari: revisa nombre, horario acordado y contexto del chat.
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (!conversationId && candidates.length && lovableKey) {
        const verdict = await askModelForMatch(
          lovableKey,
          {
            name: inviteeName,
            email: inviteeEmail,
            starts_at: scheduled?.start_time ?? null,
            event_name: scheduled?.name ?? null,
            host_name: membership?.user_name ?? null,
          },
          candidates,
        );
        if (verdict?.conversation_id) {
          const hit = candidates.find((c) => c.conversation_id === verdict.conversation_id)!;
          conversationId = hit.conversation_id;
          contactId = hit.contact_id;
          offerId = hit.offer_id;
          matchSource = 'enlace_chat';
          confidence = verdict.confidence;
          reason = verdict.reason;
        } else if (verdict) {
          confidence = 'baja';
          reason = verdict.reason;
        }
      }

      const { data: appt, error: apptErr } = await admin
        .from('msg_appointments')
        .insert({
          external_uri: eventUri,
          contact_id: contactId,
          conversation_id: conversationId,
          event_name: scheduled?.name ?? null,
          invitee_email: payload?.email ?? null,
          invitee_name: payload?.name ?? null,
          host_name: membership?.user_name ?? null,
          host_email: membership?.user_email ?? null,
          routing_form_uri: submissionUri,
          routing_answers: intake ?? {},
          tracking,
          starts_at: scheduled?.start_time ?? null,
          timezone: payload?.timezone ?? 'America/Costa_Rica',
          status: 'activa',
          match_source: matchSource,
          match_confidence: confidence,
          match_reason: reason,
          raw_payload: body,
        })
        .select('id')
        .single();
      if (apptErr) {
        console.error('appointment insert error', apptErr);
        return json({ error: 'No se pudo registrar la cita' }, 500);
      }

      if (offerId) {
        await admin.from('msg_link_offers').update({ matched_appointment_id: appt.id }).eq('id', offerId);
      }
      if (conversationId && confidence !== 'baja') {
        // La conversación avanza a cita confirmada (si no estaba cerrada).
        await admin
          .from('msg_conversations')
          .update({ stage: 'cita_confirmada', updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .neq('stage', 'no_interesado');
      }

      return json({ received: true, appointment: appt.id, attributed: !!conversationId, host: membership?.user_email ?? null });
    }

    if (event === 'invitee.canceled') {
      await admin.from('msg_appointments').update({ status: 'cancelada' }).eq('external_uri', eventUri);
      return json({ received: true, canceled: true });
    }

    return json({ received: true, ignored: event ?? 'evento desconocido' });
  } catch (err) {
    console.error('calendly-webhook fatal', err);
    return json({ error: String(err) }, 500);
  }
});
