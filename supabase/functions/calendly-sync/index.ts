import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleInviteeCanceled, handleInviteeCreated } from '../_shared/calendly-intake.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const GATEWAY = 'https://connector-gateway.lovable.dev/calendly';

// Recupera las citas de Calendly que no llegaron por aviso (o llegaron con firma vieja)
// y las cruza con los chats usando la misma lógica del webhook.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Falta la sesión' }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401);
    const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: user.id });
    if (!isMember) return json({ error: 'Sin permiso' }, 403);

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const calendlyKey = Deno.env.get('CALENDLY_API_KEY');
    if (!lovableKey || !calendlyKey) return json({ error: 'Calendly no está conectado' }, 500);

    const gw = async (path: string) => {
      const res = await fetch(`${GATEWAY}${path}`, {
        headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': calendlyKey },
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`calendly gateway ${path} [${res.status}]: ${text.slice(0, 400)}`);
        return { ok: false, status: res.status, data: null as any, text };
      }
      let data: any = null;
      try { data = JSON.parse(text); } catch { /* no json */ }
      return { ok: true, status: res.status, data, text };
    };

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body?.days ?? 30), 1), 90);

    const me = await gw('/users/me');
    if (!me.ok) return json({ error: 'No se pudo leer la cuenta de Calendly', status: me.status, details: me.text }, 502);
    const orgUri = me.data?.resource?.current_organization;
    if (!orgUri) return json({ error: 'Respuesta inesperada de Calendly' }, 502);

    const minStart = new Date(Date.now() - days * 86400000).toISOString();
    let nextToken: string | null = null;
    let nuevas = 0;
    let vinculadas = 0;
    let canceladas = 0;
    let revisadas = 0;

    do {
      // Sin filtro de estado: traemos activas y canceladas.
      const qs = new URLSearchParams({ organization: orgUri, count: '50', min_start_time: minStart });
      if (nextToken) qs.set('page_token', nextToken);
      const list = await gw(`/scheduled_events?${qs.toString()}`);
      if (!list.ok) return json({ error: 'Calendly no devolvió las citas', status: list.status, details: list.text }, 502);

      const events: any[] = list.data?.collection ?? [];
      nextToken = list.data?.pagination?.next_page_token ?? null;

      for (const ev of events) {
        revisadas++;
        const uri: string = ev?.uri;
        if (!uri) continue;
        const { data: existing } = await admin
          .from('msg_appointments')
          .select('id, status')
          .eq('external_uri', uri)
          .maybeSingle();

        if (existing) {
          if (ev?.status === 'canceled' && existing.status !== 'cancelada') {
            await handleInviteeCanceled(admin, uri);
            canceladas++;
          }
          continue;
        }

        const id = uri.split('/').pop();
        const inv = await gw(`/scheduled_events/${id}/invitees?count=10`);
        const invitee = inv.ok ? (inv.data?.collection ?? [])[0] : null;
        const payload = { ...(invitee ?? {}), scheduled_event: ev };
        const result = await handleInviteeCreated(admin, { event: 'invitee.created', payload });
        if (result.error) {
          console.error('calendly-sync no pudo registrar', uri, result.error);
          continue;
        }
        if (!result.ignored) {
          nuevas++;
          if (result.attributed) vinculadas++;
        }
        if (ev?.status === 'canceled') await handleInviteeCanceled(admin, uri);
      }
    } while (nextToken);

    return json({ ok: true, revisadas, nuevas, vinculadas, canceladas, dias: days });
  } catch (err) {
    console.error('calendly-sync fatal', err);
    return json({ error: String(err) }, 500);
  }
});
