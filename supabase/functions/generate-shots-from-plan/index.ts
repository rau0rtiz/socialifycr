import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const InputSchema = z.object({
  sheet_id: z.string().uuid(),
  plan_html: z.string().min(50).max(60000),
  model: z.string().default('google/gemini-2.5-pro'),
  max_shots: z.number().int().min(3).max(40).default(30),
});

const ShotSchema = z.object({
  content_type: z.enum(['reel', 'story', 'post', 'foto', 'tiktok', 'short', 'otro']).default('reel'),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'linkedin', 'multi']).default('instagram'),
  concept: z.string().min(1).max(200),
  description: z.string().max(800).optional().default(''),
  hook: z.string().max(400).optional().default(''),
  script: z.string().max(2000).optional().default(''),
  cta: z.string().max(200).optional().default(''),
  tech_notes: z.string().max(500).optional().default(''),
  duration_estimate: z.string().max(50).optional().default(''),
});

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const { sheet_id, plan_html, model, max_shots } = parsed.data;

    const { data: sheet, error: sheetErr } = await supabase
      .from('production_sheets')
      .select('id, client_id, title, shoot_date, location, notes')
      .eq('id', sheet_id)
      .maybeSingle();
    if (sheetErr || !sheet) return json({ error: 'Sheet not found or no access' }, 404);

    const { data: client } = await supabase
      .from('clients')
      .select('name, primary_color, accent_color')
      .eq('id', sheet.client_id)
      .maybeSingle();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const planText = stripHtml(plan_html).slice(0, 40000);

    const systemPrompt = `Sos un director creativo senior. Tu tarea es LEER un plan de contenido y CONVERTIRLO en piezas concretas para una hoja de producción.

REGLAS ESTRICTAS:
- Devolvés EXCLUSIVAMENTE un JSON válido sin markdown ni texto extra.
- Formato: { "shots": [ { ... }, ... ] }.
- Extraé EXACTAMENTE las piezas que el plan enumera (una por cada pieza descrita). No inventes piezas de más. No omitas piezas.
- Si el plan lista N piezas, devolvés N piezas. Máximo absoluto: ${max_shots}.
- Cada pieza: { "content_type", "platform", "concept", "description", "hook", "script", "cta", "tech_notes", "duration_estimate" }.
- content_type ∈ ["reel","story","post","foto","tiktok","short","otro"] (elegí el que mejor calce con lo descrito).
- platform ∈ ["instagram","tiktok","youtube","linkedin","multi"].
- concept: título corto y punzante (máx 80 chars).
- description: 1-2 oraciones de qué se ve / qué pasa (usá lo que dice el plan).
- hook: gancho de los primeros 2 segundos (si el plan lo da, respetalo; si no, proponé uno).
- script: guion o estructura (si el plan lo trae, transcribilo; si no, resumí en 3-5 líneas).
- cta: llamado a la acción concreto.
- tech_notes: indicaciones técnicas si el plan las trae.
- duration_estimate: ej "15s","30s","1:00" (si el plan no dice, estimá razonablemente).
- Respetá el orden en que aparecen las piezas en el plan.`;

    const userPrompt = `CONTEXTO DE LA HOJA:
- Marca / cliente: ${client?.name ?? 'Sin nombre'}
- Hoja: "${sheet.title ?? ''}" ${sheet.shoot_date ? `(grabación: ${sheet.shoot_date})` : ''}
- Locación: ${sheet.location ?? '—'}
- Notas: ${sheet.notes ?? '—'}

PLAN DE CONTENIDO (texto extraído del HTML):
"""
${planText}
"""

Convertí este plan en piezas para la hoja de producción siguiendo las reglas. Respondé solo con el JSON.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        temperature: 0.6,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic error', anthropicRes.status, errText);
      const map: Record<number, string> = {
        401: 'API key de Anthropic inválida. Revisá el secreto ANTHROPIC_API_KEY.',
        429: 'Anthropic rate limit. Intentá en unos segundos.',
        529: 'Anthropic está sobrecargado. Reintentá pronto.',
        400: 'Anthropic rechazó la petición.',
      };
      return json({ error: map[anthropicRes.status] ?? `Anthropic error ${anthropicRes.status}`, raw: errText.slice(0, 500) }, 502);
    }

    const data = await anthropicRes.json();
    const text: string = data?.content?.[0]?.text ?? '';

    const jsonStr = (() => {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) return fence[1];
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first >= 0 && last > first) return text.slice(first, last + 1);
      return text;
    })().trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse fail', e, text.slice(0, 500));
      return json({ error: 'Claude devolvió un JSON inválido. Reintentá.' }, 502);
    }

    const shotsRaw = (parsedJson as any)?.shots;
    if (!Array.isArray(shotsRaw)) {
      return json({ error: 'Respuesta sin array "shots".' }, 502);
    }

    const shots = shotsRaw
      .map((s) => ShotSchema.safeParse(s))
      .filter((r): r is { success: true; data: z.infer<typeof ShotSchema> } => r.success)
      .map((r) => r.data)
      .slice(0, max_shots);

    if (shots.length === 0) {
      return json({ error: 'No se pudieron validar piezas devueltas por Claude.' }, 502);
    }

    return json({ shots, usage: data?.usage ?? null, model_used: data?.model ?? model }, 200);
  } catch (err) {
    console.error('generate-shots-from-plan fatal', err);
    return json({ error: String((err as any)?.message ?? err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
