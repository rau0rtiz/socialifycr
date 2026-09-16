import { createClient } from 'npm:@supabase/supabase-js@2';

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
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // ─── Autenticación: solo miembros de la agencia ───────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Falta la sesión' }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401);

    const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: user.id });
    if (!isMember) return json({ error: 'Sin permiso' }, 403);

    const body = await req.json().catch(() => null);
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const author = body?.author === 'bot' ? 'bot' : 'humano';
    if (!conversationId || !text) return json({ error: 'Falta la conversación o el texto' }, 400);
    if (text.length > 950) return json({ error: 'El mensaje es demasiado largo (máximo 950 caracteres)' }, 400);

    const { data: conv, error: convErr } = await admin
      .from('msg_conversations')
      .select('id, channel, is_demo, msg_contact_identities!inner(external_id, receiving_account_id)')
      .eq('id', conversationId)
      .maybeSingle();
    if (convErr || !conv) return json({ error: 'Conversación no encontrada' }, 404);
    if (conv.channel !== 'instagram') return json({ error: 'Por ahora solo se puede responder por Instagram' }, 400);
    if (conv.is_demo) return json({ error: 'Las conversaciones de simulación no envían mensajes' }, 400);

    const identity = (conv as any).msg_contact_identities as { external_id: string; receiving_account_id: string };

    const { data: secret } = await admin
      .from('channel_secrets')
      .select('access_token')
      .eq('channel', 'instagram')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!secret?.access_token) return json({ error: 'Instagram no está conectado' }, 400);

    // Enlace de agenda: la página propia (socialifycr.com/agendar, con el formulario de
    // enrutamiento embebido) o un enlace directo de Calendly. Se envía LIMPIO, sin UTM:
    // el sitio de marketing no procesa etiquetas y el enlace modificado queda raro para
    // la persona. La atribución se hace después por las respuestas del formulario
    // (usuario de IG, correo, nombre) en calendly-webhook.
    const CALENDLY_RE = /https?:\/\/(?:www\.)?(?:calendly\.com\/[^\s)]+|socialifycr\.com\/agendar[^\s)]*)/i;
    const linkMatch = text.match(CALENDLY_RE);
    let sentText = text;
    let taggedUrl: string | null = null;
    if (linkMatch) {
      // Quita cualquier UTM que ya venga pegado en el texto.
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

    const res = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: identity.external_id },
        message: { text: sentText },
        access_token: secret.access_token,
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('ig send error', result);
      const detail = result?.error?.message ?? 'Instagram rechazó el envío';
      return json({ error: detail }, 400);
    }

    const nowIso = new Date().toISOString();
    const { data: inserted, error: msgErr } = await admin.from('msg_messages').insert({
      conversation_id: conversationId,
      receiving_account_id: identity.receiving_account_id,
      external_message_id: result?.message_id ?? null,
      direction: 'outbound',
      author,
      body: sentText,
      delivery_status: 'enviado',
      sent_by: user.id,
      occurred_at: nowIso,
    }).select('id').single();
    if (msgErr) console.error('outbound message insert error', msgErr);

    // Si el mensaje ofrece un enlace de Calendly, lo registramos para atribuir la cita.
    if (taggedUrl) {
      await admin.from('msg_link_offers').insert({
        conversation_id: conversationId,
        message_id: inserted?.id ?? null,
        url: taggedUrl,
        offered_by: author,
        offered_at: nowIso,
      });
      // La etapa avanza a "enlace enviado" si no estaba más adelante.
      await admin
        .from('msg_conversations')
        .update({ stage: 'enlace_enviado' })
        .eq('id', conversationId)
        .in('stage', ['nuevo', 'conversando', 'calificado']);
    }

    // Respuesta humana = toma de control: los borradores del bot quedan obsoletos.
    await admin
      .from('msg_conversations')
      .update({ last_outbound_at: nowIso, unread_count: 0, human_takeover_at: nowIso })
      .eq('id', conversationId);

    await admin
      .from('msg_drafts')
      .update({ status: 'obsoleto', stale_reason: 'Una persona respondió en la conversación.' })
      .eq('conversation_id', conversationId)
      .in('status', ['pendiente', 'editado']);

    return json({ sent: true, message_id: result?.message_id ?? null });
  } catch (err) {
    console.error('ig-send-message fatal', err);
    return json({ error: String(err) }, 500);
  }
});
