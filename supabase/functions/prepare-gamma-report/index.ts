import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const { dashboardData, clientName, clientIndustry, clientContext, format } = await req.json();

    if (!dashboardData) throw new Error('dashboardData is required');

    const formatLabel = format === 'document' ? 'documento' : 'presentación';

    const systemPrompt = `Eres un estratega de marketing digital experto. Tu tarea es analizar datos reales de un cliente y generar un texto rico, estructurado y profesional en español que será usado para crear una ${formatLabel} en Gamma.app.

REGLAS IMPORTANTES:
- El texto debe estar estructurado con secciones claras usando ## para encabezados
- Incluye insights accionables, no solo números
- Compara métricas cuando sea posible (ej: CPA vs industria)
- Sugiere optimizaciones específicas basadas en los datos
- Usa un tono profesional pero accesible
- Incluye emojis relevantes para hacer el contenido visual
- Organiza la información para que Gamma pueda crear slides/secciones lógicas
- Si el cliente tiene contexto de negocio, úsalo para personalizar las recomendaciones
- Responde SIEMPRE en español`;

    const userMessage = `Cliente: ${clientName || 'Sin nombre'}
Industria: ${clientIndustry || 'No especificada'}
${clientContext ? `Contexto del negocio: ${clientContext}` : ''}

Datos del dashboard:
${JSON.stringify(dashboardData, null, 2)}

Genera un texto completo y estructurado para una ${formatLabel} de reporte mensual de marketing digital. Incluye:
1. Resumen ejecutivo con los KPIs más importantes
2. Análisis de cada área de datos proporcionada (campañas, ventas, redes sociales, contenido)
3. Insights clave y patrones identificados
4. Recomendaciones específicas para el próximo mes
5. Conclusión con próximos pasos`;

    console.log('Generating report text with Perplexity for client:', clientName);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes alcanzado. Intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    console.log('Report text generated successfully, length:', generatedText.length);

    return new Response(
      JSON.stringify({ text: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in prepare-gamma-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
