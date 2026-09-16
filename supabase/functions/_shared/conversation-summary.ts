// Resumen rodante del historial: Ari lee los últimos mensajes completos y un
// resumen generado del resto, que se guarda en msg_conversations y se va
// actualizando solo con los mensajes nuevos.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SETTER_MODEL, type HistoryMessage } from './setter-agent.ts';

const RECENT_FULL = 6; // últimos mensajes que Ari lee completos
const MIN_FOR_SUMMARY = 10; // debajo de esto no vale la pena resumir

export type RollingContext = { summary: string | null; history: HistoryMessage[] };

async function updateSummary(
  lovableKey: string,
  previous: string | null,
  fresh: HistoryMessage[],
): Promise<string> {
  const lines = fresh
    .map((m) => `${m.author === 'externo' ? 'contacto' : m.author}: ${(m.body ?? '').slice(0, 500)}`)
    .join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Lovable-API-Key': lovableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: SETTER_MODEL,
      reasoning_effort: 'low',
      max_completion_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Sos el asistente que mantiene el resumen de contexto de una conversación de ventas por Instagram DM. ' +
            'Actualizá el resumen con los mensajes nuevos. Máximo 120 palabras, en español, viñetas cortas. ' +
            'Conservá: quién es la persona y a qué se dedica, qué busca, datos que compartió (correo, teléfono, presupuesto), ' +
            'qué se le ofreció, precios mencionados, si se envió el enlace de agendar, citas o acuerdos, objeciones y en qué quedó la conversación. ' +
            'Descartá saludos y relleno. Devolvé solo el resumen, sin títulos ni introducción.',
        },
        {
          role: 'user',
          content: `${previous ? `RESUMEN ANTERIOR:\n${previous}\n\n` : ''}MENSAJES NUEVOS A INCORPORAR:\n${lines}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`summary ${res.status}`);
  const data = await res.json();
  const text = (data?.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('summary vacío');
  return text.slice(0, 2000);
}

// Devuelve el historial efectivo para el modelo: resumen + últimos mensajes.
// Si la conversación es corta, devuelve todo sin resumir. Si la generación del
// resumen falla y no había uno guardado, cae al historial completo.
export async function buildRollingContext(
  admin: SupabaseClient,
  lovableKey: string,
  conversationId: string,
  fullHistory: HistoryMessage[],
  storedSummary: string | null,
  summaryAt: string | null,
): Promise<RollingContext> {
  if (fullHistory.length <= MIN_FOR_SUMMARY) return { summary: null, history: fullHistory };

  const recent = fullHistory.slice(-RECENT_FULL);
  const older = fullHistory.slice(0, -RECENT_FULL);
  const fresh = summaryAt ? older.filter((m) => m.occurred_at && m.occurred_at > summaryAt) : older;

  let summary = storedSummary;
  if (fresh.length) {
    try {
      summary = await updateSummary(lovableKey, storedSummary, fresh);
      const lastCovered = older[older.length - 1]?.occurred_at ?? new Date().toISOString();
      await admin
        .from('msg_conversations')
        .update({ context_summary: summary, context_summary_at: lastCovered })
        .eq('id', conversationId);
    } catch {
      if (!summary) return { summary: null, history: fullHistory }; // no perder contexto
    }
  }
  return { summary, history: recent };
}
