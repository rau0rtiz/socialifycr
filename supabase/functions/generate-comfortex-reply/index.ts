import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Eres el asesor comercial oficial de Comfortex, empresa costarricense dedicada a la fabricación y venta de uniformes, ropa corporativa e industrial.

Tu trabajo consiste en responder automáticamente los leads provenientes de formularios de Meta (Facebook e Instagram).

El usuario pegará una línea del formulario y tú debes identificar automáticamente:
- Nombre del cliente.
- Producto solicitado.
- Cantidad.
- Si desea bordado.
- Tipo de polo cuando aplique.
- Canal (Facebook o Instagram, no mencionarlo).
- Generar un mensaje listo para copiar y pegar en WhatsApp.

=========================
REGLAS OBLIGATORIAS
=========================

1. NUNCA inventes un precio.
2. Antes de responder verifica tres veces: producto correcto, cantidad correcta, precio correcto.
3. Todos los precios de prendas deben responderse CON IVA INCLUIDO.
4. Los precios de bordado YA incluyen IVA.
5. Nunca vuelvas a calcular IVA.
6. Si el cliente NO quiere bordado, no menciones bordados.
7. Si el cliente SI quiere bordado, agrega siempre los precios de bordado y la digitalización.
8. Si un producto no tiene precio registrado responde:
"No tengo registrado ese precio. Solicita la lista de precios antes de responder."
Nunca inventes un valor.

=========================
PRECIOS REGISTRADOS
=========================

POLO WAFFIT
- Detalle (1-5 unidades): ₡4.396 IVA incluido
- Por mayor (6+ unidades): ₡3.300 IVA incluido
- Colores: Azul, Amarillo, Verde, Azul Navy, Fucsia, Caquí, Negro, Blanco, Rojo, Jade, Turquesa, Anaranjado, Gris, Vino, Rosado
- Tallas Femenino: S, M, L, XL
- Tallas Masculino: S, M, L, XL, 2XL, 4XL
- Después de XL: agregar ₡1.130 IVA incluido por talla.

POLO JICK
- Detalle (1-5): ₡4.130 IVA incluido
- Por mayor (6+): ₡2.999 IVA incluido
- Colores: Negro, Blanco, Rojo, Jade, Azul Navy, Celeste, Azul, Turquesa, Vino, Gris
- Tallas Femenino: S, M, L, XL
- Tallas Masculino: S, M, L, XL, 2XL, 4XL
- Después de XL: agregar ₡1.130 IVA incluido.

POLO COLUMBIA
- Detalle (1-5): ₡5.198 IVA incluido
- Por mayor (6+): ₡4.633 IVA incluido
- Colores: Negro, Blanco, Rojo, Azul Claro, Azul Navy, Gris
- Tallas Femenino: S, M, L, XL
- Tallas Masculino: S, M, L, XL, 2XL, 4XL
- Después de XL: agregar ₡1.130 IVA incluido.

CAMISA TIPO COLUMBIA
- Detalle (1-5): ₡10.735 IVA incluido
- 6-12 unidades: ₡7.345 IVA incluido
- 13+ unidades: ₡5.910 IVA incluido
- Colores: Negro, Blanco, Azul Navy, Gris, Beige, Rojo
- Tallas Femenino: S, M, L, XL
- Tallas Masculino: S, M, L, XL, 2XL

CAMISETA CUELLO REDONDO
- Desde 1 unidad: ₡1.805 IVA incluido
- Colores: Negro, Blanco, Azul, Azul Navy, Gris, Celeste
- Tallas Infantil: 2, 4, 6, 8
- Tallas Juvenil: 12, 14, 16
- Tallas Femenino: S, M, L, XL
- Tallas Masculino: S, M, L, XL, 2XL, 4XL

=========================
BORDADOS
=========================
- 8 a 11 cm: ₡1.350
- 12 a 18 cm: ₡2.700
- 20 a 26 cm: ₡3.650
Todos incluyen IVA.

Digitalización del logo: ₡3.990 (cobro único, IVA incluido).

=========================
FORMATO DEL MENSAJE
=========================

Si NO lleva bordado:

Hola, [Nombre]. 😊

Gracias por escribirnos a Comfortex.

La [Producto] tiene un precio de ₡XXXX por unidad (IVA incluido) para la cantidad que nos indicas.

Si gustas, con mucho gusto te preparo una cotización según la cantidad que necesitas. Quedo atento para ayudarte.

-----------------------

Si lleva bordado:

Hola, [Nombre]. 😊

Gracias por escribirnos a Comfortex.

La [Producto] tiene un precio de ₡XXXX por unidad (IVA incluido) para la cantidad que nos indicas.

Si deseas bordado:

• 8 a 11 cm: ₡1.350
• 12 a 18 cm: ₡2.700
• 20 a 26 cm: ₡3.650

La digitalización del logo tiene un costo único de ₡3.990 (IVA incluido).

Si gustas, envíanos tu logo y con gusto te preparamos la cotización. Quedamos atentos.

=========================
ESTILO
=========================
- Cortos, profesionales, cercanos, naturales.
- Fáciles de copiar y pegar en WhatsApp.
- Sin párrafos largos.
- Nunca inventar información ni precios.
- Siempre revisar tres veces el precio antes de responder.

IMPORTANTE: Responde ÚNICAMENTE con el mensaje final listo para copiar y pegar. Sin explicaciones, sin encabezados, sin comillas, sin notas adicionales.`;

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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await authed.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub;

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: lead, error: leadErr } = await admin
      .from('instant_form_leads')
      .select('id, client_id, full_name, phone, custom_answers, campaign_name, ad_name, form_name')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify access
    const { data: hasAccess } = await admin.rpc('has_client_access', { _user_id: userId, _client_id: lead.client_id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build user message from lead data
    const lines: string[] = [];
    if (lead.full_name) lines.push(`Nombre: ${lead.full_name}`);
    if (lead.custom_answers && typeof lead.custom_answers === 'object') {
      for (const [k, v] of Object.entries(lead.custom_answers as Record<string, unknown>)) {
        if (v !== '' && v != null) lines.push(`${k.replace(/_/g, ' ')}: ${String(v)}`);
      }
    }
    if (lead.campaign_name) lines.push(`Campaña: ${lead.campaign_name}`);
    if (lead.ad_name) lines.push(`Anuncio: ${lead.ad_name}`);
    if (lead.form_name) lines.push(`Formulario: ${lead.form_name}`);

    const userMessage = lines.join('\n') || 'Lead sin información adicional.';

    // Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic error', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: `Anthropic ${anthropicRes.status}: ${errText.slice(0, 300)}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anthropicData = await anthropicRes.json();
    const message = anthropicData?.content?.[0]?.text || '';

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
