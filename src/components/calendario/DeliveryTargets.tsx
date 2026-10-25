import { useEffect, useState } from 'react';
import { Check, Loader2, Package, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DELIVERY_TYPES, deliveryProgress, validDeliveryTarget, type TargetRow, type TypeProgressItem } from '@/lib/calendar-targets';
import { calendarToday } from '@/lib/calendar-progress';
import { cn } from '@/lib/utils';

/** Per-type fixed monthly deliveries for a client: progress rows + edit dialog. */
export function DeliveryTargets({ items, month, targets, onSave, dense = false }: {
  items: TypeProgressItem[];
  month: string;
  targets: TargetRow[];
  onSave: (rows: { content_type: string; monthly_target: number }[]) => Promise<void>;
  dense?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const p = deliveryProgress(items, month, targets, calendarToday());
  const paceLabel = p.pace === 'behind'
    ? (dense ? `Atrasado · faltan ${p.totalGap}` : `Atrasado · faltan ${p.totalGap} a esta fecha`)
    : p.pace === 'on-track' ? 'En línea' : p.pace === 'future' ? 'Próximo mes' : 'Sin entregas definidas';

  return (
    <div className={dense ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Package className="h-3.5 w-3.5" />{dense ? 'Entregas' : 'Entregas mensuales fijas'}
        </span>
        <span className={cn(
          'rounded-full px-2 py-1 text-[11px] font-medium',
          p.pace === 'behind' ? 'bg-warning/15 text-warning' : p.pace === 'on-track' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
        )}>{paceLabel}</span>
      </div>

      {p.types.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
        >
          <Pencil className="h-3 w-3" /> Definir entregas del cliente
        </button>
      ) : (
        <div className="space-y-1.5">
          {p.types.map((t) => {
            const pct = t.target ? Math.min(100, Math.round((t.scheduled / t.target) * 100)) : 0;
            return (
              <div key={t.type.value} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span aria-hidden>{t.type.icon}</span>{t.type.plural}
                  </span>
                  <span className="tabular-nums">
                    <b className={cn(t.pace === 'behind' ? 'text-warning' : 'text-foreground')}>{t.scheduled}</b>
                    <span className="text-muted-foreground"> / {t.target}</span>
                    {t.pace === 'behind' && <span className="ml-1 text-[10px] text-warning">−{t.gap}</span>}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${t.type.plural} del mes`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-full', t.pace === 'behind' ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-muted-foreground">
              Total {p.totalScheduled} / {p.totalTarget} piezas
            </span>
            <Button variant="ghost" size="icon" className="pointer-events-auto h-7 w-7" title="Editar entregas" aria-label="Editar entregas mensuales" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <TargetsDialog open={editing} onClose={() => setEditing(false)} targets={targets} onSave={onSave} />
    </div>
  );
}

function TargetsDialog({ open, onClose, targets, onSave }: {
  open: boolean;
  onClose: () => void;
  targets: TargetRow[];
  onSave: (rows: { content_type: string; monthly_target: number }[]) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const map: Record<string, string> = {};
    for (const t of DELIVERY_TYPES) map[t.value] = String(targets.find((r) => r.content_type === t.value)?.monthly_target ?? 0);
    setValues(map);
    setError(null);
  }, [open, targets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = DELIVERY_TYPES.map((t) => ({ content_type: t.value, monthly_target: Number(values[t.value] || 0) }));
    if (rows.some((r) => !validDeliveryTarget(r.monthly_target))) return setError('Usá números enteros entre 0 y 10000.');
    if (rows.every((r) => r.monthly_target === 0)) return setError('Definí al menos una entrega mayor a cero.');
    setSaving(true);
    try {
      await onSave(rows.filter((r) => r.monthly_target > 0));
      onClose();
    } catch {
      setError('No se pudieron guardar las entregas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Entregas mensuales fijas</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Lo pactado con el cliente cada mes. El avance del calendario se mide contra estos números.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                <span aria-hidden>{t.icon}</span>
                <span className="flex-1 text-xs font-medium">{t.plural}</span>
                <Input
                  type="number" min={0} max={10000} step={1}
                  aria-label={`${t.plural} por mes`}
                  className="h-8 w-16 text-right tabular-nums"
                  value={values[t.value] ?? '0'}
                  onChange={(e) => setValues({ ...values, [t.value]: e.target.value })}
                />
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}><X className="mr-1 h-4 w-4" />Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
