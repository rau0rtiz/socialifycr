import { useMemo, useState } from 'react';
import { Plus, Rocket, Calendar as CalendarIcon, Target, ListTodo, ArrowUpDown, GripVertical } from 'lucide-react';
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
import { useLaunchTasks, useCreateLaunchTask, useDeleteLaunchTask, useUpdateLaunchTask, type LaunchPhaseTask } from '@/hooks/use-launch-tasks';
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
  const updateTask = useUpdateLaunchTask();
  const [addingType, setAddingType] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'manual' | 'date'>('manual');

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
        <div className="shrink-0 flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSortMode('manual')}
              className={`px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                sortMode === 'manual' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Orden manual (posición)"
            >
              <GripVertical className="h-3 w-3" /> Manual
            </button>
            <button
              type="button"
              onClick={() => setSortMode('date')}
              className={`px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                sortMode === 'date' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Ordenar por fecha de entrega"
            >
              <ArrowUpDown className="h-3 w-3" /> Por fecha
            </button>
          </div>
          {AddTaskButton}
          {AddPieceButton}
        </div>
      </div>

      {/* Unified grid: tasks + pieces */}
      {(() => {
        if (orderedVariants.length === 0 && tasks.length === 0) {
          return (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <p className="text-xs text-muted-foreground italic">
                Sin piezas ni tareas en esta fase todavía
              </p>
            </div>
          );
        }

        // Variant index map (preserves "Manual" numbering even when sorted by date)
        const variantIndex: Record<string, number> = {};
        orderedVariants.forEach((v, i) => { variantIndex[v.id] = i + 1; });

        type Item =
          | { kind: 'task'; id: string; date: string | null; done: boolean; data: typeof tasks[number] }
          | { kind: 'variant'; id: string; date: string | null; done: boolean; data: typeof orderedVariants[number] };

        const items: Item[] = [
          ...tasks.map((t): Item => ({
            kind: 'task', id: t.id, date: t.due_date, done: t.done, data: t,
          })),
          ...orderedVariants.map((v): Item => ({
            kind: 'variant', id: v.id, date: v.due_date,
            done: v.status === 'ready' || v.status === 'published', data: v,
          })),
        ];

        const renderCard = (item: Item) => {
          if (item.kind === 'task') {
            const t = item.data;
            return (
              <TaskCard
                key={`t-${t.id}`}
                task={t}
                accentColor={accent}
                onClick={() => setOpenTaskId(t.id)}
                onToggleDone={(done) => updateTask.mutate({ id: t.id, done } as any)}
                onDelete={() => deleteTask.mutate({ id: t.id, campaign_id: campaignId })}
              />
            );
          }
          const v = item.data;
          return (
            <div key={`v-${v.id}`} className="relative">
              <span
                className="absolute -top-1.5 -left-1.5 z-10 text-[10px] font-bold bg-background border-2 rounded-full h-5 w-5 flex items-center justify-center text-foreground/70 shadow-sm"
                style={{ borderColor: accent }}
              >
                {variantIndex[v.id]}
              </span>
              <MoldVariantCard
                variant={v}
                contentTypeLabel={v.format_id ? contentTypeMap[v.format_id]?.label : undefined}
                accentColor={accent}
                onClick={() => onOpenVariant(v.id)}
                onDelete={() => deleteVariant.mutate({ id: v.id, campaign_id: campaignId })}
              />
            </div>
          );
        };

        // Manual mode: tasks first, then variants (existing behavior)
        if (sortMode === 'manual') {
          const sortedTasks = [...tasks].sort(
            (a, b) =>
              Number(a.done) - Number(b.done) ||
              a.position - b.position ||
              a.created_at.localeCompare(b.created_at),
          );
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sortedTasks.map((t) =>
                renderCard({ kind: 'task', id: t.id, date: t.due_date, done: t.done, data: t }),
              )}
              {orderedVariants.map((v) =>
                renderCard({
                  kind: 'variant', id: v.id, date: v.due_date,
                  done: v.status === 'ready' || v.status === 'published', data: v,
                }),
              )}
            </div>
          );
        }

        // Date mode: bucket by urgency
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const buckets: Record<string, Item[]> = {
          overdue: [], today: [], soon: [], later: [], tbd: [], done: [],
        };
        items.forEach((it) => {
          if (it.done) { buckets.done.push(it); return; }
          if (!it.date) { buckets.tbd.push(it); return; }
          const d = parseISO(it.date);
          const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
          if (diff < 0) buckets.overdue.push(it);
          else if (diff === 0) buckets.today.push(it);
          else if (diff <= 7) buckets.soon.push(it);
          else buckets.later.push(it);
        });
        const sortByDateAsc = (a: Item, b: Item) =>
          (a.date ?? '').localeCompare(b.date ?? '');
        Object.keys(buckets).forEach((k) => buckets[k].sort(sortByDateAsc));

        const sections: { key: string; label: string; items: Item[]; tone: string }[] = [
          { key: 'overdue', label: 'Vencidas', items: buckets.overdue, tone: 'text-destructive' },
          { key: 'today', label: 'Hoy', items: buckets.today, tone: 'text-amber-600 dark:text-amber-400' },
          { key: 'soon', label: 'Próximos 7 días', items: buckets.soon, tone: 'text-foreground' },
          { key: 'later', label: 'Más adelante', items: buckets.later, tone: 'text-foreground/70' },
          { key: 'tbd', label: 'Sin fecha (TBD)', items: buckets.tbd, tone: 'text-muted-foreground' },
          { key: 'done', label: 'Completadas', items: buckets.done, tone: 'text-muted-foreground' },
        ].filter((s) => s.items.length > 0);

        return (
          <div className="space-y-5">
            {sections.map((s) => (
              <div key={s.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${s.tone}`}>
                    {s.label}
                  </h4>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {s.items.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {s.items.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <TaskDetailSheet
        task={tasks.find((t) => t.id === openTaskId) ?? null}
        open={!!openTaskId}
        onOpenChange={(o) => !o && setOpenTaskId(null)}
      />
    </div>
  );
};
