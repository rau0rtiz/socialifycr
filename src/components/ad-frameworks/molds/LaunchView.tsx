import { useMemo, useState } from 'react';
import { Plus, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoldVariantCard } from '../MoldVariantCard';
import { useCreateAdVariant, useDeleteAdVariant, type AdVariant } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension, AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';

interface Props {
  framework: AdFrameworkWithDimensions;
  campaignId: string;
  variants: AdVariant[];
  onOpenVariant: (id: string) => void;
}

/**
 * Launch Sequence mold: horizontal timeline of phases. Each phase shows its content pieces stacked vertically.
 */
export const LaunchView = ({ framework, campaignId, variants, onOpenVariant }: Props) => {
  const phases = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'phase').sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );
  const contentTypes = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'content_type'),
    [framework.dimensions],
  );

  if (phases.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3">
        <Rocket className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Este lanzamiento no tiene fases configuradas todavía. Agrégalas desde "Editar dimensiones".
        </p>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {phases.map((phase, idx) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          phaseIndex={idx}
          totalPhases={phases.length}
          campaignId={campaignId}
          variants={variants.filter((v) => v.phase_id === phase.id)}
          contentTypes={contentTypes}
          onOpenVariant={onOpenVariant}
        />
      ))}
    </div>
  );
};

const PhaseColumn = ({
  phase, phaseIndex, totalPhases, campaignId, variants, contentTypes, onOpenVariant,
}: {
  phase: AdFrameworkDimension;
  phaseIndex: number;
  totalPhases: number;
  campaignId: string;
  variants: AdVariant[];
  contentTypes: AdFrameworkDimension[];
  onOpenVariant: (id: string) => void;
}) => {
  const createVariant = useCreateAdVariant();
  const deleteVariant = useDeleteAdVariant();
  const [addingType, setAddingType] = useState(false);

  const accent = phase.color ?? 'hsl(var(--primary))';
  const description = (phase.metadata as any)?.description as string | undefined;

  const orderedVariants = useMemo(
    () => [...variants].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [variants],
  );

  const stats = useMemo(() => {
    const total = variants.length;
    const ready = variants.filter((v) => v.status === 'ready' || v.status === 'published').length;
    return { total, ready, pct: total > 0 ? Math.round((ready / total) * 100) : 0 };
  }, [variants]);

  const handleAdd = async (contentTypeId: string | null) => {
    setAddingType(false);
    await createVariant.mutateAsync({
      campaign_id: campaignId,
      phase_id: phase.id,
      format_id: contentTypeId, // store content_type as format_id (reuses existing column)
      position: orderedVariants.length,
    });
  };

  const contentTypeMap = useMemo(() => {
    const m: Record<string, AdFrameworkDimension> = {};
    contentTypes.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contentTypes]);

  return (
    <section
      className="shrink-0 w-[320px] rounded-xl border bg-card flex flex-col max-h-[calc(100vh-260px)] overflow-hidden shadow-sm"
      style={{ borderColor: accent + '40' }}
    >
      {/* Colored header strip */}
      <div
        className="px-4 py-3 border-b"
        style={{ backgroundColor: accent + '18', borderBottomColor: accent + '40' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="rounded-full text-[10px] font-bold px-2 py-0.5 text-white tracking-wide shadow-sm"
            style={{ backgroundColor: accent }}
          >
            FASE {phaseIndex + 1}/{totalPhases}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-foreground/60 ml-auto">
            {stats.ready}/{stats.total}
          </span>
        </div>
        <h3 className="font-bold text-base text-foreground leading-tight">{phase.label}</h3>
        {description && (
          <p className="text-xs text-foreground/70 mt-1 leading-snug">{description}</p>
        )}
        <Progress value={stats.pct} className="h-1.5 mt-2.5" />
      </div>

      {/* Variants list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {orderedVariants.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            Sin piezas todavía
          </p>
        ) : (
          orderedVariants.map((v, i) => (
            <div key={v.id} className="relative">
              <span className="absolute -left-1 top-2 z-10 text-[9px] font-bold bg-background border rounded-full h-4 w-4 flex items-center justify-center text-muted-foreground">
                {i + 1}
              </span>
              <div className="pl-2">
                <MoldVariantCard
                  variant={v}
                  contentTypeLabel={v.format_id ? contentTypeMap[v.format_id]?.label : undefined}
                  accentColor={accent}
                  compact
                  onClick={() => onOpenVariant(v.id)}
                  onDelete={() => deleteVariant.mutate({ id: v.id, campaign_id: campaignId })}
                />
              </div>
            </div>
          ))
        )}

        {/* Add button */}
        {contentTypes.length > 0 ? (
          <DropdownMenu open={addingType} onOpenChange={setAddingType}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1.5 mt-2"
                disabled={createVariant.isPending}
              >
                <Plus className="h-3.5 w-3.5" /> Añadir pieza
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {contentTypes.map((ct) => (
                <DropdownMenuItem key={ct.id} onClick={() => handleAdd(ct.id)}>
                  {ct.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => handleAdd(null)} className="text-muted-foreground">
                Sin tipo definido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline" size="sm"
            className="w-full border-dashed gap-1.5 mt-2"
            onClick={() => handleAdd(null)}
            disabled={createVariant.isPending}
          >
            <Plus className="h-3.5 w-3.5" /> Añadir pieza
          </Button>
        )}
      </div>
    </section>
  );
};
