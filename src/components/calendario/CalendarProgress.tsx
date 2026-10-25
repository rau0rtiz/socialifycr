import { useEffect, useState } from 'react';
import { Target, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calendarProgress, calendarToday, validCalendarTarget, type ProgressItem } from '@/lib/calendar-progress';
import { cn } from '@/lib/utils';

export function CalendarProgress({ items, month, target, onSave, dense = false }: {
  items: ProgressItem[]; month: string; target: number | null; onSave: (target: number) => Promise<void>; dense?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(target ?? ''));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(String(target ?? '')); setEditing(false); }, [target, month]);
  const p = calendarProgress(items, month, target, calendarToday());
  const pace = p.pace === 'behind' ? (dense ? `Atrasado · faltan ${p.gap}` : `Atrasado · faltan ${p.gap} a esta fecha`) : p.pace === 'on-track' ? 'En línea' : p.pace === 'future' ? 'Próximo mes' : 'Sin meta';
  return <div className={dense ? 'space-y-2' : 'space-y-3'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Target className="h-3.5 w-3.5" />{dense ? 'Meta' : 'Meta mensual'}</span>
      <span className={cn('rounded-full px-2 py-1 text-[11px] font-medium', p.pace === 'behind' ? 'bg-warning/15 text-warning' : p.pace === 'on-track' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{pace}</span>
    </div>
    {editing ? <form className="pointer-events-auto flex items-center gap-2" onSubmit={async (e) => {
      e.preventDefault(); if (!validCalendarTarget(Number(value))) return;
      setSaving(true); try { await onSave(Number(value)); setEditing(false); } catch { /* The parent displays the save error. */ } finally { setSaving(false); }
    }}>
      <Input aria-label="Piezas por mes" type="number" min={1} max={10000} step={1} value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-24" autoFocus />
      <Button type="submit" size="icon" variant="outline" className="h-9 w-9" aria-label="Guardar meta" disabled={saving || !validCalendarTarget(Number(value))}><Check className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label="Cancelar meta" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
    </form> : <div className="flex items-baseline gap-2">
      <span className={dense ? 'text-2xl font-semibold tabular-nums' : 'text-3xl font-semibold tabular-nums'}>{p.scheduled}<span className="text-base font-normal text-muted-foreground"> / {target ?? '—'}</span></span>
      {!dense && <span className="text-xs text-muted-foreground">programadas</span>}
      <Button variant="ghost" size="icon" className="pointer-events-auto ml-auto h-8 w-8" title="Editar meta mensual" aria-label="Editar meta mensual" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
    </div>}
    <div className="grid h-2 grid-cols-[repeat(20,minmax(0,1fr))] gap-0.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Cobertura mensual" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: 20 }, (_, n) => <div key={n} className={cn('h-2', n < Math.ceil(p.percent / 5) ? 'bg-primary' : 'bg-muted')} />)}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><b className="text-success">{p.approved}</b> aprobadas</span><span><b className="text-warning">{p.changes}</b> con cambios</span><span><b className="text-foreground">{p.unscheduled}</b> sin fecha</span>
    </div>
    {target && !dense && <p className="text-[11px] text-muted-foreground">{p.remaining ? `${p.remaining} por programar para cubrir la meta` : 'Meta del mes cubierta'} · {p.expected} previstas a esta fecha</p>}
  </div>;
}