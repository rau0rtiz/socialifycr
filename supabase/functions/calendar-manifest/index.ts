import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { calendarManifest } from './manifest.ts';

// Public metadata only: no calendar data, database access or credentials.
Deno.serve(req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  let origin = '';
  try { origin = new URL(url.searchParams.get('origin') ?? '').origin; } catch { /* validated below */ }
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.lovable\.app|app\.socialifycr\.com|produ\.socialifycr\.com|socialifycr\.com|www\.socialifycr\.com)$/.test(origin) || origin === 'http://localhost:8080';
  if (req.method !== 'GET' || !/^[a-zA-Z0-9-]{4,128}$/.test(token) || !allowed) {
    return new Response(JSON.stringify({ error: 'Calendario no válido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(calendarManifest(token, origin)), {
    headers: { ...corsHeaders, 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' },
  });
});