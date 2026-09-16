import { Instagram, MessageCircle, CalendarClock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannelConnections, type ConnStatus } from '@/hooks/use-messaging';

const STATUS_LABEL: Record<ConnStatus, string> = {
  pendiente: 'Pendiente',
  configurando: 'Configurando',
  conectado: 'Conectado',
  error: 'Error',
  desconectado: 'Desconectado',
};

const statusClass = (s: ConnStatus) =>
  s === 'conectado'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : s === 'error'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : s === 'configurando'
        ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-300';

export const ConnectionsPanel = () => {
  const { data: connections, isLoading } = useChannelConnections();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const instagram = connections?.find((c) => c.channel === 'instagram');
  const whatsapp = connections?.find((c) => c.channel === 'whatsapp');

  return (
    <div className="space-y-4">
      <div className="agency-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Instagram className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Instagram · DMs entrantes</p>
              <p className="text-xs text-muted-foreground">{instagram?.account_label ?? 'Cuenta profesional'}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusClass((instagram?.status ?? 'pendiente') as ConnStatus)}>
            {STATUS_LABEL[(instagram?.status ?? 'pendiente') as ConnStatus]}
          </Badge>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground space-y-2">
          <p className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Todavía no hay conexión real. Para habilitarla necesito de tu lado:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Una app de Meta con la cuenta profesional de Instagram autorizada.</li>
            <li>Confirmar la ruta de autenticación (Instagram Login) y los permisos de mensajería.</li>
            <li>Que yo publique la URL de callback y el webhook de este proyecto, y vos los pegués en Meta.</li>
            <li>Guardar el identificador y el secreto de la app en el almacén seguro del backend (nunca en el chat).</li>
            <li>Verificación del negocio y URLs de privacidad y eliminación de datos que Meta exija.</li>
          </ol>
          <p>Te doy los valores exactos cuando implementemos la fase 2. Hasta validar la conexión, este canal queda en “Pendiente”.</p>
        </div>
      </div>

      <div className="agency-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Calendly · confirmación de citas</p>
              <p className="text-xs text-muted-foreground">https://socialifycr.com/agendar</p>
            </div>
          </div>
          <Badge variant="outline" className={statusClass('pendiente')}>Pendiente</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Fase 4. Requiere revisar el plan de Calendly, permisos de webhooks y un identificador de atribución que sobreviva el
          recorrido. Mientras no haya coincidencia comprobable, las reservas se registran sin vincular para revisión manual.
        </p>
      </div>

      <div className="agency-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">WhatsApp Business</p>
              <p className="text-xs text-muted-foreground">{whatsapp?.account_label ?? 'Sin número asignado'}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-border/50 bg-background/40 text-muted-foreground">
            Disponible en una próxima fase
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          La estructura ya soporta el canal, pero no se solicita credencial ni se migra el número en esta versión.
        </p>
      </div>
    </div>
  );
};
