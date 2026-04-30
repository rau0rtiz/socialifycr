import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Sparkles } from 'lucide-react';
import type { AdFrameworkWithDimensions, AdFrameworkDimension } from '@/hooks/use-ad-frameworks';
import { getMold } from '@/lib/framework-molds';

interface Props {
  framework: AdFrameworkWithDimensions;
  onEdit: () => void;
}

/**
 * Mold-aware overview card. Shows the right summary based on template_kind.
 */
export const FrameworkOverview = ({ framework, onEdit }: Props) => {
  const mold = getMold(framework.template_kind);
  const Icon = mold?.icon ?? Sparkles;
  const accentBg = mold ? `hsl(${mold.accentColor} / 0.15)` : 'hsl(var(--muted))';
  const accentFg = mold ? `hsl(${mold.accentColor})` : 'hsl(var(--primary))';

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: accentBg, color: accentFg }}
        >
          <Icon className="h-5.5 w-5.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{mold?.name ?? 'Framework'}</p>
            {mold && (
              <Badge variant="secondary" className="text-[10px]">{mold.tagline}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{mold?.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 shrink-0">
          <Settings className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      <div className="mt-4 pt-4 border-t">
        {framework.template_kind === 'pool' && <PoolOverview framework={framework} />}
        {framework.template_kind === 'awareness' && <AwarenessOverview framework={framework} />}
        {framework.template_kind === 'launch' && <LaunchOverview framework={framework} />}
        {framework.template_kind === 'legacy_matrix' && <LegacyOverview framework={framework} />}
      </div>
    </Card>
  );
};

const Chip = ({ label, color }: { label: string; color?: string | null }) => (
  <Badge
    variant="outline"
    style={color ? { borderColor: color, color } : {}}
    className="text-[11px] font-normal"
  >
    {label}
  </Badge>
);

const PoolOverview = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const types = framework.dimensions.filter((d) => d.dimension_type === 'content_type');
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipos de contenido</h4>
        <span className="text-xs font-mono text-muted-foreground">{types.length}</span>
      </div>
      {types.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Sin tipos definidos. Crea variantes "sin tipo" o agrega un catálogo.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => <Chip key={t.id} label={t.label} color={t.color} />)}
        </div>
      )}
    </div>
  );
};

const AwarenessOverview = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const levels = useMemo(
    () => framework.dimensions
      .filter((d) => d.dimension_type === 'awareness_level')
      .sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );
  const messages = framework.dimensions.filter((d) => d.dimension_type === 'core_message');
  const types = framework.dimensions.filter((d) => d.dimension_type === 'content_type');

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">5 niveles de awareness</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {levels.map((lvl) => {
            const count = messages.filter((m) => (m.metadata as any)?.level_id === lvl.id).length;
            const accent = lvl.color ?? '#888';
            return (
              <div
                key={lvl.id}
                className="rounded-md border-l-4 border bg-muted/20 p-2"
                style={{ borderLeftColor: accent }}
              >
                <p className="text-[11px] font-medium leading-tight line-clamp-2">{lvl.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{count} mensaje{count === 1 ? '' : 's'}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipos de contenido</h4>
          <span className="text-xs font-mono text-muted-foreground">{types.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {types.length === 0 ? (
            <span className="text-xs italic text-muted-foreground">Sin tipos definidos</span>
          ) : types.map((t) => <Chip key={t.id} label={t.label} color={t.color} />)}
        </div>
      </div>
    </div>
  );
};

const LaunchOverview = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const phases = useMemo(
    () => framework.dimensions
      .filter((d) => d.dimension_type === 'phase')
      .sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );
  const types = framework.dimensions.filter((d) => d.dimension_type === 'content_type');

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Secuencia de fases</h4>
        {phases.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Sin fases configuradas</p>
        ) : (
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {phases.map((p, i) => {
              const accent = p.color ?? 'hsl(var(--primary))';
              const desc = (p.metadata as any)?.description as string | undefined;
              return (
                <div key={p.id} className="flex items-center gap-2 shrink-0">
                  <div
                    className="rounded-md border-l-4 border bg-muted/20 px-2.5 py-1.5 min-w-[140px] max-w-[180px]"
                    style={{ borderLeftColor: accent }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] font-bold rounded-full px-1.5 py-0.5 text-white"
                        style={{ backgroundColor: accent }}
                      >
                        F{i + 1}
                      </span>
                      <p className="text-[11px] font-semibold truncate">{p.label}</p>
                    </div>
                    {desc && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>}
                  </div>
                  {i < phases.length - 1 && <span className="text-muted-foreground/50">→</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipos de contenido</h4>
          <span className="text-xs font-mono text-muted-foreground">{types.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {types.length === 0 ? (
            <span className="text-xs italic text-muted-foreground">Sin tipos definidos</span>
          ) : types.map((t) => <Chip key={t.id} label={t.label} color={t.color} />)}
        </div>
      </div>
    </div>
  );
};

const LegacyOverview = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = framework.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = framework.dimensions.filter((d) => d.dimension_type === 'hook');
  const hasHooks = hooks.length > 0;
  const total = hasHooks ? angles.length * formats.length * hooks.length : angles.length * formats.length;

  return (
    <div className="space-y-3">
      <Badge variant="secondary" className="font-mono text-xs">
        {hasHooks
          ? `${angles.length} × ${formats.length} × ${hooks.length} = ${total} variantes/campaña`
          : `${angles.length} × ${formats.length} = ${total} variantes/campaña`}
      </Badge>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: 'Ángulos', items: angles },
          { label: 'Formatos', items: formats },
          { label: 'Hooks', items: hooks },
        ].map((g) => (
          <div key={g.label}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">{g.label}</p>
            <div className="flex flex-wrap gap-1">
              {g.items.length === 0 ? (
                <span className="text-xs italic text-muted-foreground">—</span>
              ) : g.items.map((d) => <Chip key={d.id} label={d.label} color={d.color} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Returns true if the framework is minimally configured to allow creating campaigns.
 */
export const canCreateCampaignForFramework = (framework: AdFrameworkWithDimensions): boolean => {
  switch (framework.template_kind) {
    case 'pool':
      return true; // pool can start empty — variants can be added freely
    case 'awareness':
      return framework.dimensions.some((d) => d.dimension_type === 'awareness_level');
    case 'launch':
      return framework.dimensions.some((d) => d.dimension_type === 'phase');
    case 'legacy_matrix':
    default: {
      const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle').length;
      const formats = framework.dimensions.filter((d) => d.dimension_type === 'format').length;
      return angles > 0 && formats > 0;
    }
  }
};

/**
 * Returns a one-line summary string suitable for FrameworkCard.
 */
export const getFrameworkSummary = (framework: AdFrameworkWithDimensions): string => {
  const dims = framework.dimensions;
  switch (framework.template_kind) {
    case 'pool': {
      const types = dims.filter((d) => d.dimension_type === 'content_type').length;
      return `Pool · ${types} tipo${types === 1 ? '' : 's'}`;
    }
    case 'awareness': {
      const msgs = dims.filter((d) => d.dimension_type === 'core_message').length;
      return `Awareness · ${msgs} mensaje${msgs === 1 ? '' : 's'}`;
    }
    case 'launch': {
      const phases = dims.filter((d) => d.dimension_type === 'phase').length;
      return `Launch · ${phases} fase${phases === 1 ? '' : 's'}`;
    }
    case 'legacy_matrix':
    default: {
      const a = dims.filter((d) => d.dimension_type === 'angle').length;
      const f = dims.filter((d) => d.dimension_type === 'format').length;
      const h = dims.filter((d) => d.dimension_type === 'hook').length;
      return h > 0 ? `${a} × ${f} × ${h}` : `${a} × ${f}`;
    }
  }
};
