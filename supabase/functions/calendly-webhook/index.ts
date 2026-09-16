import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleInviteeCanceled, handleInviteeCreated } from '../_shared/calendly-intake.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, calendly-signature, calendly-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Verifica la firma de Calendly: "t=<ts>,v1=<hex_hmac>" (puede traer varios v1).
const verifySignature = async (header: string | null, rawBody: string, key: string) => {
  if (!header) return false;
  let t: string | null = null;
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === 't') t = v;
    if (k === 'v1') v1.push(v);
  }
  if (!t || !v1.length) return false;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1.includes(hex);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.text();

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

    // Calendly manda el encabezado como Calendly-Webhook-Signature; aceptamos ambos nombres.
    const sigHeader =
      req.headers.get('Calendly-Webhook-Signature') ?? req.headers.get('Calendly-Signature');
    const ok = await verifySignature(sigHeader, rawBody, secretRow.access_token);
    if (!ok) {
      console.error(
        'calendly-webhook: firma inválida',
        JSON.stringify({ headerPresent: !!sigHeader, headers: [...req.headers.keys()] }),
      );
      return json({ error: 'Firma inválida' }, 401);
    }

    const body = JSON.parse(rawBody);
    const event = body?.event as string;
    const eventUri: string | undefined = body?.payload?.scheduled_event?.uri;
    console.log('calendly-webhook evento', event, eventUri ?? 'sin uri');
    if (!eventUri) return json({ received: true, ignored: 'sin evento' });

    if (event === 'invitee.created') {
      const result = await handleInviteeCreated(admin, body);
      if (result.error) return json({ error: 'No se pudo registrar la cita', details: result.error }, 500);
      console.log('calendly-webhook cita', JSON.stringify(result));
      return json({ received: true, appointment: result.appointment_id, attributed: result.attributed });
    }

    if (event === 'invitee.canceled') {
      await handleInviteeCanceled(admin, eventUri);
      return json({ received: true, canceled: true });
    }

    return json({ received: true, ignored: event ?? 'evento desconocido' });
  } catch (err) {
    console.error('calendly-webhook fatal', err);
    return json({ error: String(err) }, 500);
  }
});
