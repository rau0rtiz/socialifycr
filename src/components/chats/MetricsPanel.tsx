import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarClock } from 'lucide-react';
import { useMsgMetrics, useRecentAppointments } from '@/hooks/use-messaging';

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sin fecha';

export const MetricsPanel = () => {
  const { data, isLoading } = useMsgMetrics();
  const { data: appts, isLoading: loadingAppts } = useRecentAppointments();

  if (isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const items = [
    { label: 'Conversaciones', value: data?.conversaciones ?? 0 },
    { label: 'Calificados', value: data?.calificados ?? 0 },
    { label: 'Enlaces de Calendly ofrecidos', value: data?.enlacesOfrecidos ?? 0 },
    { label: 'Citas agendadas', value: data?.citasAgendadas ?? 0 },
    { label: 'Conversión enlace → cita', value: `${data?.tasaConversion ?? 0}%` },
    { label: 'Citas vinculadas a un chat', value: data?.citasVinculadas ?? 0 },
    { label: 'Cancelaciones', value: data?.cancelaciones ?? 0 },
    { label: 'Atención humana', value: data?.atencionHumana ?? 0 },
    { label: 'Respuestas de IA', value: data?.ejecucionesIA ?? 0 },
    { label: 'Fallos', value: data?.fallos ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="agency-card rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{i.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{i.value}</p>
          </div>
        ))}
      </div>

      <div className="agency-card rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Últimas citas de Calendly</h3>
        </div>
        {loadingAppts ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : !appts?.length ? (
          <p className="text-xs text-muted-foreground">
            Todavía no ha entrado ninguna cita. Cuando alguien agende desde el formulario, aparece acá en segundos.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {appts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.invitee_name || a.invitee_email || 'Sin nombre'}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{fmt(a.starts_at)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.event_name ?? 'Cita'}
                    {a.host_name ? ` · Atiende: ${a.host_name}` : ''}
                    {a.invitee_email ? ` · ${a.invitee_email}` : ''}
                  </p>
                </div>
                {a.status === 'cancelada' ? (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">Cancelada</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">Activa</Badge>
                )}
                {a.conversation_id ? (
                  <Badge variant="secondary">Amarrada a un chat</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Sin chat</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Solo cuenta conversaciones reales: las simulaciones del laboratorio no aparecen acá. Las citas llegan al instante desde Calendly y se amarran al chat donde se compartió el enlace de agendar.
      </p>
    </div>
  );
};
