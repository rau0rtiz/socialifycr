import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSetterDailyReports, DailyReportInput } from '@/hooks/use-setter-daily-reports';
import { CalendarDays, MessageCircle, Phone, Users, FileText } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SetterDailyCalendarProps {
  clientId: string;
}

// Get current date in Costa Rica timezone
const getCostaRicaToday = () => {
  const now = new Date();
  const crTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  return crTime;
};

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

  // Get all days in the current month for color coding
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const reportedDates = new Set(reports.map(r => r.report_date));
  
  // Days with reports (green) and without (red, only past non-weekend days)
  const greenDays = daysInMonth.filter(d => reportedDates.has(format(d, 'yyyy-MM-dd')));
  const redDays = daysInMonth.filter(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayOfWeek = d.getDay();
    return !reportedDates.has(dateStr) && !isFuture(d) && dayOfWeek !== 0 && dayOfWeek !== 6;
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Reporte diario del Setter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Calendar
                mode="single"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                onSelect={(date) => date && handleDayClick(date)}
                locale={es}
                className="p-3 pointer-events-auto"
                modifiers={{
                  reported: greenDays,
                  missing: redDays,
                  crToday: [crToday],
                }}
                modifiersClassNames={{
                  reported: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30 font-semibold',
                  missing: 'bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25',
                  crToday: 'ring-2 ring-primary ring-offset-1',
                }}
                disabled={(date) => isFuture(date)}
              />
            </div>

            {/* Monthly summary alongside calendar */}
            <div className="flex-1 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Resumen {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard icon={MessageCircle} label="Conv. IG" value={reports.reduce((s, r) => s + r.ig_conversations, 0)} color="text-pink-500" />
                <SummaryCard icon={Phone} label="Conv. WA" value={reports.reduce((s, r) => s + r.wa_conversations, 0)} color="text-green-500" />
                <SummaryCard icon={Users} label="Seguimientos" value={reports.reduce((s, r) => s + r.followups, 0)} color="text-blue-500" />
                <SummaryCard icon={CalendarDays} label="Agendas" value={reports.reduce((s, r) => s + r.appointments_made, 0)} color="text-purple-500" />
              </div>
              <div className="flex gap-2 text-[10px] text-muted-foreground mt-2">
                <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  Con reporte
                </Badge>
                <Badge variant="outline" className="bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400">
                  Sin reporte
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day report dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reporte — {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <MessageCircle className="h-3 w-3 text-pink-500" /> Conv. Instagram
                </Label>
                <Input type="number" min={0} value={igConversations} onChange={e => setIgConversations(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3 w-3 text-green-500" /> Conv. WhatsApp
                </Label>
                <Input type="number" min={0} value={waConversations} onChange={e => setWaConversations(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3 w-3 text-blue-500" /> Seguimientos
                </Label>
                <Input type="number" min={0} value={followups} onChange={e => setFollowups(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <CalendarDays className="h-3 w-3 text-purple-500" /> Agendas realizadas
                </Label>
                <Input type="number" min={0} value={appointmentsMade} onChange={e => setAppointmentsMade(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Notas / Sensación del día</Label>
              <Textarea
                value={dayNotes}
                onChange={e => setDayNotes(e.target.value)}
                placeholder="¿Cómo estuvo el día? ¿Qué observaste?"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsertReport.isPending}>
              {upsertReport.isPending ? 'Guardando...' : 'Guardar reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SummaryCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) => (
  <div className="p-2.5 rounded-lg border border-border bg-muted/30">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={cn('h-3 w-3', color)} />
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);
