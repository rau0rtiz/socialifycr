import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  callSetterModel,
  runChecks,
  type AgentContext,
  type Checks,
  type HistoryMessage,
} from '../_shared/setter-agent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'LOVABLE_API_KEY no está configurada' }, 500);

    const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await authed.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'No autorizado' }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isMember } = await admin.rpc('is_agency_member', { _user_id: userId });
    if (!isMember) return json({ error: 'Sin acceso al panel de agencia' }, 403);

    const body = await req.json().catch(() => ({}));
    const useDraftKnowledge = Boolean(body?.useDraftKnowledge);
    const onlyIds: string[] | null = Array.isArray(body?.testCaseIds) ? body.testCaseIds : null;

    let knowledge: any = null;
    if (useDraftKnowledge) {
      const { data } = await admin
        .from('msg_knowledge_versions')
        .select('version, manual, tone_notes, rules, examples, is_published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      knowledge = data;
    } else {
      const { data } = await admin
        .from('msg_knowledge_versions')
        .select('version, manual, tone_notes, rules, examples, is_published')
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      knowledge = data;
    }
    if (!knowledge) {
      return json(
        {
          error: useDraftKnowledge
            ? 'No hay manual comercial cargado.'
            : 'No hay una versión publicada del manual. Publicala o corré las pruebas con el borrador.',
        },
        409,
      );
    }

    const [{ data: offers }, { data: settings }] = await Promise.all([
      admin
        .from('msg_offers')
        .select('label, intent, price, currency, tax_note, scope_note, detail, sort_order')
        .eq('status', 'publicado')
        .order('sort_order'),
      admin.from('msg_settings').select('booking_url, tone_notes').eq('id', true).maybeSingle(),
    ]);

    let query = admin
      .from('msg_test_cases')
      .select('id, title, expectation, is_critical, sort_order, inputs')
      .order('sort_order');
    if (onlyIds?.length) query = query.in('id', onlyIds);
    const { data: cases, error: casesErr } = await query;
    if (casesErr) return json({ error: casesErr.message }, 400);

    const results: any[] = [];

    for (const tc of cases ?? []) {
      const inputs = (tc.inputs ?? {}) as any;
      const mode = inputs.mode ?? 'infraestructura';

      if (mode !== 'agente') {
        const { data: tr } = await admin
          .from('msg_test_runs')
          .insert({
            test_case_id: tc.id,
            knowledge_version: knowledge.version,
            auto_result: 'requiere_humano',
            notes: inputs.note ?? 'Caso de infraestructura: requiere revisión humana o un canal conectado.',
            run_by: userId,
          })
          .select('id')
          .maybeSingle();
        results.push({
          test_case_id: tc.id,
          title: tc.title,
          is_critical: tc.is_critical,
          auto_result: 'requiere_humano',
          notes: inputs.note ?? null,
          test_run_id: tr?.id ?? null,
        });
        continue;
      }

      const history: HistoryMessage[] = (inputs.messages ?? []).map((m: any) => ({
        author: m?.author === 'bot' || m?.author === 'humano' ? m.author : 'externo',
        body: String(m?.body ?? ''),
      }));

      const ctx: AgentContext = {
        manual: knowledge.manual,
        toneNotes: settings?.tone_notes ?? knowledge.tone_notes,
        rules: Array.isArray(knowledge.rules) ? knowledge.rules : [],
        examples: knowledge.examples,
        offers: offers ?? [],
        bookingUrl: settings?.booking_url ?? 'https://socialifycr.com/agendar',
        contact: inputs.contact ?? null,
        history,
        channel: 'laboratorio',
        stage: 'nuevo',
      };

      const run = await callSetterModel(lovableKey, ctx);

      if (!run.ok) {
        const { data: ar } = await admin
          .from('msg_agent_runs')
          .insert({
            conversation_id: null,
            model: 'openai/gpt-6-astra',
            knowledge_version: knowledge.version,
            is_simulation: true,
            outcome: 'error',
            latency_ms: run.latencyMs,
            validations: { error: run.error, status: run.status },
          })
          .select('id')
          .maybeSingle();
        await admin.from('msg_test_runs').insert({
          test_case_id: tc.id,
          knowledge_version: knowledge.version,
          agent_run_id: ar?.id ?? null,
          auto_result: 'error',
          notes: `Error del proveedor (${run.status}): ${run.error}`,
          run_by: userId,
        });
        results.push({
          test_case_id: tc.id,
          title: tc.title,
          is_critical: tc.is_critical,
          auto_result: 'error',
          notes: `Error del proveedor (${run.status})`,
        });
        if (run.status === 402 || run.status === 403) {
          return json({ error: 'Se detuvo la corrida: el proveedor de IA bloqueó las solicitudes.', results }, 402);
        }
        await sleep(1200);
        continue;
      }

      const checks = (inputs.checks ?? {}) as Checks;
      const evaluation = runChecks(run.proposal, checks, history.length, history);

      const { data: ar } = await admin
        .from('msg_agent_runs')
        .insert({
          conversation_id: null,
          model: run.model,
          knowledge_version: knowledge.version,
          is_simulation: true,
          outcome: evaluation.passed ? 'ok' : 'fallo_validacion',
          proposal: run.proposal,
          validations: evaluation,
          latency_ms: run.latencyMs,
          usage: run.usage,
        })
        .select('id')
        .maybeSingle();

      const { data: tr } = await admin
        .from('msg_test_runs')
        .insert({
          test_case_id: tc.id,
          knowledge_version: knowledge.version,
          agent_run_id: ar?.id ?? null,
          auto_result: evaluation.passed ? 'pass' : 'fail',
          notes: evaluation.failures.join(' · ') || null,
          run_by: userId,
        })
        .select('id')
        .maybeSingle();

      results.push({
        test_case_id: tc.id,
        title: tc.title,
        is_critical: tc.is_critical,
        auto_result: evaluation.passed ? 'pass' : 'fail',
        failures: evaluation.failures,
        reply: run.proposal.reply,
        intent: run.proposal.intent,
        suggested_action: run.proposal.suggested_action,
        needs_human: run.proposal.needs_human,
        latency_ms: run.latencyMs,
        usage: run.usage,
        test_run_id: tr?.id ?? null,
      });

      await sleep(700);
    }

    const summary = {
      total: results.length,
      pass: results.filter((r) => r.auto_result === 'pass').length,
      fail: results.filter((r) => r.auto_result === 'fail').length,
      requiere_humano: results.filter((r) => r.auto_result === 'requiere_humano').length,
      error: results.filter((r) => r.auto_result === 'error').length,
      criticos_fallidos: results.filter((r) => r.is_critical && (r.auto_result === 'fail' || r.auto_result === 'error'))
        .length,
      knowledge_version: knowledge.version,
      knowledge_is_draft: !knowledge.is_published,
      model: 'openai/gpt-6-astra',
    };

    return json({ summary, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
