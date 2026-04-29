import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { AdVariant, VariantStatus } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension } from '@/hooks/use-ad-frameworks';
import { AlertCircle, Clock, CheckCircle2, Image as ImageIcon } from 'lucide-react';

const STATUS_META: Record<VariantStatus, { label: string; dotCls: string }> = {
  draft:       { label: 'Pendiente',   dotCls: 'bg-muted-foreground/40' },
  in_progress: { label: 'En progreso', dotCls: 'bg-amber-500' },
  ready:       { label: 'Listo',       dotCls: 'bg-emerald-500' },
  published:   { label: 'Subido',      dotCls: 'bg-blue-500' },
};

const STATUS_ORDER: VariantStatus[] = ['draft', 'in_progress', 'ready', 'published'];

interface Props {
  variants: AdVariant[];
  expectedTotal: number;
  angles: AdFrameworkDimension[];
}

export const CampaignProgressHeader = ({ variants, expectedTotal, angles }: Props) => {
  const stats = useMemo(() => {
    const byStatus: Record<VariantStatus, number> = { draft: 0, in_progress: 0, ready: 0, published: 0 };
    let overdue = 0;
    let thisWeek = 0;
    const today = new Date();

    variants.forEach((v) => {
      byStatus[v.status]++;
      if (v.due_date && v.status !== 'published') {
        const days = differenceInCalendarDays(parseISO(v.due_date), today);
        if (days < 0) overdue++;
        else if (days <= 7) thisWeek++;
      }
    });

    const completed = byStatus.ready + byStatus.published;
    const pct = expectedTotal > 0 ? Math.round((completed / expectedTotal) * 100) : 0;

    return { byStatus, overdue, thisWeek, completed, pct };
  }, [variants, expectedTotal]);

  const byAngle = useMemo(() => {
    return angles.map((a) => {
      const angleVariants = variants.filter((v) => v.angle_id === a.id);
      const ready = angleVariants.filter((v) => v.status === 'ready' || v.status === 'published').length;
      const total = angleVariants.length;
      const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
      return { angle: a, ready, total, pct };
    });
  }, [variants, angles]);

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/20 border-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: progreso global */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{stats.pct}%</span>
              <span className="text-xs text-muted-foreground">
                {stats.completed} de {expectedTotal} ads listos
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {stats.overdue > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" /> {stats.overdue} vencida{stats.overdue === 1 ? '' : 's'}
                </span>
              )}
              {stats.thisWeek > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="h-3.5 w-3.5" /> {stats.thisWeek} esta semana
                </span>
              )}
            </div>
          </div>
          <Progress value={stats.pct} className="h-2.5" />

          {/* Stats por estado */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', STATUS_META[s].dotCls)} />
                <span className="text-muted-foreground">{STATUS_META[s].label}</span>
                <span className="font-mono font-semibold tabular-nums">{stats.byStatus[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progreso por ángulo */}
      {byAngle.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Progreso por ángulo
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {byAngle.map(({ angle, ready, total, pct }) => (
              <div key={angle.id} className="bg-background/50 rounded-md p-2 border border-border/40">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: angle.color ?? 'hsl(var(--muted-foreground))' }}
                  />
                  <span className="text-[11px] font-medium truncate flex-1" title={angle.label}>
                    {angle.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {ready}/{total}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: angle.color ?? 'hsl(var(--primary))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
