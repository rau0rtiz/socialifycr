import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignData {
  name: string;
  status: string;
  spend: number;
  reach: number;
  clicks: number;
  results: number;
  resultType: string;
  costPerResult: number;
  roas: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, campaignData, currency } = await req.json() as {
      prompt: string;
      campaignData: CampaignData[];
      currency: string;
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Calculate totals for context
    const totals = campaignData.reduce(
      (acc, c) => ({
        spend: acc.spend + c.spend,
        reach: acc.reach + c.reach,
        clicks: acc.clicks + c.clicks,
        results: acc.results + c.results,
      }),
      { spend: 0, reach: 0, clicks: 0, results: 0 }
    );

    const systemPrompt = `Eres un experto en marketing digital y análisis de campañas publicitarias. 
Tu tarea es generar reportes profesionales basándote en datos reales de campañas de Meta Ads.

FORMATO OBLIGATORIO — Todos los reportes deben seguir esta estructura:

1. **🏢 Contexto** — Describe brevemente la situación del negocio y el contexto de las campañas
2. **🎯 KPIs Clave** — Define los KPIs más relevantes según el tipo de negocio y muéstralos en tabla (KPI | Benchmark | Resultado | Estado)
3. **📊 Resumen de Resultados** — Análisis detallado de métricas con comparativas. Cada dato debe ir acompañado de contexto
4. **🟢🔴 Puntos Importantes** — Divide en "Puntos Excedentes" (lo que va muy bien) y "Puntos Preocupantes" (lo que necesita atención)
5. **⚠️ Diagnóstico y Mejoras** — Para cada punto preocupante: por qué está pasando y cómo mejorarlo con timeline
6. **🚀 Plan de Acción** — 5-7 acciones concretas con prioridad, responsable, timeline y resultado esperado en tabla
7. **📋 Resumen Ejecutivo** — 3-5 bullets que capturen lo esencial

Reglas:
- Usa markdown para estructurar (##, ###, tablas, >, **negrita**)
- Cuando uses términos técnicos (CPA, ROAS, CTR, CPM), explícalos la primera vez
- Traduce números a impacto real
- Sé honesto con los problemas, no suavices malos resultados
- Responde siempre en español

Datos de contexto:
- Moneda: ${currency}
- Total de campañas: ${campaignData.length}
- Gasto total: ${totals.spend.toFixed(2)} ${currency}
- Alcance total: ${totals.reach.toLocaleString()}
- Clics totales: ${totals.clicks.toLocaleString()}
- Resultados totales: ${totals.results.toLocaleString()}`;

    const userMessage = `${prompt}

Datos de campañas:
${JSON.stringify(campaignData, null, 2)}`;

    console.log('Generating report with prompt:', prompt);
    console.log('Campaign data count:', campaignData.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || 'No se pudo generar el reporte.';

    console.log('Report generated successfully');

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
