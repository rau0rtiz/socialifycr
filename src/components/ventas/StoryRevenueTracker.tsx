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

// Mini dots for calendar cells
const CellIndicator = ({ entry }: { entry: DailyStoryEntry }) => {
  const hasStories = entry.stories_count > 0;
  const hasRevenue = entry.daily_revenue > 0;
  if (!hasStories && !hasRevenue) return null;
  return (
    <div className="flex gap-[3px] justify-center mt-[2px]">
      {hasStories && (
        <div
          className="rounded-full bg-primary"
          style={{ width: Math.min(4 + entry.stories_count * 0.8, 8), height: Math.min(4 + entry.stories_count * 0.8, 8) }}
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
  <div className="space-y-2 p-1">
    <p className="text-xs font-semibold text-foreground capitalize">
      {format(date, "EEEE d 'de' MMMM", { locale: es })}
    </p>
    <Separator />
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-1.5">
        <Film className="h-3 w-3 text-primary" />
        <span className="text-xs text-muted-foreground">Historias</span>
        <span className="text-xs font-bold ml-auto">{entry.stories_count}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wallet className="h-3 w-3 text-emerald-500" />
        <span className="text-xs text-muted-foreground">Ventas</span>
        <span className="text-xs font-bold ml-auto">{formatCurrency(entry.daily_revenue, entry.currency)}</span>
      </div>
    </div>
    {entry.notes && (
      <>
        <Separator />
        <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
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

  // Build calendar grid
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

  // Chart data
  const chartEntries = chartData.map((e) => ({
    date: format(new Date(e.track_date + 'T12:00:00'), 'dd/MM', { locale: es }),
    stories: e.stories_count,
    revenue: e.daily_revenue,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{totals.stories_count}</p>
              <p className="text-xs text-muted-foreground">Historias este mes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(totals.daily_revenue, currency)}</p>
              <p className="text-xs text-muted-foreground">Ventas por historias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-sm font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-[2px]">
            {calendarDays.map((day) => {
              const ds = format(day, 'yyyy-MM-dd');
              const entry = entriesByDate[ds];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, crToday);
              const future = isFuture(day) && !isToday;
              const hasData = !!entry && (entry.stories_count > 0 || entry.daily_revenue > 0);

              const cellContent = (
                <button
                  disabled={future}
                  onClick={() => !future && openEditor(day)}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-md p-1 aspect-square transition-all text-xs',
                    isCurrentMonth ? 'hover:bg-muted/60' : 'opacity-30',
                    isToday && 'ring-1 ring-primary/50 bg-primary/5',
                    future && 'cursor-default opacity-40',
                    hasData && 'bg-muted/30',
                  )}
                >
                  <span className={cn(
                    'text-[11px] font-medium',
                    isToday ? 'text-primary font-bold' : 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </span>
                  {entry && <CellIndicator entry={entry} />}
                </button>
              );

              if (hasData) {
                return (
                  <HoverCard key={ds} openDelay={200}>
                    <HoverCardTrigger asChild>{cellContent}</HoverCardTrigger>
                    <HoverCardContent side="top" className="w-56 p-3">
                      <DayTooltipContent entry={entry} date={day} />
                    </HoverCardContent>
                  </HoverCard>
                );
              }
              return <div key={ds}>{cellContent}</div>;
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Historias
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ventas
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {chartEntries.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tendencia (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize text-base">
              {format(editDate, "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Historias subidas</Label>
              <Input
                type="number"
                min={0}
                value={storiesCount}
                onChange={(e) => setStoriesCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Ventas del día</Label>
              <div className="flex gap-1.5">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={dailyRevenue}
                  onChange={(e) => setDailyRevenue(e.target.value)}
                  placeholder="0"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Promo fin de semana..."
                rows={2}
              />
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
