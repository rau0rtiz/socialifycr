import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GAMMA_API_URL = 'https://public-api.gamma.app/v1.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GAMMA_API_KEY = Deno.env.get('GAMMA_API_KEY');
    if (!GAMMA_API_KEY) {
      throw new Error('GAMMA_API_KEY is not configured');
    }

    const { action, generationId, ...params } = await req.json();

    // Action: check status of a generation
    if (action === 'status') {
      if (!generationId) throw new Error('generationId is required for status check');

      const response = await fetch(`${GAMMA_API_URL}/generations/${generationId}`, {
        method: 'GET',
        headers: { 'X-API-KEY': GAMMA_API_KEY },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gamma status error:', response.status, errorText);
        throw new Error(`Gamma API error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: export a generation as PDF or PPTX
    if (action === 'export') {
      const { gammaId, exportAs } = params;
      if (!gammaId || !exportAs) throw new Error('gammaId and exportAs are required');

      // Use the generations endpoint with export parameter
      const response = await fetch(`${GAMMA_API_URL}/generations/from-template`, {
        method: 'POST',
        headers: {
          'X-API-KEY': GAMMA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gammaId,
          prompt: 'Export this content as-is',
          exportAs,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gamma export error:', response.status, errorText);
        throw new Error(`Gamma export error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: generate a new gamma
    const { inputText, format, additionalInstructions, numCards } = params;

    if (!inputText) throw new Error('inputText is required');

    const body: Record<string, unknown> = {
      inputText,
      textMode: 'generate',
      format: format || 'presentation',
    };

    if (additionalInstructions) body.additionalInstructions = additionalInstructions;
    if (numCards) body.numCards = numCards;

    console.log('Generating Gamma report:', { format: body.format, textLength: inputText.length });

    const response = await fetch(`${GAMMA_API_URL}/generations`, {
      method: 'POST',
      headers: {
        'X-API-KEY': GAMMA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gamma generation error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Gamma API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gamma generation started:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in gamma-report function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
