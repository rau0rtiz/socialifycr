import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const GRAPH = 'https://graph.instagram.com/v21.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Autorización: service role interno o miembro de agencia autenticado.
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace('Bearer ', '').trim();
    let allowed = bearer && bearer === serviceKey;
    if (!allowed && bearer) {
      const authed = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: userData } = await authed.auth.getUser();
      if (userData?.user) {
        const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: userData.user.id });
        allowed = Boolean(isMember);
      }
    }
    if (!allowed) return json({ error: 'No autorizado' }, 401);

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number((body as any)?.days ?? 5) || 5, 1), 30);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const { data: secret } = await admin
      .from('channel_secrets')
      .select('access_token, external_account_id')
      .eq('channel', 'instagram')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!secret?.access_token) return json({ error: 'Instagram no está conectado' }, 400);
    const token = secret.access_token;

    const meRes = await fetch(`${GRAPH}/me?fields=id,username&access_token=${token}`);
    const me = meRes.ok ? await meRes.json().catch(() => null) : null;

    // La cuenta propia puede aparecer con varios identificadores (app-scoped, IGSID).
    // Juntamos todos para no confundirla con el contacto del otro lado.
    const { data: knownIdentities } = await admin
      .from('msg_contact_identities')
      .select('receiving_account_id')
      .eq('channel', 'instagram');
    const selfIds = new Set<string>(
      [
        me?.id ? String(me.id) : null,
        secret.external_account_id ? String(secret.external_account_id) : null,
        ...(knownIdentities ?? []).map((r: any) => (r?.receiving_account_id ? String(r.receiving_account_id) : null)),
      ].filter(Boolean) as string[],
    );
    const selfUsername = me?.username ? String(me.username).toLowerCase() : null;

    // Para guardar usamos el mismo identificador que usa el receptor en vivo.
    const receivingAccountId =
      (secret.external_account_id ? String(secret.external_account_id) : null) ??
      (me?.id ? String(me.id) : '');
    if (!receivingAccountId) return json({ error: 'No se pudo identificar la cuenta de Instagram' }, 400);

    // 1. Conversaciones de la bandeja de Instagram.
    const convRes = await fetch(
      `${GRAPH}/me/conversations?platform=instagram&fields=id,updated_time,participants&limit=50&access_token=${token}`,
    );
    const convBody = await convRes.json().catch(() => ({}));
    if (!convRes.ok) {
      console.error('ig conversations error', convBody);
      return json({ error: 'Instagram rechazó la consulta', detail: convBody?.error?.message ?? null }, 400);
    }

    const conversations: any[] = Array.isArray(convBody?.data) ? convBody.data : [];
    let importedMessages = 0;
    let importedConversations = 0;
    const skipped: string[] = [];

    for (const conv of conversations) {
      const updated = conv?.updated_time ? new Date(conv.updated_time).getTime() : 0;
      if (updated && updated < since) continue;

      const participants: any[] = Array.isArray(conv?.participants?.data) ? conv.participants.data : [];
      const other = participants.find(
        (p) =>
          !selfIds.has(String(p?.id)) &&
          (!selfUsername || String(p?.username ?? '').toLowerCase() !== selfUsername),
      );
      const senderId = other?.id ? String(other.id) : null;
      if (!senderId) {
        skipped.push(conv?.id ?? 'sin_id');
        continue;
      }

      // 2. Mensajes de esa conversación.
      const msgRes = await fetch(
        `${GRAPH}/${conv.id}?fields=messages.limit(50){id,created_time,from,to,message}&access_token=${token}`,
      );
      const msgBody = await msgRes.json().catch(() => ({}));
      if (!msgRes.ok) {
        console.error('ig messages error', msgBody);
        skipped.push(conv.id);
        continue;
      }
      const rawMessages: any[] = Array.isArray(msgBody?.messages?.data) ? msgBody.messages.data : [];
      const messages = rawMessages
        .filter((m) => {
          const at = m?.created_time ? new Date(m.created_time).getTime() : 0;
          return at >= since;
        })
        .sort(
          (a, b) => new Date(a.created_time ?? 0).getTime() - new Date(b.created_time ?? 0).getTime(),
        );
      if (!messages.length) continue;

      // 3. Contacto + identidad (mismas reglas que el receptor en vivo).
      const profileRes = await fetch(
        `${GRAPH}/${senderId}?fields=name,username,profile_pic&access_token=${token}`,
      );
      const profile = profileRes.ok ? await profileRes.json().catch(() => ({})) : {};
      const username: string | null = profile?.username ?? other?.username ?? null;
      const displayName: string | null = profile?.name ?? (username ? `@${username}` : null);

      const { data: existingIdentity } = await admin
        .from('msg_contact_identities')
        .select('id, contact_id')
        .eq('channel', 'instagram')
        .eq('receiving_account_id', receivingAccountId)
        .eq('external_id', senderId)
        .maybeSingle();

      let identityId = existingIdentity?.id ?? null;
      let contactId = existingIdentity?.contact_id ?? null;

      if (!identityId) {
        const { data: newContact, error: contactErr } = await admin
          .from('msg_contacts')
          .insert({
            display_name: displayName,
            avatar_url: profile?.profile_pic ?? null,
            profile_url: username ? `https://instagram.com/${username}` : null,
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
            username,
          })
          .select('id')
          .single();
        if (identityErr || !newIdentity) {
          console.error('identity create error', identityErr);
          continue;
        }
        identityId = newIdentity.id;
        importedConversations += 1;
      }

      if (!identityId || !contactId) continue;

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

      // 4. Mensajes históricos: idempotentes por id de Instagram. No dispara al bot.
      for (const m of messages) {
        const fromId = m?.from?.id ? String(m.from.id) : null;
        const outbound = Boolean(fromId && selfIds.has(fromId));
        const bodyText: string =
          typeof m?.message === 'string' && m.message.trim() ? m.message : '[Adjunto]';
        const { error: insErr } = await admin.from('msg_messages').upsert(
          {
            conversation_id: conversation.id,
            receiving_account_id: receivingAccountId,
            external_message_id: m?.id ? String(m.id) : null,
            direction: outbound ? 'outbound' : 'inbound',
            author: outbound ? 'humano' : 'externo',
            body: bodyText,
            delivery_status: outbound ? 'enviado' : 'recibido',
            occurred_at: m?.created_time ? new Date(m.created_time).toISOString() : new Date().toISOString(),
          },
          { onConflict: 'receiving_account_id,external_message_id', ignoreDuplicates: true },
        );
        if (insErr) {
          console.error('message insert error', insErr);
          continue;
        }
        importedMessages += 1;
      }

      // 5. Estado de la conversación según el último mensaje importado.
      const lastMsg = messages[messages.length - 1];
      const lastAt = lastMsg?.created_time ? new Date(lastMsg.created_time).toISOString() : null;
      const lastFromUs = selfIds.has(String(lastMsg?.from?.id ?? ''));
      if (lastAt) {
        await admin
          .from('msg_conversations')
          .update(
            lastFromUs ? { last_outbound_at: lastAt } : { last_inbound_at: lastAt },
          )
          .eq('id', conversation.id);
      }
    }

    const nowIso = new Date().toISOString();
    await admin
      .from('channel_connections')
      .update({ status: 'conectado', last_event_at: nowIso, last_error: null })
      .eq('channel', 'instagram');

    return json({
      ok: true,
      days,
      conversaciones_revisadas: conversations.length,
      conversaciones_nuevas: importedConversations,
      mensajes_importados: importedMessages,
      omitidas: skipped.length,
    });
  } catch (err) {
    console.error('ig-sync-inbox fatal', err);
    return json({ error: String(err) }, 500);
  }
});
