import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSetterDailyReports, DailyReportInput, SetterDailyReport } from '@/hooks/use-setter-daily-reports';
import { CalendarDays, MessageCircle, Phone, Users, FileText, ChevronLeft, ChevronRight, Flame, TrendingUp } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, getDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isSameMonth, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SetterDailyCalendarProps {
  clientId: string;
}

const getCostaRicaToday = () => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
};

// Mini sparkline SVG component
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

// Metric dots for calendar cells
const MetricDots = ({ report }: { report: SetterDailyReport }) => {
  const metrics = [
    { value: report.ig_conversations, color: 'bg-pink-500' },
    { value: report.wa_conversations, color: 'bg-green-500' },
    { value: report.followups, color: 'bg-blue-500' },
    { value: report.appointments_made, color: 'bg-purple-500' },
  ];
  const active = metrics.filter(m => m.value > 0);
  if (active.length === 0) return null;
  return (
    <div className="flex gap-[2px] justify-center mt-[2px]">
      {active.map((m, i) => (
        <div key={i} className={cn('rounded-full', m.color)} style={{ width: Math.min(4 + m.value * 0.5, 7), height: Math.min(4 + m.value * 0.5, 7) }} />
      ))}
    </div>
  );
};

// Day tooltip content
const DayTooltipContent = ({ report, date }: { report: SetterDailyReport; date: Date }) => (
  <div className="space-y-2.5 p-1">
    <p className="text-xs font-semibold text-foreground capitalize">
      {format(date, "EEEE d 'de' MMMM", { locale: es })}
    </p>
    <Separator />
    <div className="grid grid-cols-2 gap-2">
      {[
        { icon: MessageCircle, label: 'IG', value: report.ig_conversations, color: 'text-pink-500' },
        { icon: Phone, label: 'WA', value: report.wa_conversations, color: 'text-green-500' },
        { icon: Users, label: 'Seguim.', value: report.followups, color: 'text-blue-500' },
        { icon: CalendarDays, label: 'Agendas', value: report.appointments_made, color: 'text-purple-500' },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <Icon className={cn('h-3 w-3', color)} />
          <span className="text-[11px] text-muted-foreground">{label}:</span>
          <span className="text-[11px] font-semibold text-foreground">{value}</span>
        </div>
      ))}
    </div>
    {report.day_notes && (
      <>
        <Separator />
        <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{report.day_notes}"</p>
      </>
    )}
  </div>
);

export const SetterDailyCalendar = ({ clientId }: SetterDailyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { reports, reportsByDate, isLoading, upsertReport } = useSetterDailyReports(clientId, currentMonth);

  // Form state
  const [igConversations, setIgConversations] = useState(0);
  const [waConversations, setWaConversations] = useState(0);
  const [followups, setFollowups] = useState(0);
  const [appointmentsMade, setAppointmentsMade] = useState(0);
  const [dayNotes, setDayNotes] = useState('');

  const crToday = getCostaRicaToday();

  const handleDayClick = (date: Date) => {
    if (isFuture(date)) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = reportsByDate[dateStr];
    setSelectedDate(date);
    setIgConversations(existing?.ig_conversations || 0);
    setWaConversations(existing?.wa_conversations || 0);
    setFollowups(existing?.followups || 0);
    setAppointmentsMade(existing?.appointments_made || 0);
    setDayNotes(existing?.day_notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const input: DailyReportInput = {
      report_date: format(selectedDate, 'yyyy-MM-dd'),
      ig_conversations: igConversations,
      wa_conversations: waConversations,
      followups,
      appointments_made: appointmentsMade,
      day_notes: dayNotes || undefined,
    };
    try {
      await upsertReport.mutateAsync(input);
      toast.success('Reporte guardado');
      setDialogOpen(false);
    } catch {
      toast.error('Error guardando reporte');
    }
  };

  // Calendar grid computation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const reportedDates = new Set(reports.map(r => r.report_date));

  // Streak calculation
  const streak = useMemo(() => {
    let count = 0;
    let checkDate = crToday;
    // If today has no report yet, start from yesterday
    if (!reportedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
      checkDate = subDays(checkDate, 1);
    }
    while (true) {
      const dayOfWeek = getDay(checkDate);
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        checkDate = subDays(checkDate, 1);
        continue;
      }
      if (reportedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        count++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return count;
  }, [reports, crToday]);

  // % reported calculation
  const { reportedCount, workdayCount } = useMemo(() => {
    let workdays = 0;
    let reported = 0;
    daysInMonth.forEach(d => {
      const dow = getDay(d);
      if (dow !== 0 && dow !== 6 && !isFuture(d)) {
        workdays++;
        if (reportedDates.has(format(d, 'yyyy-MM-dd'))) reported++;
      }
    });
    return { reportedCount: reported, workdayCount: workdays };
  }, [daysInMonth, reportedDates]);

  const reportPercentage = workdayCount > 0 ? Math.round((reportedCount / workdayCount) * 100) : 0;

  // Sparkline data: daily values for the month
  const sparklineData = useMemo(() => {
    const sorted = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
    return {
      ig: sorted.map(r => r.ig_conversations),
      wa: sorted.map(r => r.wa_conversations),
      followups: sorted.map(r => r.followups),
      appointments: sorted.map(r => r.appointments_made),
    };
  }, [reports]);

  const totals = reports.reduce(
    (acc, r) => ({
      ig: acc.ig + r.ig_conversations,
      wa: acc.wa + r.wa_conversations,
      followups: acc.followups + r.followups,
      appointments: acc.appointments + r.appointments_made,
    }),
    { ig: 0, wa: 0, followups: 0, appointments: 0 }
  );

  const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <>
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            Reporte diario del Setter
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
                {weekDayLabels.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const report = reportsByDate[dateStr];
                  const isReported = !!report;
                  const isTodayCR = isSameDay(day, crToday);
                  const isFutureDay = isFuture(day);
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  const isMissing = isCurrentMonth && !isReported && !isFutureDay && !isWeekend;

                  const dayContent = (
                    <button
                      onClick={() => !isFutureDay && isCurrentMonth && handleDayClick(day)}
                      disabled={isFutureDay || !isCurrentMonth}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl aspect-square w-full transition-all duration-200',
                        !isCurrentMonth && 'opacity-20 cursor-default',
                        isCurrentMonth && !isFutureDay && 'cursor-pointer hover:scale-105 hover:shadow-sm',
                        isFutureDay && isCurrentMonth && 'opacity-40 cursor-default',
                        isReported && 'bg-emerald-500/10 dark:bg-emerald-500/15',
                        isMissing && 'bg-muted/40',
                        isTodayCR && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium',
                        isReported && 'text-emerald-700 dark:text-emerald-400',
                        isMissing && 'text-muted-foreground',
                        !isReported && !isMissing && 'text-foreground',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {isReported && report && <MetricDots report={report} />}
                      {isMissing && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400/70" />
                      )}
                    </button>
                  );

                  if (isReported && report) {
                    return (
                      <HoverCard key={dateStr} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          {dayContent}
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 p-3" side="top" sideOffset={8}>
                          <DayTooltipContent report={report} date={day} />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  }

                  return <div key={dateStr}>{dayContent}</div>;
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                  <span className="text-[10px] text-muted-foreground">Con reporte</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                  <span className="text-[10px] text-muted-foreground">Sin reporte</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" />
                  <span className="text-[10px] text-muted-foreground">Hoy</span>
                </div>
              </div>
            </div>

            {/* Sidebar panel */}
            <div className="lg:w-56 space-y-4">
              {/* Streak & progress */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/10">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{streak}</p>
                    <p className="text-[10px] text-muted-foreground">días de racha</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Cobertura del mes</span>
                    <span className="text-xs font-semibold text-foreground">{reportPercentage}%</span>
                  </div>
                  <Progress value={reportPercentage} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">{reportedCount} de {workdayCount} días hábiles</p>
                </div>
              </div>

              <Separator />

              {/* Metric summary cards with sparklines */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Resumen del mes
                </p>
                {[
                  { icon: MessageCircle, label: 'Conv. Instagram', value: totals.ig, color: 'text-pink-500', sparkColor: '#ec4899', bgFrom: 'from-pink-500/10', bgTo: 'to-pink-500/0', borderColor: 'border-pink-500/15', data: sparklineData.ig },
                  { icon: Phone, label: 'Conv. WhatsApp', value: totals.wa, color: 'text-green-500', sparkColor: '#22c55e', bgFrom: 'from-green-500/10', bgTo: 'to-green-500/0', borderColor: 'border-green-500/15', data: sparklineData.wa },
                  { icon: Users, label: 'Seguimientos', value: totals.followups, color: 'text-blue-500', sparkColor: '#3b82f6', bgFrom: 'from-blue-500/10', bgTo: 'to-blue-500/0', borderColor: 'border-blue-500/15', data: sparklineData.followups },
                  { icon: CalendarDays, label: 'Agendas', value: totals.appointments, color: 'text-purple-500', sparkColor: '#a855f7', bgFrom: 'from-purple-500/10', bgTo: 'to-purple-500/0', borderColor: 'border-purple-500/15', data: sparklineData.appointments },
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day report dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Reporte del día</p>
                <p className="text-xs font-normal text-muted-foreground capitalize">
                  {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : ''}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MessageCircle, color: 'border-l-pink-500', label: 'Conv. Instagram', value: igConversations, set: setIgConversations },
                { icon: Phone, color: 'border-l-green-500', label: 'Conv. WhatsApp', value: waConversations, set: setWaConversations },
                { icon: Users, color: 'border-l-blue-500', label: 'Seguimientos', value: followups, set: setFollowups },
                { icon: CalendarDays, color: 'border-l-purple-500', label: 'Agendas realizadas', value: appointmentsMade, set: setAppointmentsMade },
              ].map(({ icon: Icon, color, label, value, set }) => (
                <div key={label} className={cn('border-l-[3px] pl-3 rounded-r-lg', color)}>
                  <Label className="text-[10px] flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                    <Icon className="h-3 w-3" /> {label}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={value}
                    onChange={e => set(parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
            <Separator />
            <div>
              <Label className="text-[10px] mb-1.5 block text-muted-foreground">Notas / Sensación del día</Label>
              <Textarea
                value={dayNotes}
                onChange={e => setDayNotes(e.target.value)}
                placeholder="¿Cómo estuvo el día? ¿Qué observaste?"
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={upsertReport.isPending} size="sm">
              {upsertReport.isPending ? 'Guardando...' : 'Guardar reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
