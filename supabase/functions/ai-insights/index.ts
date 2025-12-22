import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentSummary {
  totalPosts: number;
  topPlatform: string;
  avgEngagement: number;
  topPostTypes: string[];
  recentTrends: string[];
}

interface InsightRequest {
  clientId: string;
  clientName: string;
  industry: string;
  contentSummary: ContentSummary;
  insightType: 'content-ideas' | 'trending-topics' | 'performance-analysis' | 'optimization-tips';
  country: string;
  additionalContext?: string;
  hasAdAccount?: boolean;
}

const COUNTRY_NAMES: Record<string, string> = {
  'CR': 'Costa Rica',
  'MX': 'México',
  'CO': 'Colombia',
  'AR': 'Argentina',
  'ES': 'España',
  'US': 'Estados Unidos',
  'PA': 'Panamá',
  'GT': 'Guatemala',
  'SV': 'El Salvador',
  'HN': 'Honduras',
  'NI': 'Nicaragua',
};

async function getTrendingTopics(industry: string, country: string, perplexityKey: string): Promise<{ topics: string[], sources: string[] }> {
  const countryName = COUNTRY_NAMES[country] || 'Costa Rica';
  console.log('Fetching trending topics for industry:', industry, 'in', countryName);
  
  try {
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
            content: 'You are a social media trends analyst specializing in Latin American markets. Return a JSON object with "topics" (array of 5 trending topics) and "sources" (array of relevant URLs). No explanations.'
          },
          {
            role: 'user',
            content: `What are the top 5 trending social media topics, formats, or content ideas in the ${industry} industry specifically relevant to ${countryName} right now? Consider local culture, events, and preferences. Return as JSON: {"topics": ["topic1", ...], "sources": ["url1", ...]}`
          }
        ],
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return { topics: [], sources: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topics: parsed.topics || [],
        sources: parsed.sources || [],
      };
    }
    
    // Fallback: try to extract array
    const arrayMatch = content.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      return { topics: JSON.parse(arrayMatch[0]), sources: [] };
    }
    
    return { topics: [], sources: [] };
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return { topics: [], sources: [] };
  }
}

interface ContentIdea {
  idea: string;
  contentType: string;
  description: string;
  goal: string;
  justification: string;
}

interface InsightResult {
  insights: string[];
  recommendations: string[];
  justifications: string[];
  sources: string[];
  contentIdeas?: ContentIdea[];
  goalRecommendations?: {
    growth: string[];
    sales: string[];
    content: string[];
  };
}

async function generateInsights(
  request: InsightRequest,
  trendingTopics: string[],
  trendingSources: string[],
  lovableKey: string
): Promise<InsightResult> {
  console.log('Generating insights with Lovable AI');
  console.log('Additional context received:', request.additionalContext);
  const countryName = COUNTRY_NAMES[request.country] || 'Costa Rica';

  const systemPrompt = `Eres un experto estratega de redes sociales especializado en el mercado de ${countryName} y Latinoamérica.
Analiza los datos proporcionados y da insights específicos y accionables.
SIEMPRE responde en español. Sé conciso, específico y SIEMPRE justifica tus recomendaciones con razones claras.
Considera las particularidades culturales, festividades, eventos locales, y preferencias de ${countryName}.

IMPORTANTE - Para ${countryName}:
- NO te enfoques en temas genéricos como ecología, tropical o naturaleza a menos que sea relevante para el negocio.
- Enfócate en lo que REALMENTE le importa a la audiencia local: entretenimiento, economía, deportes, cultura pop, eventos actuales, noticias locales, comida, tradiciones, humor local.
- Las ideas deben ser PRÁCTICAS y aplicables, no genéricas.
- Si el cliente da contexto adicional, ESE CONTEXTO ES PRIORIDAD y debe guiar todas las recomendaciones.

${request.hasAdAccount ? 'IMPORTANTE: El cliente tiene una cuenta de anuncios conectada, incluye recomendaciones específicas para optimizar campañas publicitarias.' : ''}`;

  let userPrompt = '';
  let responseFormat = '';
  
  switch (request.insightType) {
    case 'content-ideas':
      responseFormat = '{"contentIdeas": [{"idea": "título corto", "contentType": "Reel|Post|Carrusel|Story|TikTok|Tweet", "description": "descripción de 2-3 oraciones", "goal": "Venta|Seguidores|Autoridad|Engagement|Awareness", "justification": "razón breve con dato estadístico si aplica"}, ...]}';
      userPrompt = `Datos de rendimiento para "${request.clientName}" (${request.industry}) en ${countryName}:
- Total posts: ${request.contentSummary.totalPosts}
- Plataforma principal: ${request.contentSummary.topPlatform}
- Engagement promedio: ${request.contentSummary.avgEngagement}
- Tipos de contenido top: ${request.contentSummary.topPostTypes.join(', ')}

${trendingTopics.length > 0 ? `Tendencias actuales: ${trendingTopics.join(', ')}` : ''}

${request.additionalContext ? `
CONTEXTO ADICIONAL DEL CLIENTE (PRIORIDAD MÁXIMA - basa las ideas en esto):
${request.additionalContext}
` : ''}

Genera 5 ideas de contenido ESPECÍFICAS y PRÁCTICAS para esta cuenta.
NO generes ideas genéricas sobre ecología, sostenibilidad o "tropical" a menos que el negocio lo requiera.
Las ideas deben ser:
- Relevantes para la audiencia de ${countryName}
- Basadas en el contexto del cliente si se proporcionó
- Accionables y específicas al negocio
- Con formatos que funcionen según los datos de rendimiento

Para CADA idea incluye:
- idea: título corto y descriptivo
- contentType: formato específico (Reel, Post, Carrusel, Story, TikTok, Tweet)
- description: qué incluir en el contenido (2-3 oraciones)
- goal: objetivo principal (Venta, Seguidores, Autoridad, Engagement, Awareness)
- justification: por qué funcionará, con datos si los hay

Retorna como JSON: ${responseFormat}`;
      break;

    case 'trending-topics':
      responseFormat = '{"insights": ["análisis de tendencia 1", ...], "justifications": ["por qué es relevante para tu marca", ...], "recommendations": ["cómo aprovecharla", ...]}';
      userPrompt = `Para la marca "${request.clientName}" en ${request.industry} operando en ${countryName}, analiza estas tendencias actuales:
${trendingTopics.length > 0 ? trendingTopics.join('\n') : 'No hay tendencias específicas disponibles'}

${request.additionalContext ? `Contexto del cliente que DEBES considerar: ${request.additionalContext}` : ''}

Sugiere cómo pueden aprovechar estas tendencias para su contenido en redes sociales.
Para cada sugerencia, justifica por qué es relevante para el mercado de ${countryName}.
Retorna como JSON: ${responseFormat}`;
      break;

    case 'performance-analysis':
      responseFormat = '{"insights": ["análisis clave 1", ...], "goalRecommendations": {"growth": ["recomendación crecimiento 1 con justificación", ...], "sales": ["recomendación ventas 1 con justificación", ...], "content": ["recomendación contenido 1 con justificación", ...]}, "recommendations": [], "justifications": []}';
      userPrompt = `Analiza el rendimiento de "${request.clientName}" (${request.industry}) en ${countryName}:
- Total posts: ${request.contentSummary.totalPosts}
- Plataforma principal: ${request.contentSummary.topPlatform}
- Engagement promedio: ${request.contentSummary.avgEngagement}
- Tipos de contenido top: ${request.contentSummary.topPostTypes.join(', ')}
- Tendencias recientes: ${request.contentSummary.recentTrends.join(', ')}

${request.hasAdAccount ? 'NOTA: Tienen cuenta de anuncios conectada - incluye análisis de oportunidades publicitarias.' : ''}
${request.additionalContext ? `Contexto del cliente que DEBES considerar: ${request.additionalContext}` : ''}

Proporciona un análisis ESPECÍFICO a esta cuenta (no genérico como "IG es efectivo").
Incluye recomendaciones separadas por objetivo:
- CRECIMIENTO: Cómo aumentar seguidores y alcance
- VENTAS: Cómo mejorar conversiones y ventas
- CONTENIDO: Cómo mejorar la calidad y engagement del contenido

CADA recomendación debe incluir su justificación basada en los datos.
Retorna como JSON: ${responseFormat}`;
      break;

    case 'optimization-tips':
      responseFormat = '{"insights": ["insight sobre métricas actuales", ...], "recommendations": ["tip de optimización detallado", ...], "justifications": ["justificación con datos o mejores prácticas", ...], "sources": ["url fuente si aplica", ...]}';
      userPrompt = `Para "${request.clientName}" en ${request.industry} en ${countryName}, con este rendimiento:
- Plataforma principal: ${request.contentSummary.topPlatform}
- Engagement promedio: ${request.contentSummary.avgEngagement}
- Tipos de contenido top: ${request.contentSummary.topPostTypes.join(', ')}
- Tendencias recientes: ${request.contentSummary.recentTrends.join(', ')}

${request.hasAdAccount ? 'Tienen cuenta de anuncios conectada - incluye tips de optimización de campañas.' : ''}
${request.additionalContext ? `Contexto del cliente que DEBES considerar: ${request.additionalContext}` : ''}

Proporciona tips de optimización ESPECÍFICOS basados en los datos de esta cuenta.
IMPORTANTE: Para CADA recomendación, incluye:
1. La recomendación específica
2. Una justificación clara de POR QUÉ funcionará
3. Si hay datos estadísticos o estudios que respalden la recomendación, menciónalos

Retorna como JSON: ${responseFormat}`;
      break;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        justifications: parsed.justifications || [],
        sources: [...(parsed.sources || []), ...trendingSources].filter(Boolean),
        goalRecommendations: parsed.goalRecommendations,
        contentIdeas: parsed.contentIdeas,
      };
    }

    return { insights: [], recommendations: [], justifications: [], sources: trendingSources };
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: InsightRequest = await req.json();
    console.log('Generating insights for:', request.clientName, 'type:', request.insightType, 'country:', request.country);

    // Get trending topics from Perplexity if available
    let trendingTopics: string[] = [];
    let trendingSources: string[] = [];
    if (PERPLEXITY_API_KEY && (request.insightType === 'content-ideas' || request.insightType === 'trending-topics')) {
      const trendingResult = await getTrendingTopics(request.industry, request.country || 'CR', PERPLEXITY_API_KEY);
      trendingTopics = trendingResult.topics;
      trendingSources = trendingResult.sources;
      console.log('Trending topics found:', trendingTopics.length);
    }

    // Generate insights with Lovable AI
    const result = await generateInsights(request, trendingTopics, trendingSources, LOVABLE_API_KEY);

    return new Response(JSON.stringify({
      success: true,
      insightType: request.insightType,
      trendingTopics,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-insights function:', error);
    
    const status = error instanceof Error && error.message.includes('Rate limit') ? 429 : 500;
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
