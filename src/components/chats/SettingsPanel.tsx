import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import {
  useDeleteOffer,
  useMsgKnowledge,
  useMsgOffers,
  useMsgSettings,
  usePublishKnowledge,
  useSaveKnowledgeDraft,
  useSaveOffer,
  useUpdateMsgSettings,
  type BotMode,
  type OfferInput,
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
  const publish = usePublishKnowledge();
  const saveDraft = useSaveKnowledgeDraft();
  const saveOffer = useSaveOffer();
  const deleteOffer = useDeleteOffer();
  const [offerForm, setOfferForm] = useState<OfferInput | null>(null);
  const { canManage } = useUserRole();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState('');
  const [tone, setTone] = useState('');
  const [rules, setRules] = useState('');

  const latest = knowledge?.[0];
  const currentRules = Array.isArray(latest?.rules) ? (latest.rules as string[]) : [];

  const startEditing = () => {
    setManual(latest?.manual ?? '');
    setTone(latest?.tone_notes ?? '');
    setRules(currentRules.join('\n'));
    setEditing(true);
  };

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Catálogo de precios</p>
            <p className="text-xs text-muted-foreground">
              Solo los precios publicados se le entregan al setter. Los pendientes esperan tu aprobación.
            </p>
          </div>
          {canManage && !offerForm && (
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setOfferForm({ label: '', currency: 'USD', status: 'pendiente' })}>
              <Plus className="h-3.5 w-3.5" /> Agregar
            </Button>
          )}
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
                {canManage && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setOfferForm({
                          id: o.id,
                          label: o.label,
                          detail: o.detail ?? '',
                          price: o.price,
                          currency: o.currency,
                          tax_note: o.tax_note ?? '',
                          status: o.status as OfferInput['status'],
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      disabled={deleteOffer.isPending}
                      onClick={() =>
                        deleteOffer.mutate(o.id, {
                          onSuccess: () => toast({ title: 'Precio eliminado' }),
                          onError: (e) => toast({ title: 'No se pudo eliminar', description: (e as Error).message, variant: 'destructive' }),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {offerForm && (
          <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={offerForm.label}
                  onChange={(e) => setOfferForm({ ...offerForm, label: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="Acompañamiento de marketing"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Detalle</Label>
                <Input
                  value={offerForm.detail ?? ''}
                  onChange={(e) => setOfferForm({ ...offerForm, detail: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="Alcance según propuesta aprobada"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Monto</Label>
                <Input
                  type="number"
                  value={offerForm.price ?? ''}
                  onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value === '' ? null : Number(e.target.value) })}
                  className="h-9 text-xs"
                  placeholder="1200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moneda</Label>
                <Input
                  value={offerForm.currency ?? 'USD'}
                  onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nota de impuestos</Label>
                <Input
                  value={offerForm.tax_note ?? ''}
                  onChange={(e) => setOfferForm({ ...offerForm, tax_note: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="+ IVA"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={offerForm.status ?? 'pendiente'}
                  onValueChange={(v) => setOfferForm({ ...offerForm, status: v as OfferInput['status'] })}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="historico">Histórico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={saveOffer.isPending || !offerForm.label.trim()}
                onClick={() =>
                  saveOffer.mutate(
                    {
                      ...offerForm,
                      label: offerForm.label.trim(),
                      detail: offerForm.detail?.trim() || null,
                      tax_note: offerForm.tax_note?.trim() || null,
                      currency: (offerForm.currency || 'USD').trim().toUpperCase(),
                    },
                    {
                      onSuccess: () => {
                        setOfferForm(null);
                        toast({ title: 'Catálogo actualizado', description: 'Los borradores anteriores quedan obsoletos si cambiaste precios publicados.' });
                      },
                      onError: (e) => toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
                    },
                  )
                }
              >
                Guardar
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setOfferForm(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {!canManage && (
          <p className="text-[11px] text-amber-300">Solo el dueño o un administrador puede cambiar los precios.</p>
        )}
      </div>

      <div className="agency-card space-y-3 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Manual comercial</p>
            <p className="text-xs text-muted-foreground">Versión {latest?.version ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={latest?.is_published ? offerBadge('publicado') : offerBadge('pendiente')}>
              {latest?.is_published ? 'Publicado' : 'Borrador'}
            </Badge>
            {canManage && !editing && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEditing}>
                Editar
              </Button>
            )}
            {canManage && latest && !latest.is_published && !editing && (
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={publish.isPending}
                onClick={() =>
                  publish.mutate(latest.version, {
                    onSuccess: () => toast({ title: 'Manual publicado', description: 'El setter ya puede usarlo en conversaciones reales.' }),
                    onError: (e) => toast({ title: 'No se pudo publicar', description: (e as Error).message, variant: 'destructive' }),
                  })
                }
              >
                Publicar
              </Button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          En conversaciones reales el setter solo usa una versión publicada. En el laboratorio podés probar el borrador.
        </p>

        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Manual (cómo vende Socialify)</Label>
              <Textarea
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="min-h-[240px] font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas de tono</Label>
              <Textarea
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="min-h-[70px] text-xs"
                placeholder="Voseo costarricense, cálido y directo."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reglas de conversación (una por línea)</Label>
              <Textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="min-h-[140px] text-xs"
                placeholder="El precio solo se menciona si preguntan textualmente por precio."
              />
              <p className="text-[11px] text-muted-foreground">
                Cada línea se le entrega al setter como regla obligatoria.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={saveDraft.isPending || !manual.trim()}
                onClick={() =>
                  saveDraft.mutate(
                    {
                      manual,
                      toneNotes: tone.trim(),
                      rules: rules.split('\n').map((r) => r.trim()).filter(Boolean),
                    },
                    {
                      onSuccess: (version) => {
                        setEditing(false);
                        toast({
                          title: `Versión ${version} guardada en borrador`,
                          description: 'Probala en el Laboratorio y después publicala.',
                        });
                      },
                      onError: (e) =>
                        toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }),
                    },
                  )
                }
              >
                Guardar como borrador
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
{latest?.manual ?? 'Sin manual cargado.'}
            </pre>
            {!!currentRules.length && (
              <div className="space-y-1 rounded-xl border border-border/40 bg-background/40 p-4">
                <p className="text-xs font-semibold text-foreground">Reglas de conversación</p>
                <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                  {currentRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
