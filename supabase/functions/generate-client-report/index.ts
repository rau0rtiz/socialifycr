import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { aiFeatureEnabled, aiDisabledResponse } from '../_shared/ai-switch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MODEL = 'openai/gpt-6-astra';

const Body = z.object({
  action: z.enum(['draft', 'final']),
  payload: z.record(z.any()),
  attachments: z
    .array(z.object({ kind: z.enum(['image', 'pdf']), url: z.string().url(), label: z.string().max(500) }))
    .max(12)
    .default([]),
});

const STYLE = `Escribís en español de Costa Rica, simple y directo, frases cortas, cero palabrerío ni jerga técnica innecesaria.
Nunca inventes números: usá SOLO las cifras que vienen en "computed" (sumas, promedios, series) o en los archivos/resultados del cliente. Si un dato no existe, decilo o no lo menciones.
Los KPIs que pidió el usuario pueden no coincidir exacto con los nombres de columnas: interpretalos (ej. "CPL" = costo / leads, "costo por mensaje" = importe gastado / conversaciones iniciadas). Si calculás un derivado, hacelo solo con cifras provistas y redondeá.
Analizá siempre contra la meta del negocio y las metas de campaña. Si hay resultados del cliente (ventas, etc.) cruzalos con la pauta.
Si hay reporte anterior, compará KPIs, puntos de mejora y evolución de creativos.`;

const DRAFT_SCHEMA = `Devolvé SOLO un JSON con esta forma:
{
  "markdown": "borrador completo del reporte en markdown siguiendo la estructura: intro cortísima; por plataforma: resumen de datos, análisis vs metas, KPIs y evolución, mejores y peores creativos (con porqué), señales de alerta, positivos y mejoras, acciones concretas",
  "questions": ["preguntas cortas si falta información importante (máx 4)"],
  "creatives": [{"platform":"meta|tiktok|google","name":"nombre exacto del anuncio/creativo como aparece en los datos","kind":"best|worst"}]
}
Elegí máximo 3 mejores y 2 peores creativos por plataforma.`;

const FINAL_SCHEMA = `Devolvé SOLO un JSON con esta forma exacta:
{
  "title": "título corto",
  "intro": "1-2 frases: qué es este reporte, período y plataformas",
  "platforms": [{
    "platform": "meta|tiktok|google",
    "summary_cards": [{"label":"Inversión","value":"$1.234","hint":"texto corto opcional"}],
    "analysis": "párrafo corto vs metas (y resultados del cliente si hay)",
    "kpis": [{"name":"Costo por mensaje","value":"$0,85","change":"-12% vs mes anterior o null","status":"good|bad|neutral","comment":"una frase"}],
    "charts": [{"title":"Inversión diaria","type":"line|bar","labels":["2026-09-01"],"series":[{"name":"Inversión","data":[12.3]}]}],
    "best_creatives": [{"name":"nombre exacto","reason":"por qué, basado en KPIs","metrics":[{"label":"CTR","value":"2,1%"}]}],
    "worst_creatives": [{"name":"...","reason":"...","metrics":[]}],
    "alerts": ["..."],
    "positives": ["..."],
    "improvements": ["..."],
    "actions": ["acción concreta y simple"]
  }],
  "comparison": "párrafo corto de evolución vs reporte anterior, o null",
  "closing": "cierre de 1 frase"
}
Los datos de "charts" deben salir tal cual de las series en computed (podés recortar o agrupar, nunca inventar). 1 a 3 gráficos por plataforma, los más relevantes para la meta. Respetá el borrador aprobado y las correcciones del usuario.`;

async function callModel(lovableKey: string, system: string, userText: string, attachments: z.infer<typeof Body>['attachments']) {
  const content: Record<string, unknown>[] = [{ type: 'input_text', text: userText }];
  for (const a of attachments) {
    content.push({ type: 'input_text', text: `Adjunto del cliente: ${a.label}` });
    if (a.kind === 'image') content.push({ type: 'input_image', image_url: a.url });
    else content.push({ type: 'input_file', file_url: a.url });
  }
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': lovableKey, 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: MODEL,
      instructions: system,
      input: [{ role: 'user', content }],
      stream: true,
      store: false,
      reasoning: { effort: 'medium', summary: 'auto' },
      include: ['reasoning.encrypted_content'],
      text: { format: { type: 'json_object' } },
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    let msg = t;
    try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? t; } catch { /* */ }
    return { status: res.status, error: msg || 'Error de IA' };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let text = '';
  let failed: string | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === 'response.output_text.delta') text += ev.delta ?? '';
        else if (ev.type === 'response.failed' || ev.type === 'error')
          failed = ev.response?.error?.message ?? ev.error?.message ?? ev.message ?? 'La IA no pudo completar';
      } catch { /* ignore */ }
    }
  }
  if (failed) return { status: 502, error: failed };
  if (!text.trim()) return { status: 502, error: 'La IA no devolvió contenido' };
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '');
    return { status: 200, data: JSON.parse(cleaned) };
  } catch {
    return { status: 502, error: 'La IA devolvió un formato inválido' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await authed.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'No autorizado' }, 401);
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: claims.claims.sub });
    if (!isMember) return json({ error: 'Sin acceso al panel de agencia' }, 403);

    if (!(await aiFeatureEnabled('reports_builder'))) return aiDisabledResponse(corsHeaders);

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'LOVABLE_API_KEY no está configurada' }, 500);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, payload, attachments } = parsed.data;

    let payloadText = JSON.stringify(payload);
    if (payloadText.length > 180_000) payloadText = payloadText.slice(0, 180_000) + '…(recortado)';

    const system = `Sos analista senior de pauta de Socialify, agencia de marketing en Costa Rica.\n${STYLE}\n\n${action === 'draft' ? DRAFT_SCHEMA : FINAL_SCHEMA}`;
    const userText = `Datos del reporte (JSON):\n${payloadText}`;
    const out = await callModel(lovableKey, system, userText, attachments);
    if ('error' in out) return json({ error: out.error }, out.status >= 400 ? out.status : 502);
    return json({ result: out.data });
  } catch (e) {
    console.error('generate-client-report', e);
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
