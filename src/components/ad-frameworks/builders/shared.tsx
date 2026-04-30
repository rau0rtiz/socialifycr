import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  useUpsertDimension,
  useDeleteDimension,
  useUpdateAdFramework,
  type AdFrameworkDimension,
  type AdFrameworkWithDimensions,
  type DimensionType,
} from '@/hooks/use-ad-frameworks';
import { getMold } from '@/lib/framework-molds';

export const FrameworkMetaSection = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const updateFw = useUpdateAdFramework();
  const [name, setName] = useState(framework.name);
  const [description, setDescription] = useState(framework.description ?? '');

  const handleSave = async () => {
    if (name !== framework.name || description !== (framework.description ?? '')) {
      await updateFw.mutateAsync({ id: framework.id, name, description: description || null });
    }
  };

  return (
    <div className="space-y-3 pb-4 border-b">
      <div className="space-y-1.5">
        <Label htmlFor="b-name">Nombre del framework</Label>
        <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-desc">Descripción</Label>
        <Textarea id="b-desc" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={handleSave} rows={2} />
      </div>
    </div>
  );
};

export const MoldHeader = ({ framework, subtitle }: { framework: AdFrameworkWithDimensions; subtitle: string }) => {
  const mold = getMold(framework.template_kind);
  if (!mold) return null;
  const Icon = mold.icon;
  return (
    <div className="flex items-start gap-3 mb-1">
      <div
        className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `hsl(${mold.accentColor} / 0.15)`, color: `hsl(${mold.accentColor})` }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm">Configurando: {mold.name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * Generic editable list for a flat dimension (e.g. content_type).
 */
export const ContentTypeCatalog = ({
  framework,
  title = 'Catálogo de tipos de contenido',
  hint = 'Los formatos que tu equipo puede producir (Reel, Foto, Carrusel, Correo…).',
}: {
  framework: AdFrameworkWithDimensions;
  title?: string;
  hint?: string;
}) => {
  const items = framework.dimensions
    .filter((d) => d.dimension_type === 'content_type')
    .sort((a, b) => a.position - b.position);
  return (
    <DimensionList
      framework={framework}
      type="content_type"
      items={items}
      title={title}
      hint={hint}
      addLabel="Añadir tipo"
      withColor={false}
    />
  );
};

interface DimensionListProps {
  framework: AdFrameworkWithDimensions;
  type: DimensionType;
  items: AdFrameworkDimension[];
  title: string;
  hint?: string;
  addLabel: string;
  withColor?: boolean;
  withDescription?: boolean;
  metadata?: Record<string, any>;
  showOrderIndex?: boolean;
  orderPrefix?: string;
  canDelete?: boolean;
  canAdd?: boolean;
}

export const DimensionList = ({
  framework,
  type,
  items,
  title,
  hint,
  addLabel,
  withColor = false,
  withDescription = false,
  metadata,
  showOrderIndex = false,
  orderPrefix = '',
  canDelete = true,
  canAdd = true,
}: DimensionListProps) => {
  const upsert = useUpsertDimension();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await upsert.mutateAsync({
      framework_id: framework.id,
      dimension_type: type,
      label: newLabel.trim(),
      position: items.length,
      metadata: metadata ?? {},
    } as any);
    setNewLabel('');
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((d, i) => (
          <DimensionRow
            key={d.id}
            dimension={d}
            type={type}
            withColor={withColor}
            withDescription={withDescription}
            indexBadge={showOrderIndex ? `${orderPrefix}${i + 1}` : undefined}
            canDelete={canDelete}
          />
        ))}
        {canAdd && (
          adding ? (
            <Card className="p-2 flex items-center gap-2">
              <Input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewLabel(''); } }}
                placeholder="Nuevo..."
                className="h-8"
              />
              <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim()}>Agregar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewLabel(''); }}>Cancelar</Button>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1.5 w-full">
              <Plus className="h-3.5 w-3.5" /> {addLabel}
            </Button>
          )
        )}
      </div>
    </div>
  );
};

export const DimensionRow = ({
  dimension,
  type,
  withColor = false,
  withDescription = false,
  indexBadge,
  canDelete = true,
}: {
  dimension: AdFrameworkDimension;
  type: DimensionType;
  withColor?: boolean;
  withDescription?: boolean;
  indexBadge?: string;
  canDelete?: boolean;
}) => {
  const upsert = useUpsertDimension();
  const remove = useDeleteDimension();
  const [label, setLabel] = useState(dimension.label);
  const [color, setColor] = useState(dimension.color ?? '');
  const [description, setDescription] = useState((dimension.metadata as any)?.description ?? '');

  const handleBlur = async () => {
    const newDescChanged = withDescription && description !== ((dimension.metadata as any)?.description ?? '');
    if (label !== dimension.label || color !== (dimension.color ?? '') || newDescChanged) {
      await upsert.mutateAsync({
        id: dimension.id,
        framework_id: dimension.framework_id,
        dimension_type: type,
        label: label || dimension.label,
        color: color || null,
        metadata: withDescription
          ? { ...(dimension.metadata ?? {}), description }
          : (dimension.metadata as any) ?? {},
      } as any);
    }
  };

  return (
    <Card className="p-2 group">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        {indexBadge && (
          <span className="text-[10px] font-bold rounded-full bg-muted px-1.5 py-0.5 shrink-0">
            {indexBadge}
          </span>
        )}
        {withColor && (
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
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
            onClick={() => remove.mutate({ id: dimension.id, framework_id: dimension.framework_id })}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {withDescription && (
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlur}
          placeholder="Descripción de esta fase…"
          rows={1}
          className="mt-1.5 text-xs resize-none"
        />
      )}
    </Card>
  );
};
