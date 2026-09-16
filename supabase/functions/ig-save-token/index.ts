import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const IG_GRAPH = 'https://graph.instagram.com/v21.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => null);
    // El token puede venir del flujo OAuth (body) o del almacén seguro (env).
    let accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    let appSecret = typeof body?.appSecret === 'string' ? body.appSecret.trim() : '';
    const fromVault = !accessToken;
    if (fromVault) {
      accessToken = (Deno.env.get('IG_PAGE_ACCESS_TOKEN') ?? '').trim();
      appSecret = (Deno.env.get('IG_APP_SECRET') ?? '').trim();
    }
    if (!accessToken || accessToken.length < 20) {
      return json({ error: fromVault
        ? 'No hay token guardado en el almacén seguro. Guardalo primero desde el formulario de secretos.'
        : 'Token de acceso inválido o faltante' }, 400);
    }

    // 1. Validar el token contra la API de Instagram.
    const meRes = await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`);
    const me = await meRes.json();
    if (!meRes.ok || me.error || !me.user_id) {
      console.error('IG token validation failed', me.error);
      return json({ error: 'Meta rechazó el token. Verificá que sea el token de acceso de la página/cuenta correcta y que no haya expirado.' }, 400);
    }
    const userId: string = String(me.user_id);
    const username: string | null = me.username ? String(me.username) : null;

    // 2. Si nos dieron el app secret, extender a token de larga duración (~60 días).
    let finalToken = accessToken;
    let tokenType = 'short_lived';
    let expiresIn: number | null = null;

    if (appSecret) {
      try {
        const exRes = await fetch(
          `${IG_GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(accessToken)}`,
        );
        const ex = await exRes.json();
        if (exRes.ok && ex.access_token) {
          finalToken = ex.access_token;
          tokenType = 'long_lived';
          expiresIn = typeof ex.expires_in === 'number' ? ex.expires_in : null;
        } else {
          // Código 452: el token ya es de larga duración (generado desde la UI de Meta).
          const exCode = ex?.error?.code;
          const exSubcode = ex?.error?.error_subcode;
          if (exCode === 452 || exSubcode === 2207055) {
            tokenType = 'long_lived';
          } else {
            console.error('IG exchange failed', ex.error);
          }
        }
      } catch (e) {
        console.error('IG exchange error', e);
      }
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 3. Guardar el token en la tabla bloqueada (solo backend).
    const { error: secretErr } = await admin
      .from('channel_secrets')
      .upsert(
        {
          channel: 'instagram',
          external_account_id: userId,
          access_token: finalToken,
          token_type: tokenType,
          expires_at: expiresAt,
        },
        { onConflict: 'channel,external_account_id' },
      );
    if (secretErr) {
      console.error('channel_secrets upsert error', secretErr);
      return json({ error: 'No se pudo guardar el token' }, 500);
    }

    // 4. Actualizar la conexión (sigue 'configurando' hasta el primer DM real).
    const { data: existing } = await admin
      .from('channel_connections')
      .select('id, diagnostics')
      .eq('channel', 'instagram')
      .maybeSingle();

    const diagnostics = {
      ...(existing?.diagnostics ?? {}),
      ig_user_id: userId,
      username,
      token_type: tokenType,
      token_saved_at: new Date().toISOString(),
    };

    if (existing) {
      await admin
        .from('channel_connections')
        .update({
          external_account_id: userId,
          account_label: username ?? existing.account_label ?? 'Cuenta profesional',
          status: 'configurando',
          token_expires_at: expiresAt,
          last_error: null,
          diagnostics,
        })
        .eq('id', existing.id);
    } else {
      await admin.from('channel_connections').insert({
        channel: 'instagram',
        external_account_id: userId,
        account_label: username ?? 'Cuenta profesional',
        status: 'configurando',
        token_expires_at: expiresAt,
        diagnostics,
      });
    }

    return json({ ok: true, userId, username, tokenType, expiresIn });
  } catch (e) {
    console.error('ig-save-token error', e);
    return json({ error: 'Error inesperado guardando el token' }, 500);
  }
});

