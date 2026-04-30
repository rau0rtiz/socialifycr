import { useMemo, useState } from 'react';
import { Plus, Rocket, Calendar as CalendarIcon, Target } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
 * Launch Sequence mold: each phase is a full-width vertical section.
 * Pieces of content render as a responsive grid of cards inside each section.
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
    <div className="space-y-5">
      {phases.map((phase, idx) => (
        <PhaseSection
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

const PhaseSection = ({
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
      format_id: contentTypeId,
      position: orderedVariants.length,
    });
  };

  const contentTypeMap = useMemo(() => {
    const m: Record<string, AdFrameworkDimension> = {};
    contentTypes.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contentTypes]);

  const AddButton = contentTypes.length > 0 ? (
    <DropdownMenu open={addingType} onOpenChange={setAddingType}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={createVariant.isPending}>
          <Plus className="h-3.5 w-3.5" /> Añadir pieza
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
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
      variant="outline" size="sm" className="gap-1.5"
      onClick={() => handleAdd(null)}
      disabled={createVariant.isPending}
    >
      <Plus className="h-3.5 w-3.5" /> Añadir pieza
    </Button>
  );

  return (
    <section
      className="rounded-xl border bg-card overflow-hidden shadow-sm"
      style={{ borderColor: accent + '40' }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-5 py-3.5 border-b"
        style={{ backgroundColor: accent + '18', borderBottomColor: accent + '40' }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="rounded-full text-[10px] font-bold px-2 py-0.5 text-white tracking-wide shadow-sm"
                style={{ backgroundColor: accent }}
              >
                FASE {phaseIndex + 1}/{totalPhases}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-foreground/60">
                {stats.ready}/{stats.total} listas
              </span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">{phase.label}</h3>
            {description && (
              <p className="text-xs sm:text-sm text-foreground/70 mt-1 leading-snug">{description}</p>
            )}
          </div>
          <div className="shrink-0">
            {AddButton}
          </div>
        </div>
        <Progress value={stats.pct} className="h-1.5 mt-3" />
      </div>

      {/* Content grid */}
      <div className="p-3 sm:p-4">
        {orderedVariants.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-xs text-muted-foreground italic mb-3">Sin piezas en esta fase todavía</p>
            <div className="inline-block">{AddButton}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {orderedVariants.map((v, i) => (
              <div key={v.id} className="relative">
                <span className="absolute -top-1.5 -left-1.5 z-10 text-[10px] font-bold bg-background border-2 rounded-full h-5 w-5 flex items-center justify-center text-foreground/70 shadow-sm"
                  style={{ borderColor: accent }}
                >
                  {i + 1}
                </span>
                <MoldVariantCard
                  variant={v}
                  contentTypeLabel={v.format_id ? contentTypeMap[v.format_id]?.label : undefined}
                  accentColor={accent}
                  onClick={() => onOpenVariant(v.id)}
                  onDelete={() => deleteVariant.mutate({ id: v.id, campaign_id: campaignId })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
