import { useState } from 'react';
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

/** Lista compacta de próximas citas para el rail del dashboard. */
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
        items.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelected(a)}
            className="w-full rounded-lg bg-background/40 px-2.5 py-2 text-left transition-colors hover:bg-background/70"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-foreground">
                {a.invitee_name || a.routing_answers?.nombre || 'Sin nombre'}
              </span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                {fmtDateTime(a.starts_at, a.timezone)}
              </span>
            </div>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {a.event_name || 'Llamada'}
              {a.host_name ? ` · ${a.host_name}` : ''}
            </p>
          </button>
        ))
      )}
      <AppointmentDetailDialog
        appointment={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </>
  );
};
