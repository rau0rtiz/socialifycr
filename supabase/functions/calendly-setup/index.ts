import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const GATEWAY = 'https://connector-gateway.lovable.dev/calendly';

// Instalación única: genera la clave de firma, la guarda segura y crea la
// suscripción de webhooks en Calendly apuntando a calendly-webhook.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Falta la sesión' }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401);
    const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: user.id });
    if (!isMember) return json({ error: 'Sin permiso' }, 403);

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const calendlyKey = Deno.env.get('CALENDLY_API_KEY');
    if (!lovableKey || !calendlyKey) return json({ error: 'Calendly no está conectado al proyecto' }, 500);

    const gw = async (path: string, init?: RequestInit) => {
      const res = await fetch(`${GATEWAY}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': calendlyKey,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });
      const text = await res.text();
      let data: unknown = null;
      try { data = JSON.parse(text); } catch { /* texto plano */ }
      return { ok: res.ok, status: res.status, data };
    };

    const me = await gw('/users/me');
    if (!me.ok) return json({ error: 'No se pudo leer la cuenta de Calendly', details: me.data }, 502);
    const userUri = (me.data as any)?.resource?.uri;
    const orgUri = (me.data as any)?.resource?.current_organization;
    if (!userUri || !orgUri) return json({ error: 'Respuesta inesperada de Calendly' }, 502);

    // Clave de firma nueva (rotamos si ya existía suscripción vieja).
    const signingKey = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');

    // Borrar suscripciones anteriores hacia este webhook para no duplicar.
    const list = await gw(`/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=organization`);
    const hookUrl = `${supabaseUrl}/functions/v1/calendly-webhook`;
    const existing = ((list.data as any)?.collection ?? []) as any[];
    for (const sub of existing) {
      if (sub?.callback_url === hookUrl && sub?.uri) {
        const id = sub.uri.split('/').pop();
        await gw(`/webhook_subscriptions/${id}`, { method: 'DELETE' });
      }
    }

    const created = await gw('/webhook_subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        url: hookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: orgUri,
        user: userUri,
        scope: 'organization',
        signing_key: signingKey,
      }),
    });
    if (!created.ok) return json({ error: 'Calendly rechazó la suscripción', details: created.data }, 502);

    // Guardar la clave de firma segura (solo backend la lee).
    await admin.from('channel_secrets').upsert(
      {
        channel: 'calendly',
        external_account_id: 'webhook',
        access_token: signingKey,
        token_type: 'signing_key',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel,external_account_id' },
    );

    return json({ ok: true, subscription: (created.data as any)?.resource?.uri ?? null });
  } catch (err) {
    console.error('calendly-setup fatal', err);
    return json({ error: String(err) }, 500);
  }
});
