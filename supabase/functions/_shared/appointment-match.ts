// Cruce de una cita de Calendly contra los chats donde se ofreció el enlace de agenda.
// Se usa el mismo modelo que Ari cuando la coincidencia no es obvia.

const MATCH_MODEL = 'openai/gpt-6-astra';

export interface OfferCandidate {
  offer_id: string;
  conversation_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_username: string | null;
  contact_email?: string | null;
  offered_at: string;
  last_messages: string[];
}

export interface Invitee {
  name: string | null;
  email: string | null;
  starts_at: string | null;
  event_name: string | null;
  host_name: string | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Coincidencia determinística por nombre: comparte nombre y apellido, o el nombre completo. */
export function nameScore(invitee: string | null, contact: string | null): number {
  if (!invitee || !contact) return 0;
  const a = norm(invitee);
  const b = norm(contact);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const at = new Set(a.split(' ').filter((t) => t.length > 2));
  const bt = b.split(' ').filter((t) => t.length > 2);
  const shared = bt.filter((t) => at.has(t)).length;
  if (shared >= 2) return 0.9;
  if (shared === 1) return 0.5;
  return 0;
}

/** Pide al modelo de Ari confirmar cuál chat corresponde a la cita. */
export async function askModelForMatch(
  lovableKey: string,
  invitee: Invitee,
  candidates: OfferCandidate[],
): Promise<{ conversation_id: string | null; confidence: 'alta' | 'media' | 'baja'; reason: string } | null> {
  const list = candidates
    .map(
      (c, i) =>
        `#${i + 1} conversation_id=${c.conversation_id}
  contacto: ${c.contact_name ?? '(sin nombre)'} (@${c.contact_username ?? '?'})
  enlace ofrecido: ${c.offered_at}
  últimos mensajes: ${c.last_messages.join(' | ') || '(sin mensajes)'}`,
    )
    .join('\n\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Lovable-API-Key': lovableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MATCH_MODEL,
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content: `Trabajás para Socialify. Recibís una cita agendada en Calendly y una lista de conversaciones de Instagram donde se compartió el enlace de agenda (socialifycr.com/agendar). Decidí si la cita corresponde a alguna de esas conversaciones.
Criterios: el nombre o correo del invitado coincide con el contacto, el horario acordado en el chat coincide con el de la cita, o el chat pidió agendar poco antes de la cita.
Si ninguna conversación coincide de forma razonable, devolvé conversation_id vacío. No inventes coincidencias: preferí confidence baja antes que forzar un cruce.`,
        },
        {
          role: 'user',
          content: `CITA
invitado: ${invitee.name ?? '(sin nombre)'}
correo: ${invitee.email ?? '(sin correo)'}
inicia: ${invitee.starts_at ?? '(sin fecha)'}
evento: ${invitee.event_name ?? '?'}
atiende: ${invitee.host_name ?? '?'}

CONVERSACIONES CANDIDATAS
${list}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'appointment_match',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['conversation_id', 'confidence', 'reason'],
            properties: {
              conversation_id: { type: 'string', description: 'id de la conversación o cadena vacía' },
              confidence: { type: 'string', enum: ['alta', 'media', 'baja'] },
              reason: { type: 'string' },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error('appointment-match model error', res.status, (await res.text()).slice(0, 400));
    return null;
  }
  const payload = await res.json().catch(() => null);
  const content = payload?.choices?.[0]?.message?.content;
  let parsed: any = null;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.reason !== 'string') return null;
  const id = typeof parsed.conversation_id === 'string' && parsed.conversation_id.trim() ? parsed.conversation_id.trim() : null;
  const valid = id && candidates.some((c) => c.conversation_id === id) ? id : null;
  return {
    conversation_id: valid,
    confidence: ['alta', 'media', 'baja'].includes(parsed.confidence) ? parsed.confidence : 'baja',
    reason: parsed.reason.slice(0, 400),
  };
}
