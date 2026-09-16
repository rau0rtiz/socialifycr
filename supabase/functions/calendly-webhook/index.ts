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

      // Atribución: el enlace ofrecido más reciente que aún no tiene cita.
      const { data: offer } = await admin
        .from('msg_link_offers')
        .select('id, conversation_id')
        .is('matched_appointment_id', null)
        .order('offered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let conversationId: string | null = null;
      let contactId: string | null = null;
      let matchSource = 'sin_enlace';

      if (offer) {
        conversationId = offer.conversation_id;
        matchSource = 'enlace_chat';
        const { data: conv } = await admin
          .from('msg_conversations')
          .select('contact_id')
          .eq('id', offer.conversation_id)
          .maybeSingle();
        contactId = conv?.contact_id ?? null;
      }

      const { data: appt, error: apptErr } = await admin
        .from('msg_appointments')
        .insert({
          external_uri: eventUri,
          contact_id: contactId,
          conversation_id: conversationId,
          event_name: scheduled?.name ?? null,
          invitee_email: payload?.email ?? null,
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

      if (offer) {
        await admin.from('msg_link_offers').update({ matched_appointment_id: appt.id }).eq('id', offer.id);
        // La conversación avanza a cita confirmada (si no estaba cerrada).
        await admin
          .from('msg_conversations')
          .update({ stage: 'cita_confirmada', updated_at: new Date().toISOString() })
          .eq('id', offer.conversation_id)
          .neq('stage', 'no_interesado');
      }

      return json({ received: true, appointment: appt.id, attributed: !!offer });
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
