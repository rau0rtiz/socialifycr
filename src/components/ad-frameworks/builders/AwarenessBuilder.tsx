import { useMemo, useState } from 'react';
import type { AdFrameworkWithDimensions, AdFrameworkDimension } from '@/hooks/use-ad-frameworks';
import { useUpsertDimension, useDeleteDimension } from '@/hooks/use-ad-frameworks';
import { ContentTypeCatalog, FrameworkMetaSection, MoldHeader, DimensionRow } from './shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const AwarenessBuilder = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const levels = useMemo(
    () => framework.dimensions
      .filter((d) => d.dimension_type === 'awareness_level')
      .sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );
  const messages = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'core_message'),
    [framework.dimensions],
  );

  return (
    <div className="space-y-6 mt-4">
      <MoldHeader
        framework={framework}
        subtitle="Modelo de Eugene Schwartz: 5 niveles fijos. Define mensajes centrales por nivel y los tipos de contenido disponibles."
      />
      <FrameworkMetaSection framework={framework} />

      {/* Niveles de awareness — solo renombrar / color */}
      <div className="space-y-2">
        <div>
          <h3 className="font-semibold text-sm">Niveles de awareness</h3>
          <p className="text-xs text-muted-foreground">Los 5 niveles son fijos. Puedes renombrarlos y cambiar su color.</p>
        </div>
        <div className="space-y-1.5">
          {levels.map((lvl, i) => (
            <DimensionRow
              key={lvl.id}
              dimension={lvl}
              type="awareness_level"
              withColor
              indexBadge={`${i + 1}`}
              canDelete={false}
            />
          ))}
        </div>
      </div>

      {/* Mensajes centrales por nivel */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Mensajes centrales por nivel</h3>
          <p className="text-xs text-muted-foreground">Las ideas-fuerza que se trabajan dentro de cada nivel. Cada variante se ancla a un mensaje.</p>
        </div>
        {levels.map((lvl) => (
          <LevelMessages
            key={lvl.id}
            framework={framework}
            level={lvl}
            messages={messages.filter((m) => (m.metadata as any)?.level_id === lvl.id)}
          />
        ))}
      </div>

      <ContentTypeCatalog framework={framework} />
    </div>
  );
};

const LevelMessages = ({
  framework,
  level,
  messages,
}: {
  framework: AdFrameworkWithDimensions;
  level: AdFrameworkDimension;
  messages: AdFrameworkDimension[];
}) => {
  const upsert = useUpsertDimension();
  const remove = useDeleteDimension();
  const [newMsg, setNewMsg] = useState('');
  const accent = level.color ?? 'hsl(var(--primary))';

  const handleAdd = async () => {
    if (!newMsg.trim()) return;
    await upsert.mutateAsync({
      framework_id: framework.id,
      dimension_type: 'core_message',
      label: newMsg.trim(),
      metadata: { level_id: level.id },
      position: messages.length,
    } as any);
    setNewMsg('');
  };

  return (
    <Card className="p-3 border-l-4" style={{ borderLeftColor: accent }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold">{level.label}</p>
        <span className="text-[10px] text-muted-foreground font-mono">{messages.length} mensaje{messages.length === 1 ? '' : 's'}</span>
      </div>
      <div className="space-y-1">
        {messages.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 group">
            <Input
              defaultValue={m.label}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== m.label) {
                  upsert.mutate({
                    id: m.id,
                    framework_id: framework.id,
                    dimension_type: 'core_message',
                    label: e.target.value.trim(),
                  } as any);
                }
              }}
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
              onClick={() => remove.mutate({ id: m.id, framework_id: framework.id })}
            >
              ×
            </Button>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">
          <Input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Nuevo mensaje central…"
            className="h-7 text-xs"
          />
          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={handleAdd} disabled={!newMsg.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
