import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  useUpsertDimension,
  useDeleteDimension,
  useUpdateAdFramework,
  type AdFrameworkWithDimensions,
  type AdFrameworkDimension,
  type DimensionType,
} from '@/hooks/use-ad-frameworks';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const DIMENSION_LABELS: Record<DimensionType, { title: string; hint: string }> = {
  angle: { title: 'Ángulos', hint: 'El enfoque emocional / argumental del mensaje' },
  format: { title: 'Formatos', hint: 'Cómo se presenta visualmente el anuncio' },
  hook: { title: 'Hooks', hint: 'La línea de apertura que captura la atención' },
};

interface Props {
  framework: AdFrameworkWithDimensions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FrameworkBuilder = ({ framework, open, onOpenChange }: Props) => {
  const updateFw = useUpdateAdFramework();
  const [name, setName] = useState(framework.name);
  const [description, setDescription] = useState(framework.description ?? '');

  const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = framework.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = framework.dimensions.filter((d) => d.dimension_type === 'hook');
  const total = angles.length * formats.length * hooks.length;

  const handleSaveMeta = async () => {
    if (name !== framework.name || description !== (framework.description ?? '')) {
      await updateFw.mutateAsync({ id: framework.id, name, description: description || null });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleSaveMeta(); onOpenChange(o); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar framework</SheetTitle>
          <SheetDescription>
            Define los valores de cada dimensión. Total actual: <span className="font-mono font-semibold text-foreground">{angles.length} × {formats.length} × {hooks.length} = {total} variantes</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-3 pb-4 border-b">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Nombre del framework</Label>
              <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSaveMeta} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-desc">Descripción</Label>
              <Textarea id="b-desc" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={handleSaveMeta} rows={2} />
            </div>
          </div>

          {(['angle', 'format', 'hook'] as DimensionType[]).map((type) => (
            <DimensionSection
              key={type}
              type={type}
              frameworkId={framework.id}
              items={framework.dimensions.filter((d) => d.dimension_type === type)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const DimensionSection = ({ type, frameworkId, items }: { type: DimensionType; frameworkId: string; items: AdFrameworkDimension[] }) => {
  const upsert = useUpsertDimension();
  const remove = useDeleteDimension();
  const meta = DIMENSION_LABELS[type];
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await upsert.mutateAsync({
      framework_id: frameworkId,
      dimension_type: type,
      label: newLabel.trim(),
      position: items.length,
    });
    setNewLabel('');
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-semibold text-sm">{meta.title}</h3>
          <p className="text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((d) => (
          <DimensionRow key={d.id} dimension={d} type={type} />
        ))}
        {adding ? (
          <Card className="p-2 flex items-center gap-2">
            <Input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewLabel(''); } }}
              placeholder={`Nuevo ${meta.title.slice(0, -1).toLowerCase()}...`}
              className="h-8"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim()}>Agregar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewLabel(''); }}>Cancelar</Button>
          </Card>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1.5 w-full">
            <Plus className="h-3.5 w-3.5" /> Agregar {meta.title.slice(0, -1).toLowerCase()}
          </Button>
        )}
      </div>
    </div>
  );
};

const DimensionRow = ({ dimension, type }: { dimension: AdFrameworkDimension; type: DimensionType }) => {
  const upsert = useUpsertDimension();
  const remove = useDeleteDimension();
  const [label, setLabel] = useState(dimension.label);
  const [color, setColor] = useState(dimension.color ?? '');

  const handleBlur = async () => {
    if (label !== dimension.label || color !== (dimension.color ?? '')) {
      await upsert.mutateAsync({
        id: dimension.id,
        framework_id: dimension.framework_id,
        dimension_type: type,
        label: label || dimension.label,
        color: color || null,
      });
    }
  };

  return (
    <Card className="p-2 flex items-center gap-2 group">
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      {type === 'angle' && (
        <input
          type="color"
          value={color || '#888888'}
          onChange={(e) => setColor(e.target.value)}
          onBlur={handleBlur}
          className="h-6 w-6 rounded border cursor-pointer shrink-0"
        />
      )}
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleBlur}
        className="h-8 border-0 shadow-none focus-visible:ring-1 px-2"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
        onClick={() => remove.mutate({ id: dimension.id, framework_id: dimension.framework_id })}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
};
