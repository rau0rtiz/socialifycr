// Shared Comfortex WhatsApp reply generator.
// Used by generate-comfortex-reply (manual) and sync-instant-form-leads (auto on new lead).

// -------- Urgency detection (duplicated from src/lib/comfortex-urgency.ts) --------
type UrgencyBucket = '24h' | '1-3d' | '4-7d' | 'cotizar';

const urgencyNormalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\-\s]+/g, ' ').trim();

const URGENCY_KEY_HINTS = ['pronto', 'urgen', 'cuando', 'necesitan', 'plazo', 'entrega'];

const mapUrgencyValue = (value: string): UrgencyBucket | null => {
  const v = urgencyNormalize(value);
  if (!v) return null;
  if (v.includes('24') || v.includes('proxima') || v.includes('hoy') || v.includes('urgen')) return '24h';
  if (v.match(/\b1\s*[-a]?\s*3\b/) || v.includes('1 a 3') || v.includes('1-3')) return '1-3d';
  if (v.match(/\b4\s*[-a]?\s*7\b/) || v.includes('4 a 7') || v.includes('4-7') || v.includes('semana')) return '4-7d';
  if (v.includes('cotiz') || v.includes('solo quiero') || v.includes('informacion')) return 'cotizar';
  return null;
};

export function detectUrgency(custom_answers: Record<string, unknown> | null | undefined): UrgencyBucket | null {
  if (!custom_answers || typeof custom_answers !== 'object') return null;
  for (const [rawKey, rawVal] of Object.entries(custom_answers)) {
    const key = urgencyNormalize(rawKey);
    if (!URGENCY_KEY_HINTS.some((h) => key.includes(h))) continue;
    if (rawVal == null) continue;
    const b = mapUrgencyValue(String(rawVal));
    if (b) return b;
  }
  for (const rawVal of Object.values(custom_answers)) {
    if (rawVal == null) continue;
    const v = urgencyNormalize(String(rawVal));
    if (v.includes('proxima') && v.includes('24')) return '24h';
    if (v.includes('1-3 dias') || v.includes('1 a 3 dias')) return '1-3d';
    if (v.includes('4-7 dias') || v.includes('4 a 7 dias')) return '4-7d';
    if (v === 'solo quiero cotizar') return 'cotizar';
  }
  return null;
}


export const COMFORTEX_CLIENT_ID = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7';

export const COMFORTEX_SYSTEM_PROMPT = `Eres el asesor comercial oficial de Comfortex, empresa costarricense dedicada a la fabricación y venta de uniformes, ropa corporativa e industrial.

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
- PROHIBIDO usar emojis, emoticones o caracteres decorativos de cualquier tipo. Solo texto plano.
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
"Hola, [Nombre]. Gracias por escribirnos a Comfortex. Vi que te interesan [X] [producto] para [uso/empresa si lo mencionó]."

=========================
URGENCIA (adaptar cierre)
=========================
Si en los datos del lead viene una línea "Urgencia detectada: <bucket>", adaptá el cierre así:
- "24h": tono ejecutivo. Confirmá que podés revisar disponibilidad y plazo AHORA. Pedí cantidad exacta y talla como último dato para confirmar entrega inmediata.
- "1-3d": mencioná que la producción normal toma unos días y pedí confirmación rápida para reservar cupo de producción.
- "4-7d": tono comercial estándar. Sin push.
- "cotizar": tono informativo, enfocá en precio y opciones, sin presionar el cierre. No pidas urgencia ni confirmación de compra.
Nunca menciones literalmente la palabra "bucket" ni "urgencia detectada" en la respuesta.

=========================
SALIDA
=========================
Responde ÚNICAMENTE con el mensaje final listo para copiar y pegar en WhatsApp. Sin emojis, sin explicaciones, sin encabezados, sin comillas, sin notas adicionales, sin firmar.`;

// Strip any emoji the model might still emit despite the instructions.
export function stripEmojis(input: string): string {
  if (!input) return input;
  return input
    // Common emoji ranges + variation selectors + ZWJ
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export interface ComfortexLeadForPrompt {
  full_name: string | null;
  custom_answers: Record<string, unknown> | null;
  campaign_name: string | null;
  ad_name: string | null;
  form_name: string | null;
}

export function buildComfortexUserMessage(lead: ComfortexLeadForPrompt): string {
  const lines: string[] = [];
  if (lead.full_name) lines.push(`Nombre: ${lead.full_name}`);
  if (lead.custom_answers && typeof lead.custom_answers === 'object') {
    for (const [k, v] of Object.entries(lead.custom_answers)) {
      if (v !== '' && v != null) lines.push(`${k.replace(/_/g, ' ')}: ${String(v)}`);
    }
  }
  const urgency = detectUrgency(lead.custom_answers);
  if (urgency) lines.push(`Urgencia detectada: ${urgency}`);
  if (lead.campaign_name) lines.push(`Campaña: ${lead.campaign_name}`);
  if (lead.ad_name) lines.push(`Anuncio: ${lead.ad_name}`);
  if (lead.form_name) lines.push(`Formulario: ${lead.form_name}`);
  return lines.join('\n') || 'Lead sin información adicional.';
}

/**
 * Calls the Lovable AI gateway to produce the WhatsApp reply.
 * Returns the cleaned message text, or throws with a status hint on failure.
 */
export async function callComfortexAI(
  userMessage: string,
  lovableKey: string,
): Promise<{ message: string; status: number }> {
  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': lovableKey,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: COMFORTEX_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    throw new Error(`AI ${aiRes.status}: ${errText.slice(0, 300)}`);
  }

  const aiData = await aiRes.json();
  const rawMessage = aiData?.choices?.[0]?.message?.content || '';
  return { message: stripEmojis(rawMessage), status: 200 };
}

/**
 * Generates the reply for a given lead and persists it to instant_form_leads.
 * Best-effort: swallows errors and returns null so it can be called from the
 * sync loop without failing the whole ingest.
 */
export async function generateAndSaveComfortexReply(
  admin: any,
  leadId: string,
  lovableKey: string,
): Promise<string | null> {
  try {
    const { data: lead, error } = await admin
      .from('instant_form_leads')
      .select('id, full_name, custom_answers, campaign_name, ad_name, form_name')
      .eq('id', leadId)
      .maybeSingle();
    if (error || !lead) return null;

    const userMessage = buildComfortexUserMessage(lead as ComfortexLeadForPrompt);
    const { message } = await callComfortexAI(userMessage, lovableKey);
    if (!message) return null;

    await admin
      .from('instant_form_leads')
      .update({
        ai_message: message,
        ai_message_generated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return message;
  } catch (e) {
    console.error('generateAndSaveComfortexReply failed for lead', leadId, e);
    return null;
  }
}
