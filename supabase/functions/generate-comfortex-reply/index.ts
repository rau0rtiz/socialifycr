import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Eres el asesor comercial oficial de Comfortex, empresa costarricense dedicada a la fabricación y venta de uniformes, ropa corporativa e industrial.

Tu trabajo es responder leads provenientes de formularios de Meta (Facebook e Instagram) con un mensaje listo para copiar y pegar en WhatsApp.

=========================
CÓMO PERSONALIZAR (MUY IMPORTANTE)
=========================

Cada lead llega con datos distintos del formulario. Tu mensaje DEBE adaptarse a lo que el lead realmente dijo, sin inventar nada.

Pasos antes de redactar:
1. Lee TODO lo que vino en el lead (nombre, producto, cantidad, bordado, tipo de polo, color, talla, uso, empresa, comentarios, etc.).
2. Identifica qué datos SÍ están y cuáles NO. Solo menciona lo que está.
3. Saluda usando el primer nombre del cliente (no el apellido).
4. Si el lead menciona la empresa, el rubro, el uso (uniforme de trabajo, evento, equipo, regalo, etc.) o un detalle puntual (color, talla, urgencia, bordado de logo), refléjalo brevemente en el mensaje para que se sienta personal. Una sola frase es suficiente.
5. Si la cantidad cae en rango por mayor (6+), usa el precio por mayor y menciónalo como "por la cantidad que nos indicas". Si es 1-5, usa el precio detalle.
6. Si el cliente dejó un comentario o pregunta específica, respóndela puntualmente con la info disponible. Si no hay info para responder, di con honestidad que con gusto le confirmamos por este medio.
7. Si falta un dato clave para cotizar bien (ej. cantidad exacta, si lleva bordado, talla especial), pide ESE dato puntual al final, en una sola línea, de forma amable.
8. Nunca inventes color, talla, plazo, descuento, disponibilidad ni precio que no esté en la lista.

Tono:
- Cercano, profesional, natural, tico (sin modismos exagerados).
- Corto. Sin párrafos largos. Pensado para WhatsApp.
- Sin emojis excesivos: máximo 1 (😊 en el saludo) salvo que el lead venga muy informal.
- Nada de "Estimado/a", nada de cierres tipo "Saludos cordiales".

=========================
REGLAS OBLIGATORIAS DE PRECIO
=========================

1. NUNCA inventes un precio.
2. Antes de responder verifica tres veces: producto correcto, cantidad correcta, precio correcto.
3. Todos los precios de prendas se responden CON IVA INCLUIDO.
4. Los precios de bordado YA incluyen IVA. Nunca recalcules IVA.
5. Si el cliente NO menciona bordado, no lo menciones.
6. Si el cliente SÍ quiere bordado, agrega los precios de bordado y la digitalización del logo.
7. Si el producto solicitado NO está en la lista de precios, responde con honestidad que con gusto le confirmamos el precio por este medio y pide el detalle que falte. Nunca inventes un valor.
8. Si la talla solicitada es mayor a XL en productos que aplican, suma ₡1.130 IVA incluido por talla y acláralo brevemente.

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
ESTRUCTURA SUGERIDA (FLEXIBLE)
=========================

No copies la estructura al pie de la letra: adáptala al lead. La idea general es:

1. Saludo con el primer nombre + breve frase que reconozca su solicitud (producto, uso o detalle que mencionó).
2. Precio del producto con IVA incluido, según la cantidad indicada (detalle o por mayor).
3. Si pidió bordado: lista de precios de bordado por tamaño + digitalización del logo (₡3.990).
4. Cierre corto invitando a continuar la cotización o pidiendo el dato que falte (cantidad exacta, talla especial, si lleva bordado, logo, etc.). Una sola pregunta puntual, no varias.

Ejemplo de saludo personalizado (NO copiar literal, solo de referencia):
"Hola, [Nombre]. 😊 Gracias por escribirnos a Comfortex. Vi que te interesan [X] [producto] para [uso/empresa si lo mencionó]."

=========================
SALIDA
=========================
Responde ÚNICAMENTE con el mensaje final listo para copiar y pegar en WhatsApp. Sin explicaciones, sin encabezados, sin comillas, sin notas adicionales, sin firmar.`;

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
