import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // ─── GET: verificación de webhook por parte de Meta ───────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode !== 'subscribe' || !token || !challenge) {
        return json({ error: 'Petición de verificación inválida' }, 400);
      }

      const { data: conn } = await admin
        .from('channel_connections')
        .select('diagnostics')
        .eq('channel', 'instagram')
        .maybeSingle();

      const expected = conn?.diagnostics?.verify_token;
      if (!expected || token !== expected) {
        return json({ error: 'Token de verificación incorrecto' }, 403);
      }

      return text(challenge);
    }

    // ─── POST: eventos de mensajería de Instagram ─────────────────────
    if (req.method === 'POST') {
      const payload = await req.json().catch(() => null);
      if (!payload || typeof payload !== 'object') return json({ error: 'Payload inválido' }, 400);

      const object = (payload as any).object as string | undefined;
      if (object !== 'instagram' && object !== 'page') {
        // Objeto desconocido: respondemos 200 para que Meta no reintente.
        return json({ received: true, ignored: `object:${object}` });
      }

      const entries: any[] = Array.isArray((payload as any).entry) ? (payload as any).entry : [];

      for (const entry of entries) {
        const receivingAccountId: string | undefined = entry?.id ? String(entry.id) : undefined;
        const messaging: any[] = Array.isArray(entry?.messaging) ? entry.messaging : [];

        for (const event of messaging) {
          const senderId: string | undefined = event?.sender?.id ? String(event.sender.id) : undefined;
          const message = event?.message ?? null;
          const mid: string | undefined = message?.mid ? String(message.mid) : undefined;
          const isEcho = Boolean(message?.is_echo);

          // Dedupe: sin id de mensaje usamos sender+timestamp.
          const dedupeKey = mid ?? `${senderId ?? 'unknown'}:${event?.timestamp ?? Date.now()}:${isEcho ? 'echo' : 'in'}`;
          const { data: stored, error: storeErr } = await admin
            .from('msg_webhook_events')
            .upsert(
              {
                provider: 'instagram',
                dedupe_key: dedupeKey,
                payload: { object, entry_id: receivingAccountId, event },
                status: 'procesado',
                processed_at: new Date().toISOString(),
              },
              { onConflict: 'provider,dedupe_key', ignoreDuplicates: true },
            )
            .select('id')
            .maybeSingle();

          if (storeErr) {
            console.error('webhook store error', storeErr);
            continue;
          }
          // Si stored es null, el evento ya existía → ya fue procesado antes.
          if (!stored) continue;

          // Mensaje de eco = envío propio; hoy no enviamos nada, lo registramos y seguimos.
          if (isEcho) continue;

          if (!receivingAccountId || !senderId || !message) continue;

          // Texto o adjuntos. Sin texto, guardamos una etiqueta del adjunto (ej. audio de voz)
          // para que el setter sepa que llegó un audio y lo derive a humano.
          const attachments = Array.isArray(message.attachments) ? message.attachments : [];
          const typeOf = (a: any) => String(a?.type ?? '').toLowerCase();
          const attachmentLabel: string | null = attachments.length
            ? attachments.some((a: any) => typeOf(a).includes('audio'))
              ? '[Audio de voz]'
              : attachments.some((a: any) => typeOf(a).includes('sticker'))
                ? '[Sticker]'
                : attachments.some((a: any) => typeOf(a).includes('image'))
                  ? '[Imagen]'
                  : attachments.some((a: any) => typeOf(a).includes('video'))
                    ? '[Video]'
                    : '[Adjunto]'
            : null;
          const bodyText: string | null =
            typeof message.text === 'string' && message.text.trim() ? message.text : attachmentLabel;
          if (!bodyText) continue;

          // 1. Identidad del contacto (única por canal + cuenta + emisor)
          let contactId: string | null = null;
          let identityId: string | null = null;

          const { data: existingIdentity } = await admin
            .from('msg_contact_identities')
            .select('id, contact_id')
            .eq('channel', 'instagram')
            .eq('receiving_account_id', receivingAccountId)
            .eq('external_id', senderId)
            .maybeSingle();

          if (existingIdentity) {
            identityId = existingIdentity.id;
            contactId = existingIdentity.contact_id;
          } else {
            const { data: newContact, error: contactErr } = await admin
              .from('msg_contacts')
              .insert({ display_name: null })
              .select('id')
              .single();
            if (contactErr || !newContact) {
              console.error('contact create error', contactErr);
              continue;
            }
            contactId = newContact.id;
            const { data: newIdentity, error: identityErr } = await admin
              .from('msg_contact_identities')
              .insert({
                contact_id: contactId,
                channel: 'instagram',
                receiving_account_id: receivingAccountId,
                external_id: senderId,
              })
              .select('id')
              .single();
            if (identityErr || !newIdentity) {
              console.error('identity create error', identityErr);
              continue;
            }
            identityId = newIdentity.id;
          }

          if (!identityId || !contactId) continue;

          // 2. Conversación (única por identidad). Nuevo mensaje entrante → versión +1 (borradores quedan obsoletos).
          const nowIso = new Date().toISOString();
          const occurredAt = typeof event.timestamp === 'number' ? new Date(event.timestamp).toISOString() : nowIso;

          const { data: conversation, error: convErr } = await admin
            .from('msg_conversations')
            .upsert(
              { identity_id: identityId, contact_id: contactId, channel: 'instagram' },
              { onConflict: 'identity_id' },
            )
            .select('id')
            .maybeSingle();
          if (convErr || !conversation) {
            console.error('conversation upsert error', convErr);
            continue;
          }

          await admin.rpc('msg_bump_conversation_on_inbound', {
            _conversation_id: conversation.id,
            _occurred_at: occurredAt,
          });

          // 3. Mensaje (idempotente por mid)
          await admin.from('msg_messages').upsert(
            {
              conversation_id: conversation.id,
              receiving_account_id: receivingAccountId,
              external_message_id: mid ?? null,
              direction: 'entrante',
              author: 'contacto',
              body: bodyText,
              attachments,
              delivery_status: 'recibido',
              occurred_at: occurredAt,
            },
            { onConflict: 'receiving_account_id,external_message_id', ignoreDuplicates: true },
          );

          // 4. La conexión demostró que funciona
          await admin
            .from('channel_connections')
            .update({ status: 'conectado', last_event_at: nowIso, last_error: null })
            .eq('channel', 'instagram');
        }
      }

      return json({ received: true });
    }

    return json({ error: 'Método no permitido' }, 405);
  } catch (err) {
    console.error('ig-webhook fatal', err);
    // Meta reintenta si no recibimos 200; igual registramos el error.
    return json({ received: true, error: String(err) });
  }
});
