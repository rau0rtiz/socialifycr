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
}

async function getTrendingTopics(industry: string, perplexityKey: string): Promise<string[]> {
  console.log('Fetching trending topics for industry:', industry);
  
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
            content: 'You are a social media trends analyst. Return only a JSON array of 5 trending topics/formats. No explanations, just the array.'
          },
          {
            role: 'user',
            content: `What are the top 5 trending social media topics, formats, or content ideas in the ${industry} industry right now? Return as a JSON array of strings.`
          }
        ],
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return [];
  }
}

async function generateInsights(
  request: InsightRequest,
  trendingTopics: string[],
  lovableKey: string
): Promise<{ insights: string[]; recommendations: string[] }> {
  console.log('Generating insights with Lovable AI');

  const systemPrompt = `You are an expert social media strategist. Analyze the data and provide actionable insights.
Always respond in Spanish. Be concise and specific.`;

  let userPrompt = '';
  
  switch (request.insightType) {
    case 'content-ideas':
      userPrompt = `Based on this social media performance data for "${request.clientName}" (${request.industry}):
- Total posts: ${request.contentSummary.totalPosts}
- Top platform: ${request.contentSummary.topPlatform}
- Average engagement: ${request.contentSummary.avgEngagement}
- Top performing content types: ${request.contentSummary.topPostTypes.join(', ')}

${trendingTopics.length > 0 ? `Current trending topics in ${request.industry}: ${trendingTopics.join(', ')}` : ''}

Generate 5 specific content ideas that would resonate with their audience. Return as JSON: {"insights": ["idea1", "idea2", ...], "recommendations": ["tip1", "tip2", ...]}`;
      break;

    case 'trending-topics':
      userPrompt = `For a ${request.industry} brand called "${request.clientName}", analyze these current trending topics:
${trendingTopics.length > 0 ? trendingTopics.join('\n') : 'No specific trends available'}

Suggest how they can leverage these trends for their social media content. Return as JSON: {"insights": ["trend analysis 1", ...], "recommendations": ["action 1", ...]}`;
      break;

    case 'performance-analysis':
      userPrompt = `Analyze this social media performance for "${request.clientName}" (${request.industry}):
- Total posts: ${request.contentSummary.totalPosts}
- Top platform: ${request.contentSummary.topPlatform}
- Average engagement: ${request.contentSummary.avgEngagement}
- Top performing content types: ${request.contentSummary.topPostTypes.join(', ')}
- Recent trends: ${request.contentSummary.recentTrends.join(', ')}

Provide performance insights and areas for improvement. Return as JSON: {"insights": ["analysis 1", ...], "recommendations": ["improvement 1", ...]}`;
      break;

    case 'optimization-tips':
      userPrompt = `For "${request.clientName}" in the ${request.industry} industry, with their current performance:
- Top platform: ${request.contentSummary.topPlatform}
- Average engagement: ${request.contentSummary.avgEngagement}
- Top performing content types: ${request.contentSummary.topPostTypes.join(', ')}

Provide specific optimization tips to improve their social media performance. Return as JSON: {"insights": ["insight 1", ...], "recommendations": ["tip 1", ...]}`;
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
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
      };
    }

    return { insights: [], recommendations: [] };
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
    console.log('Generating insights for:', request.clientName, 'type:', request.insightType);

    // Get trending topics from Perplexity if available
    let trendingTopics: string[] = [];
    if (PERPLEXITY_API_KEY && (request.insightType === 'content-ideas' || request.insightType === 'trending-topics')) {
      trendingTopics = await getTrendingTopics(request.industry, PERPLEXITY_API_KEY);
      console.log('Trending topics found:', trendingTopics.length);
    }

    // Generate insights with Lovable AI
    const result = await generateInsights(request, trendingTopics, LOVABLE_API_KEY);

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
