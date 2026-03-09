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
- Usa analogías cuando ayuden

FORMATO Y ESTRUCTURA:
- Usa ## para encabezados principales y ### para sub-secciones
- Cada sección debe abrir con un insight clave en **negrita** (el "titular")
- Usa tablas markdown cuando presentes comparativas numéricas
- Usa > blockquotes para destacar hallazgos clave o recomendaciones importantes
- Incluye separadores --- entre secciones principales
- Usa ✅ para logros, ⚠️ para alertas, 📈 para crecimiento, 💡 para recomendaciones, 🎯 para objetivos, 🔴 para puntos preocupantes, 🟢 para puntos excedentes

CALIDAD DEL CONTENIDO:
- NO repitas datos sin análisis. Cada número debe ir acompañado de contexto (¿es bueno? ¿malo? ¿por qué?)
- Incluye porcentajes de cambio cuando los datos lo permitan
- Prioriza insights accionables sobre descripciones genéricas
- Las recomendaciones deben ser específicas, medibles y con timeline sugerido

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
- Genera recomendaciones concretas para replicar éxitos
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

Genera un ${formatLabel} de reporte de marketing digital para el período **${periodLabel}**. 

ESTRUCTURA OBLIGATORIA (sigue este orden exacto):

## 1. 🏢 Contexto
- Breve descripción del negocio, industria y situación actual
- Objetivos principales del período
- Cualquier factor externo relevante (temporada, tendencias del mercado, etc.)

## 2. 🎯 KPIs Clave a Medir
- Define los KPIs más relevantes SEGÚN EL TIPO DE NEGOCIO e industria del cliente
- Explica por qué cada KPI es importante para este negocio en particular
- Establece benchmarks o referencias de la industria cuando sea posible
- Presenta los KPIs en una tabla con: KPI | Meta/Benchmark | Resultado Real | Estado

## 3. 📊 Resumen de Resultados
- Resumen general del rendimiento del período
- Si hay campañas: análisis de inversión vs retorno, mejores y peores campañas, eficiencia del gasto con tabla comparativa
- Si hay ventas: tendencias, fuentes más efectivas, ticket promedio. Si hay ventas atribuidas a anuncios, calcula el ROAS manual
- Si hay contenido orgánico: top posts, análisis de qué funciona y qué no, patrones de engagement por tipo
- Si hay datos de seguidores: crecimiento de audiencia, plataformas destacadas

## 4. 🟢🔴 Puntos Importantes
### Puntos Excedentes (lo que va muy bien)
- Identifica métricas o resultados que están significativamente por encima de lo esperado
- Explica qué está generando estos buenos resultados
- Recomienda cómo capitalizar y escalar estos éxitos

### Puntos Preocupantes (lo que necesita atención)
- Identifica métricas o resultados que están por debajo de lo esperado o muestran tendencias negativas
- Sé honesto y directo sobre los problemas

## 5. ⚠️ Diagnóstico y Mejoras
- Para cada punto preocupante del punto anterior:
  - **¿Por qué está pasando?** — Análisis de causa raíz
  - **¿Cómo se puede mejorar?** — Soluciones específicas y concretas
  - **¿En cuánto tiempo veríamos mejora?** — Timeline realista

## 6. 🚀 Plan de Acción
- 5-7 acciones concretas ordenadas por prioridad (Alta / Media / Baja)
- Cada acción debe incluir: qué hacer, quién es responsable (equipo de marketing, cliente, diseñador, etc.), timeline, y resultado esperado
- Presenta en formato tabla: Acción | Prioridad | Responsable | Timeline | Resultado Esperado

## 7. 📋 Resumen Ejecutivo
- 3-5 bullets que capturen lo esencial del período para el cliente`;

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
