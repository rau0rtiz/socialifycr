import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { useDailyStoryTracker, DailyStoryEntry, DailyStoryInput } from '@/hooks/use-daily-story-tracker';
import {
  CalendarDays, ChevronLeft, ChevronRight, Film, Wallet,
  TrendingUp, Zap, Pencil, Save, Trash2, DollarSign, BookOpen, Star,
} from 'lucide-react';
import {
  format, eachDayOfInterval, isFuture, isSameDay,
  addWeeks, subWeeks, startOfWeek, endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StoryRevenueTrackerProps {
  clientId: string;
  dateRange?: { start: Date; end: Date };
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const formatCRC = (v: number) => v >= 1_000_000 ? `₡${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `₡${(v / 1_000).toFixed(0)}K` : `₡${v}`;

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
    {entry.has_override && (
      <>
        <Separator />
        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Pencil className="h-2.5 w-2.5" />
          Incluye ajuste manual: +{entry.override_stories || 0} historias, +{formatCurrency(entry.override_revenue || 0, entry.currency)}
        </p>
      </>
    )}
    {entry.notes && (
      <>
        <Separator />
        <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{entry.notes}"</p>
      </>
    )}
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const stories = payload.find((p: any) => p.dataKey === 'stories')?.value || 0;
  const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
  const ratio = stories > 0 ? Math.round(revenue / stories) : 0;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium mb-1.5">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
        <span className="text-muted-foreground">Historias:</span>
        <span className="font-medium ml-auto">{stories}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(142 71% 45%)' }} />
        <span className="text-muted-foreground">Ventas:</span>
        <span className="font-medium ml-auto">{formatCRC(revenue)}</span>
      </div>
      {stories > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-1">
          <Zap className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">₡/Historia:</span>
          <span className="font-medium ml-auto">{formatCRC(ratio)}</span>
        </div>
      )}
    </div>
  );
};

export const StoryRevenueTracker = ({ clientId, dateRange }: StoryRevenueTrackerProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());

  const currentMonth = currentWeek;
  const { entries, entriesByDate, totals, chartData, isLoading, upsertEntry, deleteOverride } = useDailyStoryTracker(clientId, currentMonth, dateRange);

  // Form state for override
  const [overrideStories, setOverrideStories] = useState('');
  const [overrideRevenue, setOverrideRevenue] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [notes, setNotes] = useState('');

  const crToday = getCostaRicaToday();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const openEditor = (date: Date) => {
    setEditDate(date);
    const ds = format(date, 'yyyy-MM-dd');
    const entry = entriesByDate[ds];
    setOverrideStories(entry?.override_stories?.toString() || '');
    setOverrideRevenue(entry?.override_revenue?.toString() || '');
    setCurrency(entry?.currency || 'CRC');
    setNotes(entry?.notes || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    const input: DailyStoryInput = {
      track_date: format(editDate, 'yyyy-MM-dd'),
      stories_count: parseInt(overrideStories) || 0,
      daily_revenue: parseFloat(overrideRevenue) || 0,
      currency,
      notes: notes || undefined,
    };
    try {
      await upsertEntry.mutateAsync(input);
      toast.success('Ajuste manual guardado');
      setEditOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDeleteOverride = async () => {
    const ds = format(editDate, 'yyyy-MM-dd');
    try {
      await deleteOverride.mutateAsync(ds);
      toast.success('Ajuste manual eliminado');
      setEditOpen(false);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const currentEntry = entriesByDate[format(editDate, 'yyyy-MM-dd')];

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

  // Chart KPIs
  const chartEntries = useMemo(() => (chartData || []).map((e: any) => ({
    date: format(new Date(e.track_date + 'T12:00:00'), 'dd/MM', { locale: es }),
    fullDate: format(new Date(e.track_date + 'T12:00:00'), 'dd MMM', { locale: es }),
    stories: e.stories_count,
    revenue: e.daily_revenue,
  })), [chartData]);

  const totalStories = chartEntries.reduce((s: number, e: any) => s + e.stories, 0);
  const totalRevenue = chartEntries.reduce((s: number, e: any) => s + e.revenue, 0);
  const revenuePerStory = totalStories > 0 ? Math.round(totalRevenue / totalStories) : 0;
  const bestDay = chartEntries.length > 0
    ? chartEntries.reduce((best: any, e: any) => e.revenue > best.revenue ? e : best, chartEntries[0])
    : null;

  const chartConfig = {
    stories: { label: 'Historias', color: 'hsl(var(--primary))' },
    revenue: { label: 'Ventas', color: 'hsl(142 71% 45%)' },
  };

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
        <CardContent className="px-5 pb-5 space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <BookOpen className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wide">Historias</span>
              </div>
              <p className="text-lg font-bold">{totalStories}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <DollarSign className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wide">Ventas</span>
              </div>
              <p className="text-lg font-bold">{formatCRC(totalRevenue)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <Zap className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wide">₡/Historia</span>
              </div>
              <p className="text-lg font-bold">{formatCRC(revenuePerStory)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <Star className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wide">Mejor día</span>
              </div>
              <p className="text-sm font-bold">{bestDay ? bestDay.fullDate : '—'}</p>
              <p className="text-[10px] text-muted-foreground">{bestDay ? formatCRC(bestDay.revenue) : ''}</p>
            </div>
          </div>

          {/* Calendar + Sidebar */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
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
                  const hasOverride = entry?.has_override;

                  const dayContent = (
                    <button
                      onClick={() => !future && openEditor(day)}
                      disabled={future}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl aspect-square w-full transition-all duration-200',
                        !future && 'cursor-pointer hover:scale-105 hover:shadow-sm',
                        future && 'opacity-40 cursor-default',
                        hasData && 'bg-emerald-500/10 dark:bg-emerald-500/15',
                        isMissing && 'bg-muted/40',
                        isTodayCR && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      )}
                    >
                      {hasOverride && (
                        <div className="absolute top-0.5 right-0.5">
                          <Pencil className="h-2 w-2 text-amber-500" />
                        </div>
                      )}
                      <span className={cn(
                        'text-xs font-medium',
                        hasData && 'text-emerald-700 dark:text-emerald-400',
                        isMissing && 'text-muted-foreground',
                        !hasData && !isMissing && 'text-foreground',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {entry && <CellIndicator entry={entry} />}
                    </button>
                  );

                  if (hasData && entry) {
                    return (
                      <HoverCard key={ds} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          {dayContent}
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 p-3" side="top" sideOffset={8}>
                          <DayTooltipContent entry={entry} date={day} />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  }
                  return <div key={ds}>{dayContent}</div>;
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">Historias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Ventas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Pencil className="h-2.5 w-2.5 text-amber-500" />
                  <span className="text-[10px] text-muted-foreground">Ajuste manual</span>
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

          {/* Area Chart */}
          {chartEntries.length > 1 && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-3">
                <TrendingUp className="h-3 w-3" />
                Tendencia del periodo
              </p>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={chartEntries}>
                  <defs>
                    <linearGradient id="gradStories" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="stories" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradStories)" dot={false} name="Historias" />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#gradRevenue)" dot={false} name="Ventas ₡" />
                </AreaChart>
              </ChartContainer>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Historias: {totalStories}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: 'hsl(142 71% 45%)' }} />
                  <span>Ventas: {formatCRC(totalRevenue)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Pencil className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Ajuste manual</p>
                <p className="text-xs font-normal text-muted-foreground capitalize">
                  {format(editDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Auto data info */}
          {currentEntry && (currentEntry.auto_stories || 0) + (currentEntry.auto_revenue || 0) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/40 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Datos automáticos</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Film className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">Historias:</span>
                  <span className="text-xs font-semibold">{currentEntry.auto_stories || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Ventas:</span>
                  <span className="text-xs font-semibold">{formatCurrency(currentEntry.auto_revenue || 0, currentEntry.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">
              Estos valores se <strong>suman</strong> a los datos automáticos del día.
            </p>
            <div>
              <Label className="text-xs">Historias adicionales</Label>
              <Input type="number" min={0} value={overrideStories} onChange={(e) => setOverrideStories(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Ventas adicionales</Label>
              <div className="flex gap-1.5">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={0} value={overrideRevenue} onChange={(e) => setOverrideRevenue(e.target.value)} placeholder="0" className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Historias no capturadas por el sistema..." rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {currentEntry?.has_override && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={handleDeleteOverride} disabled={deleteOverride.isPending}>
                <Trash2 className="h-3.5 w-3.5" />
                Quitar ajuste
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={upsertEntry.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
