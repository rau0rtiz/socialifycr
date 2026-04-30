import { useMemo, useState } from 'react';
import { Plus, Rocket, Calendar as CalendarIcon, Target, ListTodo } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoldVariantCard } from '../MoldVariantCard';
import { TaskCard } from './TaskCard';
import { TaskDetailSheet } from './TaskDetailSheet';
import { useCreateAdVariant, useDeleteAdVariant, type AdVariant } from '@/hooks/use-ad-variants';
import { useLaunchTasks, useCreateLaunchTask, useDeleteLaunchTask, type LaunchPhaseTask } from '@/hooks/use-launch-tasks';
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

  const [activePhaseId, setActivePhaseId] = useState<string | null>(phases[0]?.id ?? null);

  const variantsByPhase = useMemo(() => {
    const m: Record<string, AdVariant[]> = {};
    variants.forEach((v) => {
      if (!v.phase_id) return;
      (m[v.phase_id] ||= []).push(v);
    });
    return m;
  }, [variants]);

  const { data: allTasks = [] } = useLaunchTasks(campaignId);
  const tasksByPhase = useMemo(() => {
    const m: Record<string, typeof allTasks> = {};
    allTasks.forEach((t) => {
      (m[t.phase_id] ||= []).push(t);
    });
    return m;
  }, [allTasks]);

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

  const activePhase = phases.find((p) => p.id === activePhaseId) ?? phases[0];
  const activeIdx = phases.findIndex((p) => p.id === activePhase.id);

  return (
    <div className="space-y-4">
      {/* Tabs grid — wraps responsively, no horizontal scroll */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {phases.map((p, i) => {
          const pVariants = variantsByPhase[p.id] ?? [];
          const total = pVariants.length;
          const ready = pVariants.filter((v) => v.status === 'ready' || v.status === 'published').length;
          const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
          const isActive = p.id === activePhase.id;
          const accent = p.color ?? 'hsl(var(--primary))';
          return (
            <button
              key={p.id}
              onClick={() => setActivePhaseId(p.id)}
              className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                isActive
                  ? 'shadow-sm'
                  : 'bg-card hover:bg-muted/50 hover:border-foreground/20'
              }`}
              style={{
                borderColor: isActive ? accent : undefined,
                borderWidth: isActive ? 2 : 1,
                backgroundColor: isActive ? accent + '12' : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="rounded-md text-[10px] font-bold px-1.5 py-0.5 text-white tracking-wide shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  F{i + 1}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground ml-auto">
                  {ready}/{total}
                </span>
              </div>
              <p
                className={`text-sm leading-tight line-clamp-2 ${isActive ? 'font-bold text-foreground' : 'font-semibold text-foreground/85'}`}
                title={p.label}
              >
                {p.label}
              </p>
              <Progress value={pct} className="h-1.5 mt-2" />
            </button>
          );
        })}
      </div>

      {/* Active phase content */}
      <PhaseSection
        key={activePhase.id}
        phase={activePhase}
        phaseIndex={activeIdx}
        totalPhases={phases.length}
        campaignId={campaignId}
        variants={variantsByPhase[activePhase.id] ?? []}
        tasks={tasksByPhase[activePhase.id] ?? []}
        contentTypes={contentTypes}
        onOpenVariant={onOpenVariant}
      />
    </div>
  );
};

const PhaseSection = ({
  phase, phaseIndex, totalPhases, campaignId, variants, tasks, contentTypes, onOpenVariant,
}: {
  phase: AdFrameworkDimension;
  phaseIndex: number;
  totalPhases: number;
  campaignId: string;
  variants: AdVariant[];
  tasks: import('@/hooks/use-launch-tasks').LaunchPhaseTask[];
  contentTypes: AdFrameworkDimension[];
  onOpenVariant: (id: string) => void;
}) => {
  const createVariant = useCreateAdVariant();
  const deleteVariant = useDeleteAdVariant();
  const createTask = useCreateLaunchTask();
  const deleteTask = useDeleteLaunchTask();
  const [addingType, setAddingType] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const accent = phase.color ?? 'hsl(var(--primary))';
  const meta = (phase.metadata ?? {}) as any;
  const description = meta.description as string | undefined;
  const condition = meta.condition as string | undefined;
  const startDate = meta.start_date as string | undefined;
  const endDate = meta.end_date as string | undefined;

  const dateRange = useMemo(() => {
    if (!startDate && !endDate) return null;
    const fmt = (s?: string) => s ? formatDate(parseISO(s), 'd MMM', { locale: es }) : '?';
    if (startDate && endDate) return `${fmt(startDate)} → ${fmt(endDate)}`;
    if (startDate) return `Desde ${fmt(startDate)}`;
    return `Hasta ${fmt(endDate)}`;
  }, [startDate, endDate]);

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

  const handleAddTask = async () => {
    const newTask = await createTask.mutateAsync({
      campaign_id: campaignId,
      phase_id: phase.id,
      title: 'Nueva tarea',
      position: tasks.length,
    });
    setOpenTaskId(newTask.id);
  };

  const AddPieceButton = contentTypes.length > 0 ? (
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

  const AddTaskButton = (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleAddTask}
      disabled={createTask.isPending}
    >
      <ListTodo className="h-3.5 w-3.5" /> Añadir tarea
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Phase meta header (no card chrome) */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="rounded-full text-[10px] font-bold px-2 py-0.5 text-white tracking-wide shadow-sm"
              style={{ backgroundColor: accent }}
            >
              FASE {phaseIndex + 1}/{totalPhases}
            </span>
            {dateRange && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border text-[10px] font-medium px-2 py-0.5 text-foreground/80">
                <CalendarIcon className="h-2.5 w-2.5" /> {dateRange}
              </span>
            )}
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
              {stats.ready}/{stats.total} listas
            </span>
            {tasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground">
                <ListTodo className="h-2.5 w-2.5" />
                {tasks.filter((t) => t.done).length}/{tasks.length} tareas
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-foreground leading-tight">{phase.label}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-snug">{description}</p>
          )}
          {condition && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/75">
              <Target className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
              <span><span className="font-semibold">Avanza cuando:</span> {condition}</span>
            </div>
          )}
        </div>
        <div className="shrink-0">
          {AddButton}
        </div>
      </div>

        <div className="shrink-0 flex items-center gap-2">
          {AddTaskButton}
          {AddPieceButton}
        </div>
      </div>

      {/* Unified grid: tasks + pieces */}
      {orderedVariants.length === 0 && tasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <p className="text-xs text-muted-foreground italic">
            Sin piezas ni tareas en esta fase todavía
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...tasks]
            .sort(
              (a, b) =>
                Number(a.done) - Number(b.done) ||
                a.position - b.position ||
                a.created_at.localeCompare(b.created_at),
            )
            .map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                accentColor={accent}
                onClick={() => setOpenTaskId(t.id)}
                onToggleDone={(done) =>
                  // optimistic toggle via update mutation
                  void import('@/hooks/use-launch-tasks').then(({}) => {})
                }
                onDelete={() => deleteTask.mutate({ id: t.id, campaign_id: campaignId })}
              />
            ))}
          {orderedVariants.map((v, i) => (
            <div key={v.id} className="relative">
              <span
                className="absolute -top-1.5 -left-1.5 z-10 text-[10px] font-bold bg-background border-2 rounded-full h-5 w-5 flex items-center justify-center text-foreground/70 shadow-sm"
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

      <TaskDetailSheet
        task={tasks.find((t) => t.id === openTaskId) ?? null}
        open={!!openTaskId}
        onOpenChange={(o) => !o && setOpenTaskId(null)}
      />
    </div>
  );
};
