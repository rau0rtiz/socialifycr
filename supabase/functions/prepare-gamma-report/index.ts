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

    const { dashboardData, clientName, clientIndustry, clientContext, format, customInstructions, dateRange } = await req.json();

    if (!dashboardData) throw new Error('dashboardData is required');

    const formatLabel = format === 'document' ? 'documento ejecutivo' : 'presentación ejecutiva';
    const periodLabel = dateRange || 'últimos 30 días';

    const systemPrompt = `Eres un consultor de marketing digital de alto nivel que elabora reportes ejecutivos para clientes premium. Tu trabajo es transformar datos crudos en narrativas estratégicas que impresionen.

PRINCIPIOS DE COMUNICACIÓN:
- Claridad ante todo: escribe para que un CEO sin background técnico entienda cada punto
- Cuando uses un término técnico (CPA, ROAS, CTR, CPM, etc.), explícalo de forma natural la primera vez. Ejemplo: "El ROAS — es decir, cuánto generamos por cada dólar invertido — fue de 3.2x"
- Traduce números a impacto real: "Invertimos $500 y generamos $1,600 en ventas" es más poderoso que "ROAS 3.2x"
- Usa analogías cuando ayuden: "El alcance creció 40%, como pasar de llenar un salón de conferencias a llenar un auditorio"

FORMATO Y ESTRUCTURA:
- Usa ## para encabezados principales y ### para sub-secciones
- Cada sección debe abrir con un insight clave en **negrita** (el "titular")
- Usa tablas markdown cuando presentes comparativas numéricas
- Usa > blockquotes para destacar hallazgos clave o recomendaciones importantes
- Incluye separadores --- entre secciones principales
- Usa ✅ para logros, ⚠️ para alertas, 📈 para crecimiento, 💡 para recomendaciones, 🎯 para objetivos

CALIDAD DEL CONTENIDO:
- NO repitas datos sin análisis. Cada número debe ir acompañado de contexto (¿es bueno? ¿malo? ¿por qué?)
- Incluye porcentajes de cambio cuando los datos lo permitan
- Prioriza insights accionables sobre descripciones genéricas
- Las recomendaciones deben ser específicas, medibles y con timeline sugerido
- Cierra con un "Resumen para el cliente" de máximo 3 bullets que capturen lo esencial

TONO: Profesional, confiado, estratégico. Como un socio consultor, no como un reporte automatizado.

IDIOMA: Siempre en español.`;

    // Build content analysis section
    let contentSection = '';
    if (dashboardData.topContent) {
      contentSection = `

## Datos de Contenido Orgánico del Período
${JSON.stringify(dashboardData.topContent, null, 2)}

INSTRUCCIONES PARA ANÁLISIS DE CONTENIDO:
- Identifica los TOP 5 contenidos con mejor rendimiento del período y explica POR QUÉ funcionaron
- Analiza patrones: ¿qué tipo de contenido (Reel, Video, Carrusel, Post) genera más engagement?
- Si hay datos de modelos/personas, indica quiénes generan más interacción
- Compara el rendimiento promedio de cada tipo de contenido
- Detecta tendencias: ¿qué temas, formatos o estilos resuenan más con la audiencia?
- Genera recomendaciones concretas para replicar éxitos: qué tipo de contenido crear más, qué temas explorar, qué formatos priorizar
- Si hay contenido cross-platform, analiza qué plataforma rinde mejor para cada tipo
`;
    }

    const userMessage = `# Reporte para: ${clientName || 'Cliente'}
**Industria:** ${clientIndustry || 'No especificada'}
**Período analizado:** ${periodLabel}
${clientContext ? `**Contexto estratégico del negocio:** ${clientContext}` : ''}
${customInstructions ? `\n**Instrucciones del equipo:** ${customInstructions}` : ''}

## Datos del período
${JSON.stringify(dashboardData, null, 2)}
${contentSection}

---

Genera un ${formatLabel} de reporte de marketing digital para el período **${periodLabel}**. Estructura:

1. **📊 Resumen Ejecutivo** — Los 3-5 hallazgos más importantes, con impacto en negrita
2. **🎯 Rendimiento de Campañas** (si hay datos de campañas) — Análisis de inversión vs retorno, mejores y peores campañas, eficiencia del gasto. Incluye tabla comparativa
3. **💰 Análisis de Ventas** (si hay datos de ventas) — Tendencias, fuentes más efectivas, ticket promedio, conversión. Si hay ventas atribuidas a anuncios, calcula el ROAS manual
4. **📱 Rendimiento de Contenido Orgánico** (si hay datos de contenido) — Top posts del período, análisis de qué funciona y qué no, patrones de engagement por tipo de contenido, recomendaciones para replicar éxitos
5. **👥 Presencia en Redes Sociales** (si hay datos de seguidores) — Crecimiento de audiencia, plataformas destacadas
6. **💡 Insights Estratégicos** — Patrones, oportunidades, riesgos identificados. Conecta insights de paid + organic + ventas
7. **🚀 Plan de Acción** — 5-7 recomendaciones concretas con prioridad (alta/media/baja) y timeline
8. **📋 Resumen para el Cliente** — 3 bullets que capturen lo esencial del período`;

    console.log('Generating PRO report text with Perplexity for client:', clientName, 'period:', periodLabel);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 6000,
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

    console.log('PRO report text generated successfully, length:', generatedText.length);

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
