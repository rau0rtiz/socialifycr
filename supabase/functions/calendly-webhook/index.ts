import { createClient } from 'npm:@supabase/supabase-js@2';

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

      // ── Atribución ──────────────────────────────────────────────────
      // 1) Cruce exacto: el enlace que sale del chat lleva utm_content = id de la conversación.
      //    Funciona igual con el formulario de enrutamiento y con el calendario final
      //    (el de Lucía o el de Raúl), porque Calendly arrastra el seguimiento.
      const tracking = payload?.tracking ?? {};
      const utmConv: string | null =
        typeof tracking?.utm_content === 'string' && /^[0-9a-f-]{36}$/i.test(tracking.utm_content)
          ? tracking.utm_content
          : null;

      let offerId: string | null = null;
      let conversationId: string | null = null;
      let contactId: string | null = null;
      let matchSource = 'sin_enlace';

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
          const { data: byConv } = await admin
            .from('msg_link_offers')
            .select('id')
            .eq('conversation_id', conv.id)
            .is('matched_appointment_id', null)
            .order('offered_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          offerId = byConv?.id ?? null;
        }
      }

      // 2) Respaldo: enlace ofrecido sin cita en los últimos 14 días (enlaces viejos sin etiqueta).
      if (!conversationId) {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: offer } = await admin
          .from('msg_link_offers')
          .select('id, conversation_id')
          .is('matched_appointment_id', null)
          .gte('offered_at', since)
          .order('offered_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (offer) {
          offerId = offer.id;
          conversationId = offer.conversation_id;
          matchSource = 'enlace_chat';
          const { data: conv } = await admin
            .from('msg_conversations')
            .select('contact_id')
            .eq('id', offer.conversation_id)
            .maybeSingle();
          contactId = conv?.contact_id ?? null;
        }
      }

      // Quién atiende la cita (el enrutamiento puede mandarla al calendario de Lucía).
      const membership = Array.isArray(scheduled?.event_memberships) ? scheduled.event_memberships[0] : null;

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
          routing_form_uri: payload?.routing_form_submission ?? null,
          tracking,
          starts_at: scheduled?.start_time ?? null,
          timezone: payload?.timezone ?? 'America/Costa_Rica',
          status: 'activa',
          match_source: matchSource,
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
      if (conversationId) {
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
