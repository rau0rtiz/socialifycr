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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useDailyStoryTracker, DailyStoryInput, DailyStoryEntry } from '@/hooks/use-daily-story-tracker';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  CalendarDays, ChevronLeft, ChevronRight, Film, Wallet,
  TrendingUp, Save,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, getDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isSameDay,
  addWeeks, subWeeks, isSameWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StoryRevenueTrackerProps {
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const chartConfig = {
  stories: { label: 'Historias', color: 'hsl(var(--primary))' },
  revenue: { label: 'Ventas', color: 'hsl(142 71% 45%)' },
};

const getCostaRicaToday = () => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Sparkline SVG
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

// Mini dots for calendar cells
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

// Day hover tooltip
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
    {entry.notes && (
      <>
        <Separator />
        <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{entry.notes}"</p>
      </>
    )}
  </div>
);

export const StoryRevenueTracker = ({ clientId }: StoryRevenueTrackerProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());

  const { entries, entriesByDate, totals, chartData, upsertEntry } = useDailyStoryTracker(clientId, currentMonth);

  // Form state
  const [storiesCount, setStoriesCount] = useState('');
  const [dailyRevenue, setDailyRevenue] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [notes, setNotes] = useState('');

  const crToday = getCostaRicaToday();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const openEditor = (date: Date) => {
    setEditDate(date);
    const ds = format(date, 'yyyy-MM-dd');
    const entry = entriesByDate[ds];
    setStoriesCount(entry?.stories_count?.toString() || '');
    setDailyRevenue(entry?.daily_revenue?.toString() || '');
    setCurrency(entry?.currency || 'CRC');
    setNotes(entry?.notes || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    const input: DailyStoryInput = {
      track_date: format(editDate, 'yyyy-MM-dd'),
      stories_count: parseInt(storiesCount) || 0,
      daily_revenue: parseFloat(dailyRevenue) || 0,
      currency,
      notes: notes || undefined,
    };
    try {
      await upsertEntry.mutateAsync(input);
      toast.success('Registro guardado');
      setEditOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  // Sparkline data
  const sparklineData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.track_date.localeCompare(b.track_date));
    return {
      stories: sorted.map(e => e.stories_count),
      revenue: sorted.map(e => e.daily_revenue),
    };
  }, [entries]);

  // Reported days set
  const reportedDates = useMemo(() => new Set(entries.map(e => e.track_date)), [entries]);

  // Chart data
  const chartEntries = chartData.map((e) => ({
    date: format(new Date(e.track_date + 'T12:00:00'), 'dd/MM', { locale: es }),
    stories: e.stories_count,
    revenue: e.daily_revenue,
  }));

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const { reportedCount, trackableDays } = useMemo(() => {
    let trackable = 0;
    let reported = 0;
    daysInMonth.forEach(d => {
      if (!isFuture(d)) {
        trackable++;
        if (reportedDates.has(format(d, 'yyyy-MM-dd'))) reported++;
      }
    });
    return { reportedCount: reported, trackableDays: trackable };
  }, [daysInMonth, reportedDates]);

  return (
    <div className="space-y-4">
      {/* Calendar Card - Setter style */}
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Film className="h-4 w-4 text-primary" />
            </div>
            Tracker de Historias y Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar */}
            <div className="flex-1 min-w-0">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-semibold text-foreground capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const entry = entriesByDate[ds];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayCR = isSameDay(day, crToday);
                  const future = isFuture(day) && !isTodayCR;
                  const hasData = !!entry && (entry.stories_count > 0 || entry.daily_revenue > 0);
                  const isMissing = isCurrentMonth && !hasData && !future;

                  const dayContent = (
                    <button
                      onClick={() => !future && isCurrentMonth && openEditor(day)}
                      disabled={future || !isCurrentMonth}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl aspect-square w-full transition-all duration-200',
                        !isCurrentMonth && 'opacity-20 cursor-default',
                        isCurrentMonth && !future && 'cursor-pointer hover:scale-105 hover:shadow-sm',
                        future && isCurrentMonth && 'opacity-40 cursor-default',
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
                    </button>
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

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">Historias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Ventas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" />
                  <span className="text-[10px] text-muted-foreground">Hoy</span>
                </div>
              </div>
            </div>

            {/* Sidebar panel */}
            <div className="lg:w-56 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Resumen del mes
                </p>
                {[
                  { icon: Film, label: 'Historias', value: totals.stories_count, color: 'text-primary', sparkColor: 'hsl(var(--primary))', bgFrom: 'from-primary/10', bgTo: 'to-primary/0', borderColor: 'border-primary/15', data: sparklineData.stories },
                  { icon: Wallet, label: 'Ventas', value: formatCurrency(totals.daily_revenue, currency), color: 'text-emerald-500', sparkColor: '#22c55e', bgFrom: 'from-emerald-500/10', bgTo: 'to-emerald-500/0', borderColor: 'border-emerald-500/15', data: sparklineData.revenue },
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

                {/* Reported progress */}
                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Días registrados
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

      {/* Trend Chart */}
      {chartEntries.length > 1 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-muted">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              Tendencia (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ComposedChart data={chartEntries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="stories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={16} name="Historias" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(142 71% 45%)' }} name="Ventas" />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Film className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Registro del día</p>
                <p className="text-xs font-normal text-muted-foreground capitalize">
                  {format(editDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Historias subidas</Label>
              <Input type="number" min={0} value={storiesCount} onChange={(e) => setStoriesCount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Ventas del día</Label>
              <div className="flex gap-1.5">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={0} value={dailyRevenue} onChange={(e) => setDailyRevenue(e.target.value)} placeholder="0" className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Promo fin de semana..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={upsertEntry.isPending} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
