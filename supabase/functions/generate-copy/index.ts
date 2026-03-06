import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, contentType, title, description, script, platform } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client to fetch client context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this client' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client info and AI context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, industry, ai_context')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt based on content type
    let contentPrompt = '';
    
    if (contentType === 'reel') {
      contentPrompt = `
Tipo de contenido: Reel/Video corto para ${platform || 'redes sociales'}
${title ? `Título: ${title}` : ''}
${script ? `Script/Guión: ${script}` : ''}
${description ? `Descripción adicional: ${description}` : ''}

Genera un copy atractivo para este reel que incluya:
1. Un hook inicial que capture la atención
2. Una descripción breve y engaging
3. Call to action relevante
4. 3-5 hashtags relevantes
`;
    } else if (contentType === 'post') {
      contentPrompt = `
Tipo de contenido: Post/Imagen para ${platform || 'redes sociales'}
${title ? `Título: ${title}` : ''}
${description ? `Descripción: ${description}` : ''}

Genera un copy para este post que incluya:
1. Un texto principal atractivo y relevante
2. Emojis apropiados para el tono de la marca
3. Call to action claro
4. 3-5 hashtags relevantes
`;
    } else if (contentType === 'carousel') {
      contentPrompt = `
Tipo de contenido: Carrusel para ${platform || 'redes sociales'}
${title ? `Título: ${title}` : ''}
${description ? `Descripción: ${description}` : ''}

Genera:
1. Un copy principal para la publicación del carrusel
2. Texto sugerido para cada slide (si aplica)
3. Call to action para el último slide
4. 3-5 hashtags relevantes
`;
    }

    const systemPrompt = `Eres un experto copywriter de redes sociales. Tu trabajo es generar copys atractivos, engaging y que generen interacción.

CONTEXTO DEL CLIENTE:
- Nombre: ${client.name}
- Industria: ${client.industry || 'No especificada'}
- Contexto adicional: ${client.ai_context || 'Sin contexto adicional'}

INSTRUCCIONES:
- Adapta el tono al tipo de marca y audiencia
- Usa un lenguaje natural y conversacional
- Incluye emojis de forma estratégica pero no excesiva
- Los hashtags deben ser relevantes y populares en la industria
- El copy debe ser conciso pero impactante
- Responde en español`;

    console.log('Calling Perplexity API for copy generation...');

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
          { role: 'user', content: contentPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate copy', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedCopy = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('Copy generated successfully');

    return new Response(
      JSON.stringify({ 
        copy: generatedCopy,
        citations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-copy function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
