import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, clientName, industry } = await req.json();

    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Context is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Polishing context for ${clientName} in ${industry}`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en marketing digital y estrategia de contenido. Tu trabajo es mejorar y estructurar el contexto de IA para un cliente.

Debes:
1. Mantener toda la información original
2. Estructurar mejor el contenido en secciones claras
3. Hacerlo más específico y accionable
4. Agregar detalles relevantes si el contexto es muy vago
5. Mantener el tono profesional pero accesible
6. Escribir en español

Formato sugerido:
- ENFOQUE PRINCIPAL: [una línea]
- TEMAS CLAVE: [lista breve]
- AUDIENCIA: [descripción concisa]
- ESTILO: [tono y enfoque de comunicación]
- OBJETIVOS: [metas a corto/mediano plazo]
- EVITAR: [temas o enfoques a evitar, si aplica]

Responde SOLO con el contexto mejorado, sin explicaciones adicionales.`
          },
          {
            role: 'user',
            content: `Cliente: ${clientName}
Industria: ${industry || 'No especificada'}

Contexto original a mejorar:
${context}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const polishedContext = data.choices?.[0]?.message?.content;

    if (!polishedContext) {
      throw new Error('No response from Perplexity');
    }

    console.log('Context polished successfully');

    return new Response(
      JSON.stringify({ polishedContext }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error polishing context:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to polish context';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
