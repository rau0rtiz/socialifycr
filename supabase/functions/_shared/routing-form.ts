// Lee las respuestas del formulario de enrutamiento de Calendly y las normaliza.
// Ari comparte socialifycr.com/agendar (el formulario va embebido), así que estas
// respuestas son la mejor pista para amarrar la cita al chat correcto.

export interface Intake {
  nombre?: string | null;
  correo?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  presupuesto?: string | null;
  etapa_negocio?: string | null;
  reto?: string | null;
  cuando_empezar?: string | null;
  invierte_publicidad?: string | null;
  como_nos_conocio?: string | null;
  /** Todas las preguntas y respuestas tal como vinieron. */
  respuestas?: Array<{ question: string; answer: string }>;
  fuente?: string;
  actualizado_en?: string;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** @usuario limpio, sin arroba ni URL. */
export const cleanHandle = (v: string | null | undefined) => {
  if (!v) return null;
  const s = String(v).trim().replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '').replace(/^@/, '');
  const h = s.split(/[/?\s]/)[0].trim();
  return h ? h.toLowerCase() : null;
};

/** Solo dígitos, para comparar teléfonos escritos de mil formas. */
export const digitsOnly = (v: string | null | undefined) =>
  v ? String(v).replace(/\D/g, '') : null;

export const parseAnswers = (qas: Array<{ question?: string; answer?: string }>): Intake => {
  const out: Intake = { respuestas: [] };
  for (const qa of qas ?? []) {
    const q = norm(String(qa?.question ?? ''));
    const a = String(qa?.answer ?? '').trim();
    if (!a) continue;
    out.respuestas!.push({ question: String(qa?.question ?? ''), answer: a });
    if (q.includes('nombre')) out.nombre = a;
    else if (q.includes('correo') || q.includes('email')) out.correo = a;
    else if (q.includes('ig') || q.includes('instagram')) out.instagram = cleanHandle(a);
    else if (q.includes('whatsapp') || q.includes('telefono') || q.includes('numero')) out.whatsapp = a;
    else if (q.includes('presupuesto')) out.presupuesto = a;
    else if (q.includes('etapa')) out.etapa_negocio = a;
    else if (q.includes('reto')) out.reto = a;
    else if (q.includes('empezar') || q.includes('cuando')) out.cuando_empezar = a;
    else if (q.includes('publicidad') || q.includes('invierte')) out.invierte_publicidad = a;
    else if (q.includes('escucho') || q.includes('conocio') || q.includes('como')) out.como_nos_conocio = a;
  }
  out.fuente = 'formulario_enrutamiento';
  out.actualizado_en = new Date().toISOString();
  return out;
};

/** Trae las respuestas del formulario desde Calendly (vía el gateway de Lovable). */
export const fetchRoutingAnswers = async (submissionUri: string): Promise<Intake | null> => {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const calendlyKey = Deno.env.get('CALENDLY_API_KEY');
  if (!lovableKey || !calendlyKey || !submissionUri) return null;
  const id = submissionUri.split('/').pop();
  try {
    const res = await fetch(`https://connector-gateway.lovable.dev/calendly/routing_form_submissions/${id}`, {
      headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': calendlyKey },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`routing form fetch failed [${res.status}]: ${text}`);
      return null;
    }
    const data = JSON.parse(text);
    return parseAnswers(data?.resource?.questions_and_answers ?? []);
  } catch (err) {
    console.error('routing form fetch error', err);
    return null;
  }
};

/** Texto legible para las notas del CRM. */
export const intakeToNotes = (i: Intake) => {
  const lines: string[] = ['— Formulario de agenda —'];
  const add = (label: string, v?: string | null) => { if (v) lines.push(`${label}: ${v}`); };
  add('Nombre', i.nombre);
  add('Correo', i.correo);
  add('Instagram', i.instagram ? `@${i.instagram}` : null);
  add('WhatsApp', i.whatsapp);
  add('Presupuesto mensual', i.presupuesto);
  add('Etapa del negocio', i.etapa_negocio);
  add('Principal reto', i.reto);
  add('Cuándo quiere empezar', i.cuando_empezar);
  add('Invierte en publicidad', i.invierte_publicidad);
  add('Cómo nos conoció', i.como_nos_conocio);
  return lines.join('\n');
};
