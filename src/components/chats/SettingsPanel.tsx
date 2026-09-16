import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import {
  useMsgKnowledge,
  useMsgOffers,
  useMsgSettings,
  useUpdateMsgSettings,
  type BotMode,
} from '@/hooks/use-messaging';

const offerBadge = (status: string) =>
  status === 'publicado'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : status === 'pendiente'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-border/50 bg-background/40 text-muted-foreground';

export const SettingsPanel = () => {
  const { data: settings, isLoading } = useMsgSettings();
  const { data: offers } = useMsgOffers();
  const { data: knowledge } = useMsgKnowledge();
  const update = useUpdateMsgSettings();
  const { canManage } = useUserRole();
  const { toast } = useToast();

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onError: (e) => toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
    });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="agency-card space-y-4 rounded-2xl p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Modo de operación</p>
          <p className="text-xs text-muted-foreground">El bot arranca en borrador. Nada sale sin que alguien lo apruebe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Modo del bot</Label>
            <Select
              value={settings?.bot_mode ?? 'borrador'}
              disabled={!canManage}
              onValueChange={(v) => save({ bot_mode: v as BotMode })}
            >
              <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apagado">Apagado</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={!!settings?.auto_send_enabled}
              disabled={!canManage}
              onCheckedChange={(v) => save({ auto_send_enabled: v })}
            />
            <div>
              <Label className="text-xs">Envíos automáticos</Label>
              <p className="text-[11px] text-muted-foreground">Apagado hasta terminar las pruebas críticas.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={!!settings?.followups_enabled}
              disabled={!canManage}
              onCheckedChange={(v) => save({ followups_enabled: v })}
            />
            <div>
              <Label className="text-xs">Seguimientos</Label>
              <p className="text-[11px] text-muted-foreground">
                Un recordatorio tras {settings?.followup_delay_hours ?? 4} h de silencio, sin activar.
              </p>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Zona horaria: {settings?.timezone} · Agenda: {settings?.booking_url}
        </p>
        {!canManage && (
          <p className="text-[11px] text-amber-300">Solo el dueño o un administrador puede cambiar estos controles.</p>
        )}
      </div>

      <div className="agency-card space-y-3 rounded-2xl p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Catálogo de precios</p>
          <p className="text-xs text-muted-foreground">
            Solo los precios publicados se le entregan al setter. Los pendientes esperan tu aprobación.
          </p>
        </div>
        <div className="space-y-2">
          {(offers ?? []).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{o.label}</p>
                {o.detail && <p className="text-[11px] text-muted-foreground">{o.detail}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">
                  {o.price ? `$${Number(o.price).toLocaleString('en-US')} ${o.currency}` : 'Sin importe'}
                  {o.tax_note ? ` ${o.tax_note}` : ''}
                </span>
                <Badge variant="outline" className={offerBadge(o.status)}>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="agency-card space-y-3 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Manual comercial</p>
            <p className="text-xs text-muted-foreground">Versión {knowledge?.[0]?.version ?? '—'}</p>
          </div>
          <Badge variant="outline" className={knowledge?.[0]?.is_published ? offerBadge('publicado') : offerBadge('pendiente')}>
            {knowledge?.[0]?.is_published ? 'Publicado' : 'Borrador'}
          </Badge>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
{knowledge?.[0]?.manual ?? 'Sin manual cargado.'}
        </pre>
      </div>
    </div>
  );
};
