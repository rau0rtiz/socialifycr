import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical, Calendar as CalendarIcon, Target } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useUpsertDimension,
  useDeleteDimension,
  type AdFrameworkDimension,
  type AdFrameworkWithDimensions,
} from '@/hooks/use-ad-frameworks';
import { ContentTypeCatalog, FrameworkMetaSection, MoldHeader } from './shared';

export const LaunchBuilder = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const phases = useMemo(
    () => framework.dimensions
      .filter((d) => d.dimension_type === 'phase')
      .sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );

  const upsert = useUpsertDimension();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await upsert.mutateAsync({
      framework_id: framework.id,
      dimension_type: 'phase',
      label: newLabel.trim(),
      position: phases.length,
      metadata: {},
    } as any);
    setNewLabel('');
    setAdding(false);
  };

  return (
    <div className="space-y-6 mt-4">
      <MoldHeader
        framework={framework}
        subtitle="Define cada fase del lanzamiento: nombre, color, descripción, condición de avance y fechas."
      />
      <FrameworkMetaSection framework={framework} />

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="font-semibold text-sm">Fases del lanzamiento</h3>
            <p className="text-xs text-muted-foreground">
              El orden importa: define la secuencia desde el primer mensaje hasta el cierre del carrito.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{phases.length}</span>
        </div>

        <div className="space-y-2">
          {phases.map((p, i) => (
            <PhaseRow key={p.id} dimension={p} indexBadge={`F${i + 1}`} />
          ))}

          {adding ? (
            <Card className="p-2 flex items-center gap-2">
              <Input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAdding(false); setNewLabel(''); }
                }}
                placeholder="Ej: Calentamiento, Apertura de carrito…"
                className="h-8"
              />
              <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim()}>Agregar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewLabel(''); }}>
                Cancelar
              </Button>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1.5 w-full">
              <Plus className="h-3.5 w-3.5" /> Añadir fase
            </Button>
          )}
        </div>
      </div>

      <ContentTypeCatalog
        framework={framework}
        title="Tipos de contenido del lanzamiento"
        hint="Historia puro texto, Anuncio 20s, Correos, Contenido orgánico + CTA, etc."
      />
    </div>
  );
};

const PhaseRow = ({ dimension, indexBadge }: { dimension: AdFrameworkDimension; indexBadge: string }) => {
  const upsert = useUpsertDimension();
  const remove = useDeleteDimension();

  const meta = (dimension.metadata ?? {}) as any;
  const [label, setLabel] = useState(dimension.label);
  const [color, setColor] = useState(dimension.color ?? '#888888');
  const [description, setDescription] = useState<string>(meta.description ?? '');
  const [condition, setCondition] = useState<string>(meta.condition ?? '');
  const [startDate, setStartDate] = useState<string | null>(meta.start_date ?? null);
  const [endDate, setEndDate] = useState<string | null>(meta.end_date ?? null);

  const persist = async (overrides?: Partial<{ label: string; color: string; description: string; condition: string; start_date: string | null; end_date: string | null }>) => {
    const next = {
      label: overrides?.label ?? label,
      color: overrides?.color ?? color,
      description: overrides?.description ?? description,
      condition: overrides?.condition ?? condition,
      start_date: overrides?.start_date !== undefined ? overrides.start_date : startDate,
      end_date: overrides?.end_date !== undefined ? overrides.end_date : endDate,
    };
    await upsert.mutateAsync({
      id: dimension.id,
      framework_id: dimension.framework_id,
      dimension_type: 'phase',
      label: next.label || dimension.label,
      color: next.color || null,
      metadata: {
        ...(dimension.metadata ?? {}),
        description: next.description,
        condition: next.condition,
        start_date: next.start_date,
        end_date: next.end_date,
      },
    } as any);
  };

  return (
    <Card className="p-3 group space-y-2.5">
      {/* Header row: drag, badge, color, name, delete */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] font-bold rounded-full bg-muted px-1.5 py-0.5 shrink-0">
          {indexBadge}
        </span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={() => persist()}
          className="h-7 w-7 rounded border cursor-pointer shrink-0"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => persist()}
          placeholder="Nombre de la fase"
          className="h-8 font-medium"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
          onClick={() => remove.mutate({ id: dimension.id, framework_id: dimension.framework_id })}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Descripción</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => persist()}
          placeholder="¿Qué objetivo tiene esta fase?"
          rows={1}
          className="text-xs resize-none min-h-[32px]"
        />
      </div>

      {/* Condition */}
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Target className="h-3 w-3" /> Condición / criterio de avance
        </Label>
        <Textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          onBlur={() => persist()}
          placeholder="Ej: cuando se hayan publicado 3 historias y enviado 2 correos."
          rows={1}
          className="text-xs resize-none min-h-[32px]"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="Inicio"
          value={startDate}
          onChange={(d) => { setStartDate(d); persist({ start_date: d }); }}
        />
        <DateField
          label="Fin"
          value={endDate}
          onChange={(d) => { setEndDate(d); persist({ end_date: d }); }}
        />
      </div>
    </Card>
  );
};

const DateField = ({
  label, value, onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) => {
  const dateObj = value ? parseISO(value) : undefined;
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('flex-1 justify-start text-left font-normal h-8 text-xs', !value && 'text-muted-foreground')}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {dateObj ? formatDate(dateObj, 'd MMM yyyy', { locale: es }) : 'Sin fecha'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={(d) => onChange(d ? d.toISOString().slice(0, 10) : null)}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
