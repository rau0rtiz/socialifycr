import { createClient } from 'npm:@supabase/supabase-js@2';
import { cancelPendingFollowups } from '../_shared/followups.ts';

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
            .select('id, contact_id, username')
            .eq('channel', 'instagram')
            .eq('receiving_account_id', receivingAccountId)
            .eq('external_id', senderId)
            .maybeSingle();

          // Perfil público del remitente (usuario y foto) para verlo en la bandeja.
          const fetchProfile = async (): Promise<{ username?: string; name?: string; profile_pic?: string }> => {
            try {
              const { data: secret } = await admin
                .from('channel_secrets')
                .select('access_token')
                .eq('channel', 'instagram')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (!secret?.access_token) return {};
              const res = await fetch(
                `https://graph.instagram.com/v21.0/${senderId}?fields=name,username,profile_pic&access_token=${secret.access_token}`,
              );
              const body = await res.json().catch(() => ({}));
              if (!res.ok) {
                console.error('ig profile fetch error', body);
                return {};
              }
              return body ?? {};
            } catch (e) {
              console.error('ig profile fetch failed', e);
              return {};
            }
          };

          // Prioridad: nombre real del perfil; si no hay, el @usuario.
          const preferredName = (profile: { username?: string; name?: string }) =>
            profile.name ?? (profile.username ? `@${profile.username}` : null);

          if (existingIdentity) {
            identityId = existingIdentity.id;
            contactId = existingIdentity.contact_id;
            // Contactos viejos sin usuario/foto/nombre: los completamos.
            const { data: existingContact } = await admin
              .from('msg_contacts')
              .select('display_name')
              .eq('id', existingIdentity.contact_id)
              .maybeSingle();
            const hasRealName =
              !!existingContact?.display_name && !existingContact.display_name.startsWith('@');
            if (!existingIdentity.username || !hasRealName) {
              const profile = await fetchProfile();
              if (profile.username || profile.profile_pic || profile.name) {
                if (!existingIdentity.username && profile.username) {
                  await admin
                    .from('msg_contact_identities')
                    .update({ username: profile.username })
                    .eq('id', existingIdentity.id);
                }
                await admin
                  .from('msg_contacts')
                  .update({
                    display_name: preferredName(profile),
                    avatar_url: profile.profile_pic ?? null,
                    profile_url: profile.username ? `https://instagram.com/${profile.username}` : null,
                  })
                  .eq('id', existingIdentity.contact_id);
              }
            }
          } else {
            const profile = await fetchProfile();

            const { data: newContact, error: contactErr } = await admin
              .from('msg_contacts')
              .insert({
                display_name: preferredName(profile),
                avatar_url: profile.profile_pic ?? null,
                profile_url: profile.username ? `https://instagram.com/${profile.username}` : null,
              })
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
                username: profile.username ?? null,
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

          // Sincronización con el CRM de la agencia: cada contacto de Instagram
          // crea (o actualiza) un lead vinculado por msg_contact_id.
          try {
            const { data: contactRow } = await admin
              .from('msg_contacts')
              .select('display_name, profile_url')
              .eq('id', contactId)
              .maybeSingle();
            const { data: identityRow } = await admin
              .from('msg_contact_identities')
              .select('username')
              .eq('id', identityId)
              .maybeSingle();
            const igUser = identityRow?.username ? `@${identityRow.username}` : null;
            const leadName = contactRow?.display_name ?? igUser ?? 'Contacto de Instagram';
            const crmNotes = [
              'Llegó por DM de Instagram (Chats).',
              igUser ? `Usuario: ${igUser}` : null,
              contactRow?.profile_url ? `Perfil: ${contactRow.profile_url}` : null,
            ]
              .filter(Boolean)
              .join('\n');

            const { data: existingLead } = await admin
              .from('agency_crm_leads')
              .select('id, name, notes')
              .eq('msg_contact_id', contactId)
              .maybeSingle();

            if (existingLead) {
              // Actualiza el nombre cuando el perfil ya trae nombre real.
              const updates: Record<string, string> = {};
              if (leadName && leadName !== existingLead.name && !leadName.startsWith('Contacto de Instagram')) {
                updates.name = leadName;
              }
              if (Object.keys(updates).length) {
                await admin.from('agency_crm_leads').update(updates).eq('id', existingLead.id);
              }
            } else {
              await admin.from('agency_crm_leads').insert({
                name: leadName,
                status: 'nuevo',
                notes: crmNotes,
                msg_contact_id: contactId,
              });
            }
          } catch (crmErr) {
            // No bloquea la recepción del mensaje si el CRM falla.
            console.error('crm sync error', crmErr);
          }


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

          // La persona respondió: se cancelan los seguimientos pendientes y,
          // si estaba marcada como no interesada, la conversación revive.
          await cancelPendingFollowups(admin, conversation.id, 'respondio');
          await admin
            .from('msg_conversations')
            .update({ stage: 'conversando', updated_at: nowIso })
            .eq('id', conversation.id)
            .eq('stage', 'no_interesado');


          // 3. Mensaje (idempotente por mid)
          const { error: msgErr } = await admin.from('msg_messages').upsert(
            {
              conversation_id: conversation.id,
              receiving_account_id: receivingAccountId,
              external_message_id: mid ?? null,
              direction: 'inbound',
              author: 'externo',
              body: bodyText,
              attachments,
              delivery_status: 'recibido',
              occurred_at: occurredAt,
            },
            { onConflict: 'receiving_account_id,external_message_id', ignoreDuplicates: true },
          );
          if (msgErr) console.error('message insert error', msgErr);

          // 4. La conexión demostró que funciona
          await admin
            .from('channel_connections')
            .update({ status: 'conectado', last_event_at: nowIso, last_error: null })
            .eq('channel', 'instagram');

          // 5. Respuesta automática (solo si el modo automático y los envíos están activos).
          try {
            const autoRes = await fetch(`${supabaseUrl}/functions/v1/msg-auto-reply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
              body: JSON.stringify({ conversationId: conversation.id }),
            });
            const autoBody = await autoRes.json().catch(() => ({}));
            console.log('auto-reply', autoRes.status, JSON.stringify(autoBody));
          } catch (autoErr) {
            console.error('auto-reply call failed', autoErr);
          }

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
