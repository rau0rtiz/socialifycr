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

    const { dashboardData, clientName, clientIndustry, clientContext, format, customInstructions } = await req.json();

    if (!dashboardData) throw new Error('dashboardData is required');

    const formatLabel = format === 'document' ? 'documento' : 'presentación';

    const systemPrompt = `Eres un estratega de marketing digital experto que comunica de forma CLARA y SIMPLE. Tu tarea es analizar datos reales de un cliente y generar un reporte estructurado en español.

ESTILO DE ESCRITURA (MUY IMPORTANTE):
- Escribe como si le explicaras los resultados a un cliente que NO es experto en marketing
- Usa oraciones cortas y directas. Evita párrafos largos
- Cuando uses un término técnico (CPA, ROAS, CTR, etc.), explícalo brevemente entre paréntesis la primera vez. Ejemplo: "El ROAS (retorno por cada dólar invertido en ads) fue de 3.2x"
- Prefiere ejemplos concretos: "Por cada ₡1,000 invertidos, generamos ₡3,200 en ventas" en lugar de solo "ROAS 3.2x"
- Usa comparaciones fáciles de entender: "El alcance creció un 25%, como pasar de llenar un auditorio de 100 personas a uno de 125"
- Destaca lo positivo primero, luego áreas de mejora con soluciones claras
- Usa viñetas y listas para facilitar la lectura
- Incluye emojis con moderación para hacer el contenido más visual y amigable

ESTRUCTURA DEL REPORTE:
- Usa ## para encabezados de sección
- Incluye insights accionables, no solo números
- Sugiere optimizaciones específicas en lenguaje simple
- Si el cliente tiene contexto de negocio, personaliza las recomendaciones
- Responde SIEMPRE en español`;

    const userMessage = `Cliente: ${clientName || 'Sin nombre'}
Industria: ${clientIndustry || 'No especificada'}
${clientContext ? `Contexto del negocio: ${clientContext}` : ''}
${customInstructions ? `\nInstrucciones adicionales del usuario: ${customInstructions}` : ''}

Datos del dashboard:
${JSON.stringify(dashboardData, null, 2)}

Genera un reporte mensual de marketing digital como ${formatLabel}. Incluye:
1. **Resumen ejecutivo** — Los 3-5 puntos más importantes del mes en lenguaje simple
2. **Análisis por área** — Desglosa cada fuente de datos (campañas, ventas, redes) con explicaciones claras
3. **Qué funcionó y qué mejorar** — Insights concretos con contexto
4. **Recomendaciones** — Acciones específicas para el próximo mes, escritas como pasos claros
5. **Próximos pasos** — Resumen de 3-5 acciones prioritarias`;

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
