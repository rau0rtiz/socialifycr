import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useDailyStoryTracker, DailyStoryInput } from '@/hooks/use-daily-story-tracker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, ResponsiveContainer } from 'recharts';
import { CalendarIcon, Plus, Save, TrendingUp, Film, Wallet } from 'lucide-react';
import { format } from 'date-fns';
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

export const StoryRevenueTracker = ({ clientId }: StoryRevenueTrackerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { entries, entriesByDate, totals, chartData, upsertEntry } = useDailyStoryTracker(clientId);

  const existing = entriesByDate[dateStr];
  const [storiesCount, setStoriesCount] = useState(existing?.stories_count?.toString() || '');
  const [dailyRevenue, setDailyRevenue] = useState(existing?.daily_revenue?.toString() || '');
  const [currency, setCurrency] = useState(existing?.currency || 'CRC');
  const [notes, setNotes] = useState(existing?.notes || '');

  // Sync form when date changes
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setCalOpen(false);
    const ds = format(date, 'yyyy-MM-dd');
    const entry = entriesByDate[ds];
    setStoriesCount(entry?.stories_count?.toString() || '');
    setDailyRevenue(entry?.daily_revenue?.toString() || '');
    setCurrency(entry?.currency || 'CRC');
    setNotes(entry?.notes || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    const input: DailyStoryInput = {
      track_date: dateStr,
      stories_count: parseInt(storiesCount) || 0,
      daily_revenue: parseFloat(dailyRevenue) || 0,
      currency,
      notes: notes || undefined,
    };
    try {
      await upsertEntry.mutateAsync(input);
      toast.success('Registro guardado');
      setFormOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  // Prepare chart data
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

      {/* Trend Chart */}
      {chartEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tendencia (últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <ComposedChart data={chartEntries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="stories"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  name="Historias"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(142 71% 45%)' }}
                  name="Ventas"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Entry */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Registrar día</CardTitle>
            {!formOpen && (
              <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            )}
          </div>
        </CardHeader>
        {formOpen && (
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(selectedDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={upsertEntry.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Guardar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recent entries list */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registros del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {entries.slice().reverse().map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleDateSelect(new Date(e.track_date + 'T12:00:00'))}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14">
                      {format(new Date(e.track_date + 'T12:00:00'), 'dd MMM', { locale: es })}
                    </span>
                    <span className="text-sm">
                      <Film className="h-3.5 w-3.5 inline mr-1 text-primary" />
                      {e.stories_count}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(e.daily_revenue, e.currency)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
