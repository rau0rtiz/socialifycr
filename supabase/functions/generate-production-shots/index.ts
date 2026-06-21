import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const InputSchema = z.object({
  sheet_id: z.string().uuid(),
  prompt: z.string().min(80).max(8000),
  model: z.enum(['claude-opus-4-20250514', 'claude-sonnet-4-20250514']).default('claude-opus-4-20250514'),
  shot_count: z.number().int().min(3).max(20).default(8),
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
    const { sheet_id, prompt, model, shot_count } = parsed.data;

    // Load sheet + client context (RLS filters)
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

    const { data: existingShots } = await supabase
      .from('production_sheet_shots')
      .select('concept, description, content_type')
      .eq('sheet_id', sheet_id)
      .order('sort_order');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const systemPrompt = `Sos un director creativo senior especializado en contenido publicitario de redes sociales (reels, stories, TikTok, posts) para marcas latinoamericanas.

Tu trabajo es generar ideas de piezas de contenido concretas, accionables y diferenciadas a partir del prompt del usuario y el contexto del cliente.

REGLAS ESTRICTAS:
- Devuelvés EXCLUSIVAMENTE un JSON válido sin texto adicional, sin markdown, sin code fences.
- El JSON debe ser un objeto con clave "shots" que contiene un array de exactamente ${shot_count} piezas.
- Cada pieza tiene la forma: { "content_type", "platform", "concept", "description", "hook", "script", "cta", "tech_notes", "duration_estimate" }.
- content_type ∈ ["reel","story","post","foto","tiktok","short","otro"]
- platform ∈ ["instagram","tiktok","youtube","linkedin","multi"]
- concept: título corto y punzante de la pieza (máx 80 chars).
- description: 1-2 oraciones describiendo qué se ve / qué pasa.
- hook: el primer gancho/frase de los primeros 2 segundos.
- script: guion breve o estructura escena por escena (puede usar saltos de línea).
- cta: llamado a la acción concreto.
- tech_notes: indicaciones técnicas (ángulo, luz, audio, props).
- duration_estimate: ej. "15s", "30s", "1:00".
- No repitas conceptos ya existentes en la hoja.
- Variá formatos, hooks y ángulos. Pensá como un creativo, no como un robot.`;

    const userPrompt = `CONTEXTO DEL CLIENTE:
- Marca: ${client?.name ?? 'Sin nombre'}
- Hoja: "${sheet.title ?? ''}" ${sheet.shoot_date ? `(grabación: ${sheet.shoot_date})` : ''}
- Locación: ${sheet.location ?? '—'}
- Notas de la hoja: ${sheet.notes ?? '—'}

PIEZAS YA EN LA HOJA (no repetir):
${(existingShots ?? []).map((s, i) => `${i + 1}. [${s.content_type ?? 'otro'}] ${s.concept ?? s.description ?? '(vacío)'}`).join('\n') || '(ninguna)'}

BRIEF DEL USUARIO:
${prompt}

Generá ${shot_count} piezas de contenido siguiendo las reglas. Respondé solo con el JSON.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.8,
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

    // Extract JSON (handle accidental code fences just in case)
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
      .map((r) => r.data);

    if (shots.length === 0) {
      return json({ error: 'No se pudieron validar piezas devueltas por Claude.' }, 502);
    }

    return json({
      shots,
      usage: data?.usage ?? null,
      model_used: data?.model ?? model,
    }, 200);
  } catch (err) {
    console.error('generate-production-shots fatal', err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
