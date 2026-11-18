// Resuelve links cortos (vt.tiktok.com, vm.tiktok.com, fb.watch, youtu.be…) a su URL final
// para poder incrustar el reproductor en los planes de contenido. Solo usuarios autenticados
// y solo dominios de redes sociales (evita usarlo como proxy abierto).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const ALLOWED = /(^|\.)(tiktok\.com|instagram\.com|facebook\.com|fb\.watch|youtube\.com|youtu\.be)$/i;

const resolve = async (raw: string): Promise<string | null> => {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || !ALLOWED.test(url.hostname)) return null;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
    if (!r) return url.toString();
    await r.body?.cancel();
    const loc = r.headers.get('location');
    if (r.status < 300 || r.status >= 400 || !loc) return url.toString();
    const next = new URL(loc, url);
    if (next.protocol !== 'https:' || !ALLOWED.test(next.hostname)) return url.toString();
    url = next;
  }
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace('Bearer ', ''));
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));
  const urls: string[] = Array.isArray(body?.urls) ? body.urls.filter((u: unknown) => typeof u === 'string').slice(0, 40) : [];
  const resolved: Record<string, string> = {};
  await Promise.all(urls.map(async (u) => { const r = await resolve(u.trim()); if (r) resolved[u] = r; }));
  return json({ resolved });
});
