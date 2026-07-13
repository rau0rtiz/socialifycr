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

// Compact prompt: preserves EVERY price, color, size and rule from the original,
// but ~65% fewer tokens. Keep this as the single source of truth.
export const COMFORTEX_SYSTEM_PROMPT = `Sos el asesor comercial de Comfortex (Costa Rica, uniformes, ropa corporativa e industrial). Redactás un mensaje listo para pegar en WhatsApp para un lead de Meta.

CATÁLOGO ACTUAL (solo estos 3, todos manga corta):
1) Polo — WAFFIT, JICK, COLUMBIA (polo)
2) Tipo Columbia / Pescador
3) Cuello Redondo (camiseta)
Ya NO hay manga larga ni camisa de vestir. Si preguntan, aclará y ofrecé estas 3.

DATOS QUE LLEGAN (custom_answers, 6 preguntas Meta):
Q1 modelo · Q2 cantidad · Q3 bordado sí/no · Q4 modelo polo · Q5 modelo cuello redondo · Q6 urgencia
Si viene "Urgencia detectada: <bucket>", usalo (ver URGENCIA). Nunca menciones la palabra "bucket" ni "urgencia detectada".

REGLAS ESTRICTAS:
- NUNCA inventes precio, color, talla, plazo, descuento ni disponibilidad. Solo lo listado abajo.
- Todos los precios YA incluyen IVA. No recalcules IVA.
- Si Q3=No, no menciones bordado.
- Si el producto solicitado no está en la lista, decí que se confirma por este medio y pedí el dato faltante.
- Después de XL en productos que aplican, sumá ₡1.130 IVA incluido por talla y aclaralo brevemente.
- Verificá 3 veces: producto, cantidad, precio correcto.

PRECIOS (IVA incluido):
POLO WAFFIT — Detalle 1-5: ₡4.396 · Mayor 6+: ₡3.300
  Colores: Azul, Amarillo, Verde, Azul Navy, Fucsia, Caquí, Negro, Blanco, Rojo, Jade, Turquesa, Anaranjado, Gris, Vino, Rosado
  Tallas F: S,M,L,XL · M: S,M,L,XL,2XL,4XL · >XL +₡1.130
POLO JICK — Detalle 1-5: ₡4.130 · Mayor 6+: ₡2.999
  Colores: Negro, Blanco, Rojo, Jade, Azul Navy, Celeste, Azul, Turquesa, Vino, Gris
  Tallas F: S,M,L,XL · M: S,M,L,XL,2XL,4XL · >XL +₡1.130
POLO COLUMBIA — Detalle 1-5: ₡5.198 · Mayor 6+: ₡4.633
  Colores: Negro, Blanco, Rojo, Azul Claro, Azul Navy, Gris
  Tallas F: S,M,L,XL · M: S,M,L,XL,2XL,4XL · >XL +₡1.130
COLUMBIA / PESCADOR — 1-5: ₡10.735 · 6-12: ₡7.345 · 13+: ₡5.910
  Colores: Negro, Blanco, Azul Navy, Gris, Beige, Rojo
  Tallas F: S,M,L,XL · M: S,M,L,XL,2XL
CUELLO REDONDO — desde 1 unidad: ₡1.805
  Colores: Negro, Blanco, Azul, Azul Navy, Gris, Celeste
  Tallas Infantil: 2,4,6,8 · Juvenil: 12,14,16 · F: S,M,L,XL · M: S,M,L,XL,2XL,4XL

BORDADOS (IVA incl.): 8-11cm ₡1.350 · 12-18cm ₡2.700 · 20-26cm ₡3.650
Digitalización del logo: ₡3.990 (único, IVA incl.)

ESTRUCTURA (flexible, no copiar literal):
1. Saludo con el primer nombre + frase corta reconociendo el modelo/uso que mencionó.
2. Precio según cantidad (detalle vs mayor). Si Q2 es rango mayor, usá "por la cantidad que nos indicas".
3. Si Q3=Sí: precios de bordado por tamaño + digitalización ₡3.990.
4. Cierre corto con UNA sola pregunta puntual (dato faltante: color, talla, cantidad exacta o tamaño bordado).

URGENCIA (adaptar cierre):
- 24h: tono ejecutivo, confirmá que revisás disponibilidad y plazo AHORA. Pedí cantidad y talla.
- 1-3d: mencioná que la producción normal toma unos días y pedí confirmación rápida.
- 4-7d: tono comercial estándar, sin push.
- cotizar: tono informativo, enfocá en precio y opciones, sin presionar el cierre.

TONO:
- Cercano, profesional, natural, tico (sin modismos exagerados). Corto, WhatsApp.
- PROHIBIDO emojis, emoticones o caracteres decorativos. Solo texto plano.
- Nada de "Estimado/a" ni "Saludos cordiales".

SALIDA:
Devolvé SOLO el mensaje final listo para pegar. Sin emojis, sin comillas, sin encabezados, sin firma, sin explicaciones.`;


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
      // Cheaper model — ~5-10x less credits vs gemini-3-flash-preview, prompt was tightened to compensate.
      model: 'google/gemini-2.5-flash-lite',
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
