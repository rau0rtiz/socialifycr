import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

// Ari voice assistant: speech -> text (ElevenLabs) -> cheap tool-calling model -> actions via caller RLS -> speech.
const MODEL = 'google/gemini-3.8-flash';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const APP_URL = 'https://app.socialifycr.com';
const MAX_AUDIO = 10 * 1024 * 1024;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const SECTIONS: Record<string, string> = {
  resumen: '/agencia', producciones: '/agencia/producciones', documentacion: '/agencia/documentacion',
  calendario: '/agencia/calendario', chats: '/agencia/chats', clientes: '/agencia/clientes',
  crm: '/agencia/crm', pagos: '/agencia/pagos', dashboards: '/agencia/dashboards-clientes',
  funnels: '/agencia/funnels', comunicaciones: '/agencia/comunicaciones', ajustes: '/agencia/ajustes',
};

const tools = [
  { type: 'function', function: { name: 'navigate', description: 'Abrir una sección del panel.',
    parameters: { type: 'object', properties: { section: { type: 'string', enum: Object.keys(SECTIONS) } }, required: ['section'] } } },
  { type: 'function', function: { name: 'create_production_sheet', description: 'Crear una hoja de producción para un cliente y abrirla.',
    parameters: { type: 'object', properties: { client_id: { type: 'string' }, title: { type: 'string' } }, required: ['client_id', 'title'] } } },
  { type: 'function', function: { name: 'add_piece', description: 'Agregar una pieza (video) a una hoja de producción. Usa sheet_id "current" para la hoja abierta.',
    parameters: { type: 'object', properties: { sheet_id: { type: 'string' }, description: { type: 'string' }, hook: { type: 'string' }, cta: { type: 'string' } }, required: ['sheet_id', 'description'] } } },
  { type: 'function', function: { name: 'set_ari_instagram', description: 'Encender (respuestas automáticas) o apagar (solo borradores) a Ari en Instagram.',
    parameters: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } } },
  { type: 'function', function: { name: 'get_calendar_link', description: 'Obtener el link del calendario compartido de un cliente.',
    parameters: { type: 'object', properties: { client_id: { type: 'string' } }, required: ['client_id'] } } },
  { type: 'function', function: { name: 'show_copy_text', description: 'Mostrar en pantalla un texto listo para copiar y enviar (mensaje, caption, correo, respuesta). Usalo siempre que pidan algo para copiar, mandar o pegar.',
    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
  { type: 'function', function: { name: 'list_recent_sheets', description: 'Listar hojas de producción recientes (opcional por cliente).',
    parameters: { type: 'object', properties: { client_id: { type: 'string' } } } } },
];

const slugToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Iniciá sesión.' }, 401);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await db.auth.getClaims(auth.slice(7));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: 'Tu sesión venció.' }, 401);
    const { data: isAgency } = await db.rpc('is_agency_member', { _user_id: uid });
    if (!isAgency) return json({ error: 'Solo para el equipo de agencia.' }, 403);
    const elKey = Deno.env.get('ELEVENLABS_API_KEY');
    const aiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!elKey || !aiKey) return json({ error: 'Falta configurar la voz o la IA.' }, 503);

    const form = await req.formData();
    const path = String(form.get('path') ?? '').slice(0, 200);
    const speak = form.get('speak') !== 'false';
    let history: { role: string; content: string }[] = [];
    try { history = JSON.parse(String(form.get('history') ?? '[]')).slice(-8).filter((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string').map((m: any) => ({ role: m.role, content: m.content.slice(0, 1000) })); } catch { /* ignore */ }

    let text = String(form.get('text') ?? '').trim().slice(0, 2000);
    const audio = form.get('audio');
    if (!text && audio instanceof File && audio.size > 0) {
      if (audio.size > MAX_AUDIO) return json({ error: 'Audio muy largo.' }, 413);
      const up = new FormData();
      up.append('file', audio); up.append('model_id', 'scribe_v2'); up.append('language_code', 'spa');
      const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': elKey }, body: up });
      if (!r.ok) { const d = await r.text(); console.error(`STT [${r.status}] ${d}`); return json({ error: 'No pude escucharte.', details: d }, r.status); }
      text = String((await r.json()).text ?? '').trim();
    }
    if (!text) return json({ error: 'No escuché nada.' }, 422);

    const { data: profile } = await db.from('profiles').select('full_name').eq('id', uid).maybeSingle();
    const firstName = String((profile as any)?.full_name ?? '').split(' ')[0] || '';
    const { data: clients } = await db.from('clients').select('id, name').order('name').limit(200);
    const currentSheet = path.match(/producciones\/([0-9a-f-]{36})/)?.[1] ?? null;

    const system = `Sos Ari, asistente de voz del panel de la agencia Socialify (Costa Rica). Hablás español tico, cálido, breve (1-2 frases, se lee en voz alta, sin markdown ni emojis). ${firstName ? `El usuario se llama ${firstName}; usá su nombre solo a veces.` : ''}
Solo hacés acciones del panel con las herramientas; no buscás en internet. Si algo no lo podés hacer todavía, decilo y ofrecé abrir la sección.
Ruta actual: ${path || '/agencia'}. ${currentSheet ? 'Hay una hoja de producción abierta (usar sheet_id "current").' : 'No hay hoja abierta.'}
Clientes (id: nombre): ${(clients ?? []).map((c: any) => `${c.id}: ${c.name}`).join('; ')}
Elegí el cliente por nombre aproximado; si es ambiguo, preguntá. Para "crea un plan de contenido" o "dashboard", abrí la sección correspondiente (documentacion / dashboards).`;

    const messages: any[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: text }];
    let navigateTo: string | null = null;
    let link: string | null = null;
    let copyText: string | null = null;
    const done: string[] = [];

    const run = async (name: string, a: any): Promise<unknown> => {
      if (name === 'navigate') { navigateTo = SECTIONS[a.section] ?? null; return { ok: !!navigateTo }; }
      if (name === 'create_production_sheet') {
        const { data, error } = await db.from('production_sheets').insert({ client_id: a.client_id, title: String(a.title).slice(0, 120) }).select('id').single();
        if (error) return { error: error.message };
        navigateTo = `/agencia/producciones/${data.id}`; done.push('sheets'); return { ok: true, sheet_id: data.id };
      }
      if (name === 'add_piece') {
        const sheetId = a.sheet_id === 'current' ? currentSheet : a.sheet_id;
        if (!sheetId) return { error: 'No hay hoja abierta; pedí cuál.' };
        const { data: last } = await db.from('production_sheet_shots').select('sort_order').eq('sheet_id', sheetId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
        const { error } = await db.from('production_sheet_shots').insert({ sheet_id: sheetId, description: String(a.description).slice(0, 2000), hook: a.hook ?? null, cta: a.cta ?? null, sort_order: ((last as any)?.sort_order ?? -1) + 1 } as any);
        if (error) return { error: error.message };
        done.push('sheet:' + sheetId); if (sheetId !== currentSheet) navigateTo = `/agencia/producciones/${sheetId}`; return { ok: true };
      }
      if (name === 'set_ari_instagram') {
        const { error } = await db.from('msg_settings').update({ bot_mode: a.on ? 'automatico' : 'borrador', auto_send_enabled: !!a.on, updated_by: uid } as any).eq('id', true);
        if (error) return { error: error.message }; done.push('msg'); return { ok: true };
      }
      if (name === 'get_calendar_link') {
        let { data } = await db.from('content_calendar_shares').select('token').eq('client_id', a.client_id).maybeSingle();
        if (!data) { const r = await db.from('content_calendar_shares').insert({ client_id: a.client_id, token: slugToken() } as any).select('token').single(); if (r.error) return { error: r.error.message }; data = r.data; }
        link = `${APP_URL}/calendario/${(data as any).token}`; return { ok: true, url: link, note: 'El link se muestra en pantalla; no lo leas completo.' };
      }
      if (name === 'show_copy_text') { copyText = String(a.text ?? '').slice(0, 4000) || null; return { ok: true, note: 'El texto ya está en pantalla para copiar; no lo leas, solo decí que está listo.' }; }
      if (name === 'list_recent_sheets') {
        let q = db.from('production_sheets').select('id, title, client_id, updated_at').order('updated_at', { ascending: false }).limit(8);
        if (a.client_id) q = q.eq('client_id', a.client_id);
        const { data, error } = await q; return error ? { error: error.message } : data;
      }
      return { error: 'Herramienta desconocida' };
    };

    let reply = '';
    for (let i = 0; i < 4; i++) {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, tools }),
      });
      if (!r.ok) { const d = await r.text(); console.error(`AI [${r.status}] ${d}`); return json({ error: r.status === 429 ? 'Demasiadas solicitudes, probá en un momento.' : r.status === 402 ? 'Se acabaron los créditos de IA.' : 'La IA no respondió.', transcript: text }, r.status); }
      const msg = (await r.json()).choices?.[0]?.message;
      if (!msg) break;
      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* */ }
          const out = await run(tc.function.name, args);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out) });
        }
        continue;
      }
      reply = String(msg.content ?? '').trim(); break;
    }
    if (!reply) reply = 'Listo.';

    let audioB64: string | null = null;
    if (speak) {
      const t = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
        method: 'POST', headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply.slice(0, 600), model_id: 'eleven_flash_v2_5' }),
      });
      if (t.ok) audioB64 = encodeBase64(new Uint8Array(await t.arrayBuffer()));
      else console.error(`TTS [${t.status}] ${await t.text()}`);
    }
    return json({ transcript: text, reply, audio: audioB64, navigate: navigateTo, link, copy: copyText, invalidate: done });
  } catch (e) {
    console.error('ari-voice failed', e);
    return json({ error: 'Algo falló, probá de nuevo.' }, 500);
  }
});
