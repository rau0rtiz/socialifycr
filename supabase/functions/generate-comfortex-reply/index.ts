import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildComfortexUserMessage,
  callComfortexAI,
} from '../_shared/comfortex-reply.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await authed.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub;

    const { leadId, force } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: lead, error: leadErr } = await admin
      .from('instant_form_leads')
      .select('id, client_id, full_name, phone, custom_answers, campaign_name, ad_name, form_name, ai_message')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: hasAccess } = await admin.rpc('has_client_access', { _user_id: userId, _client_id: lead.client_id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Cost guard: if a message already exists, return it instead of re-billing AI.
    // Client must send `force: true` (after user confirmation) to regenerate.
    if ((lead as any).ai_message && !force) {
      return new Response(JSON.stringify({ message: (lead as any).ai_message, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userMessage = buildComfortexUserMessage(lead);

    let message: string;
    try {
      const result = await callComfortexAI(userMessage, lovableKey);
      message = result.message;
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.startsWith('AI 429')) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes alcanzado. Intenta en unos segundos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (msg.startsWith('AI 402')) {
        return new Response(JSON.stringify({ error: 'Créditos de Lovable AI agotados. Recarga en Settings → Plans & credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.error('Lovable AI error', e);
      return new Response(JSON.stringify({ error: msg || 'AI error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Persist so the message survives reloads and is available across users.
    await admin
      .from('instant_form_leads')
      .update({
        ai_message: message,
        ai_message_generated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-comfortex-reply error', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
