import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  Loader2,
  Mail,
  MessageCircle,
  Instagram,
  ClipboardList,
  User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type RoutingAnswers = {
  nombre?: string;
  correo?: string;
  whatsapp?: string;
  instagram?: string;
  presupuesto?: string;
  etapa_negocio?: string;
  reto?: string;
  cuando_empezar?: string;
  invierte_publicidad?: string;
  como_nos_conocio?: string;
  respuestas?: Array<{ question: string; answer: string }>;
};

export type AgencyAppointment = {
  id: string;
  event_name: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  starts_at: string | null;
  timezone: string | null;
  status: string | null;
  host_name: string | null;
  match_source: string | null;
  match_confidence: string | null;
  conversation_id: string | null;
  routing_answers: RoutingAnswers | null;
};

export const useUpcomingAppointments = () =>
  useQuery({
    queryKey: ['agency-upcoming-appointments'],
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('msg_appointments')
        .select(
          'id, event_name, invitee_name, invitee_email, starts_at, timezone, status, host_name, match_source, match_confidence, conversation_id, routing_answers',
        )
        .gte('starts_at', now)
        .neq('status', 'cancelada')
        .order('starts_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []) as AgencyAppointment[];
    },
  });

const fmtDateTime = (iso: string | null, tz?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-CR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz || 'America/Costa_Rica',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const waLink = (raw?: string | null) => {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
};

const Field = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-foreground">{value}</p>
    </div>
  ) : null;

export const AppointmentDetailDialog = ({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: AgencyAppointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  if (!appointment) return null;
  const ra = appointment.routing_answers || {};
  const wa = waLink(ra.whatsapp);
  const extraAnswers = (ra.respuestas || []).filter(
    (r) => r.question && r.answer,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-primary" />
            {appointment.invitee_name || ra.nombre || 'Cita agendada'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cita */}
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground">
              {appointment.event_name || 'Llamada de descubrimiento'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtDateTime(appointment.starts_at, appointment.timezone)}
              {appointment.host_name ? ` · con ${appointment.host_name}` : ''}
            </p>
            {appointment.status && (
              <span className="mt-2 inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                {appointment.status}
              </span>
            )}
          </div>

          {/* Contacto */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <User className="h-3 w-3" /> Contacto
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Field label="Correo" value={appointment.invitee_email || ra.correo} />
              <Field label="WhatsApp" value={ra.whatsapp} />
              <Field label="Instagram" value={ra.instagram ? `@${ra.instagram}` : null} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {wa && (
                <Button asChild size="sm" className="gap-1.5">
                  <a href={wa} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </Button>
              )}
              {(appointment.invitee_email || ra.correo) && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`mailto:${appointment.invitee_email || ra.correo}`}>
                    <Mail className="h-3.5 w-3.5" /> Correo
                  </a>
                </Button>
              )}
              {ra.instagram && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a
                    href={`https://instagram.com/${ra.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Instagram className="h-3.5 w-3.5" /> @{ra.instagram}
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Formulario de enrutamiento */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <ClipboardList className="h-3 w-3" /> Formulario de enrutamiento
            </p>
            {extraAnswers.length === 0 &&
            !ra.presupuesto &&
            !ra.etapa_negocio ? (
              <p className="rounded-lg bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                Sin respuestas del formulario para esta cita.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <Field label="Presupuesto mensual" value={ra.presupuesto} />
                <Field label="Etapa del negocio" value={ra.etapa_negocio} />
                <Field label="Reto principal" value={ra.reto} />
                <Field label="Cuándo empezar" value={ra.cuando_empezar} />
                <Field label="Invierte en publicidad" value={ra.invierte_publicidad} />
                <Field label="Cómo nos conoció" value={ra.como_nos_conocio} />
                {extraAnswers
                  .filter(
                    (r) =>
                      ![
                        'Nombre',
                        'Correo electrónico',
                        'Número de WhatsApp',
                        'Usuario de IG del Negocio',
                        '¿Cuál es su rango de presupuesto mensual para invertir en mercadeo?',
                        '¿En qué etapa se encuentra su negocio?',
                        '¿Cuál es su principal reto actualmente?',
                        '¿Cuándo le gustaría empezar a trabajar con una agencia?',
                        '¿Actualmente invierte en publicidad?',
                        '¿Cómo escucho sobre nosotros?',
                      ].includes(r.question),
                  )
                  .map((r, i) => (
                    <Field key={i} label={r.question} value={r.answer} />
                  ))}
              </div>
            )}
          </div>

          {appointment.match_source && (
            <p className="text-[10px] text-muted-foreground">
              Vinculada al chat por {appointment.match_source}
              {appointment.match_confidence
                ? ` (confianza ${appointment.match_confidence})`
                : ''}
              .
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const monthDay = (iso: string | null, tz?: string | null) => {
  if (!iso) return { month: '—', day: '' };
  try {
    const d = new Date(iso);
    return {
      month: new Intl.DateTimeFormat('es-CR', {
        month: 'short',
        timeZone: tz || 'America/Costa_Rica',
      }).format(d).replace('.', '').toUpperCase(),
      day: new Intl.DateTimeFormat('es-CR', {
        day: '2-digit',
        timeZone: tz || 'America/Costa_Rica',
      }).format(d),
    };
  } catch {
    return { month: '—', day: '' };
  }
};

const fmtTime = (iso: string | null, tz?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz || 'America/Costa_Rica',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const Chip = ({ label }: { label: string }) => (
  <span className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
    {label}
  </span>
);

const confidenceLabel = (raw?: string | null) => {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes('alta') || v.includes('high')) return 'Match alto';
  if (v.includes('media') || v.includes('med')) return 'Match medio';
  if (v.includes('baja') || v.includes('low')) return 'Match bajo';
  return `Match ${raw}`;
};

/** Lista visual de próximas citas para el rail del dashboard. */
export const UpcomingAppointmentsList = ({ limit = 5 }: { limit?: number }) => {
  const { data, isLoading } = useUpcomingAppointments();
  const [selected, setSelected] = useState<AgencyAppointment | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = (data || []).slice(0, limit);

  return (
    <>
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Sin citas próximas
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const ra = a.routing_answers || {};
            const md = monthDay(a.starts_at, a.timezone);
            const host = a.host_name || '';
            const conf = confidenceLabel(a.match_confidence);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                className="w-full rounded-xl border border-border bg-background/40 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background/70"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-background/60">
                    <span className="text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-primary">
                      {md.month}
                    </span>
                    <span className="font-display mt-1 text-base font-bold leading-none text-foreground">
                      {md.day}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-semibold text-foreground">
                        {a.invitee_name || ra.nombre || 'Sin nombre'}
                      </p>
                      {conf && (
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-primary">
                          {conf}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {fmtTime(a.starts_at, a.timezone)}
                      {` · ${a.event_name || 'Llamada'}`}
                    </p>
                    {host && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[7px] font-bold text-primary">
                          {initialsOf(host)}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          con {host}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {(ra.presupuesto || ra.etapa_negocio) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {ra.presupuesto && <Chip label={ra.presupuesto} />}
                    {ra.etapa_negocio && <Chip label={ra.etapa_negocio} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      <Link
        to="/agencia/chats"
        className="block rounded-lg border border-border bg-background/40 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        Ver toda la agenda
      </Link>
      <AppointmentDetailDialog
        appointment={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </>
  );
};
