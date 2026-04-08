import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDailyStoryTracker, DailyStoryEntry } from '@/hooks/use-daily-story-tracker';
import {
  CalendarDays, ChevronLeft, ChevronRight, Film, Wallet,
  TrendingUp, Zap,
} from 'lucide-react';
import {
  format, eachDayOfInterval, isFuture, isSameDay,
  addWeeks, subWeeks, startOfWeek, endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StoryRevenueTrackerProps {
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const getCostaRicaToday = () => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 80;
  const height = 24;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2,
  }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg width={width} height={height} className="mt-1">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
};

const CellIndicator = ({ entry }: { entry: DailyStoryEntry }) => {
  const hasStories = entry.stories_count > 0;
  const hasRevenue = entry.daily_revenue > 0;
  if (!hasStories && !hasRevenue) return null;
  return (
    <div className="flex gap-[2px] justify-center mt-[2px]">
      {hasStories && (
        <div
          className="rounded-full bg-primary"
          style={{ width: Math.min(4 + entry.stories_count * 0.5, 7), height: Math.min(4 + entry.stories_count * 0.5, 7) }}
        />
      )}
      {hasRevenue && (
        <div className="rounded-full w-[5px] h-[5px] bg-emerald-500" />
      )}
    </div>
  );
};

const DayTooltipContent = ({ entry, date }: { entry: DailyStoryEntry; date: Date }) => (
  <div className="space-y-2.5 p-1">
    <p className="text-xs font-semibold text-foreground capitalize">
      {format(date, "EEEE d 'de' MMMM", { locale: es })}
    </p>
    <Separator />
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-1.5">
        <Film className="h-3 w-3 text-primary" />
        <span className="text-[11px] text-muted-foreground">Historias:</span>
        <span className="text-[11px] font-semibold text-foreground">{entry.stories_count}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wallet className="h-3 w-3 text-emerald-500" />
        <span className="text-[11px] text-muted-foreground">Ventas:</span>
        <span className="text-[11px] font-semibold text-foreground">{formatCurrency(entry.daily_revenue, entry.currency)}</span>
      </div>
    </div>
  </div>
);

export const StoryRevenueTracker = ({ clientId }: StoryRevenueTrackerProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const currentMonth = currentWeek;
  const { entries, entriesByDate, totals, isLoading } = useDailyStoryTracker(clientId, currentMonth);

  const crToday = getCostaRicaToday();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const sparklineData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.track_date.localeCompare(b.track_date));
    return {
      stories: sorted.map(e => e.stories_count),
      revenue: sorted.map(e => e.daily_revenue),
    };
  }, [entries]);

  const reportedDates = useMemo(() => new Set(entries.filter(e => e.stories_count > 0 || e.daily_revenue > 0).map(e => e.track_date)), [entries]);

  const { reportedCount, trackableDays } = useMemo(() => {
    let trackable = 0;
    let reported = 0;
    calendarDays.forEach(d => {
      if (!isFuture(d)) {
        trackable++;
        if (reportedDates.has(format(d, 'yyyy-MM-dd'))) reported++;
      }
    });
    return { reportedCount: reported, trackableDays: trackable };
  }, [calendarDays, reportedDates]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Film className="h-4 w-4 text-primary" />
            </div>
            Tracker de Historias y Ventas
            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Zap className="h-3 w-3" />
              Automático
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentWeek(m => subWeeks(m, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-semibold text-foreground">
                  {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM yyyy", { locale: es })}
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentWeek(m => addWeeks(m, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const entry = entriesByDate[ds];
                  const isTodayCR = isSameDay(day, crToday);
                  const future = isFuture(day) && !isTodayCR;
                  const hasData = !!entry && (entry.stories_count > 0 || entry.daily_revenue > 0);
                  const isMissing = !hasData && !future;

                  const dayContent = (
                    <div
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl aspect-square w-full transition-all duration-200',
                        future && 'opacity-40',
                        hasData && 'bg-emerald-500/10 dark:bg-emerald-500/15',
                        isMissing && 'bg-muted/40',
                        isTodayCR && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium',
                        hasData && 'text-emerald-700 dark:text-emerald-400',
                        isMissing && 'text-muted-foreground',
                        !hasData && !isMissing && 'text-foreground',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {entry && <CellIndicator entry={entry} />}
                    </div>
                  );

                  if (hasData && entry) {
                    return (
                      <HoverCard key={ds} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          {dayContent}
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 p-3" side="top" sideOffset={8}>
                          <DayTooltipContent entry={entry} date={day} />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  }
                  return <div key={ds}>{dayContent}</div>;
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">Historias archivadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Ventas por historia</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" />
                  <span className="text-[10px] text-muted-foreground">Hoy</span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:w-56 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Resumen de la semana
                </p>
                {[
                  { icon: Film, label: 'Historias', value: totals.stories_count, color: 'text-primary', sparkColor: 'hsl(var(--primary))', bgFrom: 'from-primary/10', bgTo: 'to-primary/0', borderColor: 'border-primary/15', data: sparklineData.stories },
                  { icon: Wallet, label: 'Ventas', value: formatCurrency(totals.daily_revenue, 'CRC'), color: 'text-emerald-500', sparkColor: '#22c55e', bgFrom: 'from-emerald-500/10', bgTo: 'to-emerald-500/0', borderColor: 'border-emerald-500/15', data: sparklineData.revenue },
                ].map(({ icon: Icon, label, value, color, sparkColor, bgFrom, bgTo, borderColor, data }) => (
                  <div key={label} className={cn('p-2.5 rounded-xl border bg-gradient-to-br', bgFrom, bgTo, borderColor)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('h-3 w-3', color)} />
                        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                      </div>
                      <span className="text-base font-bold text-foreground">{value}</span>
                    </div>
                    <Sparkline data={data} color={sparkColor} />
                  </div>
                ))}

                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Días con actividad
                    </span>
                    <span className="text-xs font-bold text-foreground">{reportedCount}/{trackableDays}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${trackableDays > 0 ? (reportedCount / trackableDays) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
