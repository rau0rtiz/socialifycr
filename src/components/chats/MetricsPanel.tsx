import { Skeleton } from '@/components/ui/skeleton';
import { useMsgMetrics } from '@/hooks/use-messaging';

export const MetricsPanel = () => {
  const { data, isLoading } = useMsgMetrics();

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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="agency-card rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{i.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{i.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Solo cuenta conversaciones reales: las simulaciones del laboratorio no aparecen acá. Las citas llegan al instante desde Calendly y se amarran al chat donde se ofreció el enlace.
      </p>
    </div>
  );
};
