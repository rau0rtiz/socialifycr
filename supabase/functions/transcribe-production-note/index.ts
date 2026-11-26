import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const Ids = z.object({ shot_id: z.string().uuid(), sheet_id: z.string().uuid() });
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Iniciá sesión para transcribir.' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authorization } },
    });
    const { data: claims, error: authError } = await client.auth.getClaims(authorization.slice(7));
    if (authError || !claims?.claims?.sub) return json({ error: 'Tu sesión venció.' }, 401);
    const { data: isAgency, error: roleError } = await client.rpc('is_agency_member', { _user_id: claims.claims.sub });
    if (roleError || !isAgency) return json({ error: 'Acceso solo para el equipo de agencia.' }, 403);
    const length = Number(req.headers.get('content-length'));
    if (length > MAX_AUDIO_BYTES + 65536) return json({ error: 'El audio es demasiado grande.' }, 413);
    const form = await req.formData();
    const ids = Ids.safeParse({ shot_id: form.get('shot_id'), sheet_id: form.get('sheet_id') });
    if (!ids.success) return json({ error: 'Pieza o producción inválida.' }, 400);
    const audio = form.get('audio');
    if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES ||
      !/^audio\/(webm|mp4|mpeg|wav|x-wav|ogg|aac)(;.*)?$/.test(audio.type)) {
      return json({ error: 'Enviá un audio válido de hasta 20 MB.' }, 400);
    }
    // Read through the caller's RLS, never through a service-role client.
    const { data: sheet, error: sheetError } = await client.from('production_sheets')
      .select('id, client_id').eq('id', ids.data.sheet_id).maybeSingle();
    const { data: shot, error: shotError } = await client.from('production_sheet_shots')
      .select('id').eq('id', ids.data.shot_id).eq('sheet_id', ids.data.sheet_id).maybeSingle();
    if (sheetError || shotError || !sheet?.client_id || !shot) return json({ error: 'No tenés acceso a esta pieza.' }, 403);
    const key = Deno.env.get('ELEVENLABS_API_KEY');
    if (!key) return json({ error: 'ElevenLabs no está conectado.' }, 503);
    const upstream = new FormData();
    upstream.append('file', audio);
    upstream.append('model_id', 'scribe_v2');
    upstream.append('language_code', 'spa');
    upstream.append('tag_audio_events', 'false');
    upstream.append('diarize', 'false');
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST', headers: { 'xi-api-key': key }, body: upstream,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`ElevenLabs transcription failed [${response.status}]: ${details}`);
      return json({ error: 'ElevenLabs no pudo transcribir el audio.', status: response.status, details }, response.status);
    }
    const result = await response.json();
    if (typeof result.text !== 'string' || !result.text.trim()) return json({ error: 'No se detectó voz en el audio.' }, 422);
    // Audio is transient; the caller appends the returned text to the existing notes.
    return json({ text: result.text.trim() });
  } catch (error) {
    console.error('Transcription request failed:', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'No se pudo transcribir. Conservá el audio y probá de nuevo.' }, 500);
  }
});