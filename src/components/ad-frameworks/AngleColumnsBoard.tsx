import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { AdVariant } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension } from '@/hooks/use-ad-frameworks';

interface Props {
  angles: AdFrameworkDimension[];
  formats: AdFrameworkDimension[];
  hooks: AdFrameworkDimension[];
  variantMap: Record<string, AdVariant>;
  renderVariant: (v: AdVariant) => React.ReactNode;
  onCreateMissing?: () => void;
  syncPending?: boolean;
}

/**
 * 3D board: each Angle is a vertical COLUMN with internal scroll.
 * Inside the column, variants are grouped by Format, and within each format
 * stacked one Hook per row (vertical scroll). Lets you compare angles side-by-side.
 */
export const AngleColumnsBoard = ({
  angles, formats, hooks, variantMap, renderVariant, onCreateMissing, syncPending,
}: Props) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {angles.map((angle) => (
        <AngleColumn
          key={angle.id}
          angle={angle}
          formats={formats}
          hooks={hooks}
          variantMap={variantMap}
          renderVariant={renderVariant}
          onCreateMissing={onCreateMissing}
          syncPending={syncPending}
        />
      ))}
    </div>
  );
};

const AngleColumn = ({
  angle, formats, hooks, variantMap, renderVariant, onCreateMissing, syncPending,
}: {
  angle: AdFrameworkDimension;
  formats: AdFrameworkDimension[];
  hooks: AdFrameworkDimension[];
  variantMap: Record<string, AdVariant>;
  renderVariant: (v: AdVariant) => React.ReactNode;
  onCreateMissing?: () => void;
  syncPending?: boolean;
}) => {
  const stats = useMemo(() => {
    let total = 0;
    let ready = 0;
    formats.forEach((f) => {
      hooks.forEach((h) => {
        total++;
        const v = variantMap[`${angle.id}|${f.id}|${h.id}`];
        if (v && (v.status === 'ready' || v.status === 'published')) ready++;
      });
    });
    return { total, ready, pct: total > 0 ? Math.round((ready / total) * 100) : 0 };
  }, [angle, formats, hooks, variantMap]);

  const accent = angle.color ?? 'hsl(var(--primary))';

  return (
    <section
      className="shrink-0 w-[320px] rounded-lg border-2 bg-card flex flex-col max-h-[calc(100vh-280px)]"
      style={{ borderColor: accent + '40' }}
    >
      {/* Sticky header */}
      <div
        className="px-3 py-2.5 border-b bg-card"
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm truncate flex-1">{angle.label}</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {stats.ready}/{stats.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={stats.pct} className="h-1 flex-1" />
          <span className="text-[10px] font-mono font-semibold tabular-nums w-8 text-right">{stats.pct}%</span>
        </div>
      </div>

      {/* Vertical scrollable body grouped by format */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {formats.map((f) => (
          <div key={f.id}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 sticky top-0 bg-card/95 backdrop-blur py-1 z-10">
              {f.label}
            </div>
            <div className="space-y-2">
              {hooks.map((h) => {
                const v = variantMap[`${angle.id}|${f.id}|${h.id}`];
                return (
                  <div key={h.id}>
                    <div className="text-[10px] text-muted-foreground/70 mb-1 px-0.5 truncate">{h.label}</div>
                    {v ? renderVariant(v) : (
                      <button
                        onClick={onCreateMissing}
                        disabled={syncPending}
                        className="border-2 border-dashed rounded-md text-[11px] text-muted-foreground italic min-h-[180px] w-full flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:text-foreground hover:bg-background/50 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Crear
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
