import { useState, useMemo } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AdVariant } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension } from '@/hooks/use-ad-frameworks';

interface Props {
  angles: AdFrameworkDimension[];
  formats: AdFrameworkDimension[];
  hooks: AdFrameworkDimension[]; // optional 3rd dimension
  variantMap: Record<string, AdVariant>;
  renderVariant: (v: AdVariant) => React.ReactNode;
  onCreateMissing?: () => void;
  syncPending?: boolean;
}

/**
 * Vertical board: each angle as its own collapsible section with a mini formats×hooks (or formats-only) grid.
 * Replaces Tabs for 3D frameworks; works for 2D too (no hooks → single column per format).
 */
export const AngleSectionBoard = ({
  angles, formats, hooks, variantMap, renderVariant, onCreateMissing, syncPending,
}: Props) => {
  const hasHooks = hooks.length > 0;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {angles.map((angle) => (
        <AngleSection
          key={angle.id}
          angle={angle}
          formats={formats}
          hooks={hooks}
          hasHooks={hasHooks}
          variantMap={variantMap}
          collapsed={collapsed.has(angle.id)}
          onToggle={() => toggle(angle.id)}
          renderVariant={renderVariant}
          onCreateMissing={onCreateMissing}
          syncPending={syncPending}
        />
      ))}
    </div>
  );
};

const AngleSection = ({
  angle, formats, hooks, hasHooks, variantMap, collapsed, onToggle, renderVariant, onCreateMissing, syncPending,
}: {
  angle: AdFrameworkDimension;
  formats: AdFrameworkDimension[];
  hooks: AdFrameworkDimension[];
  hasHooks: boolean;
  variantMap: Record<string, AdVariant>;
  collapsed: boolean;
  onToggle: () => void;
  renderVariant: (v: AdVariant) => React.ReactNode;
  onCreateMissing?: () => void;
  syncPending?: boolean;
}) => {
  const stats = useMemo(() => {
    let total = 0;
    let ready = 0;
    formats.forEach((f) => {
      const cells = hasHooks ? hooks.map((h) => `${angle.id}|${f.id}|${h.id}`) : [`${angle.id}|${f.id}`];
      cells.forEach((k) => {
        total++;
        const v = variantMap[k];
        if (v && (v.status === 'ready' || v.status === 'published')) ready++;
      });
    });
    return { total, ready, pct: total > 0 ? Math.round((ready / total) * 100) : 0 };
  }, [angle, formats, hooks, hasHooks, variantMap]);

  const accent = angle.color ?? 'hsl(var(--primary))';

  return (
    <section
      className="rounded-lg border-2 bg-card overflow-hidden"
      style={{ borderColor: collapsed ? 'hsl(var(--border))' : accent + '40' }}
    >
      {/* Header sticky */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left group"
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', collapsed && '-rotate-90')}
        />
        <h3 className="font-semibold text-base flex-1 truncate">{angle.label}</h3>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {stats.ready}/{stats.total} listos
          </span>
          <div className="w-24 hidden sm:block">
            <Progress value={stats.pct} className="h-1.5" />
          </div>
          <span className="text-xs font-mono font-semibold tabular-nums w-10 text-right">{stats.pct}%</span>
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="p-3 border-t bg-muted/10">
          {hasHooks ? (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24"></th>
                    {hooks.map((h) => (
                      <th key={h.id} className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 min-w-[200px]">
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formats.map((f) => (
                    <tr key={f.id}>
                      <td className="text-xs font-medium pr-2 w-24 align-top pt-3 text-muted-foreground">{f.label}</td>
                      {hooks.map((h) => {
                        const v = variantMap[`${angle.id}|${f.id}|${h.id}`];
                        return (
                          <td key={h.id} className="align-top">
                            {v ? renderVariant(v) : <EmptyCell onClick={onCreateMissing} disabled={syncPending} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // 2D inside section (rare, but supports if used standalone)
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {formats.map((f) => {
                const v = variantMap[`${angle.id}|${f.id}`];
                return (
                  <div key={f.id}>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                      {f.label}
                    </div>
                    {v ? renderVariant(v) : <EmptyCell onClick={onCreateMissing} disabled={syncPending} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const EmptyCell = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="border-2 border-dashed rounded-md text-xs text-muted-foreground italic min-h-[200px] w-full flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:text-foreground hover:bg-background/50 transition-all"
  >
    <Plus className="h-4 w-4" />
    Crear variante
  </button>
);
