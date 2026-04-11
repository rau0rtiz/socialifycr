import { useState, useMemo, useEffect } from 'react';
import { useClassGroups } from '@/hooks/use-class-groups';
import { useAttendance } from '@/hooks/use-attendance';
import { useStudentContacts } from '@/hooks/use-student-contacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Users, Clock, CheckCircle2, XCircle, LogIn, LogOut, GraduationCap, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceTrackerProps {
  clientId: string;
}

type AttendanceMode = 'check_in' | 'check_out';

/** Get current time in Costa Rica (UTC-6) */
const getCRTime = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc - 6 * 3600000);
};

/** Check if we're within 10 minutes of class end for any schedule today */
const shouldShowCheckout = (schedules: { day: string; start: string; end: string }[]): boolean => {
  const crNow = getCRTime();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const todayName = dayNames[crNow.getDay()];

  for (const s of schedules) {
    if (s.day.toLowerCase() !== todayName) continue;
    const [endH, endM] = s.end.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const nowMinutes = crNow.getHours() * 60 + crNow.getMinutes();
    // 10 minutes before end until after end
    if (nowMinutes >= endMinutes - 10) return true;
  }
  return false;
};

export const AttendanceTracker = ({ clientId }: AttendanceTrackerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [calOpen, setCalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [mode, setMode] = useState<AttendanceMode>('check_in');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { groups, getGroupMembers } = useClassGroups(clientId);
  const { students } = useStudentContacts(clientId);
  const { records, upsertAttendance, summary } = useAttendance(clientId, dateStr, selectedGroupId || undefined);

  const activeGroups = groups.filter(g => g.status === 'active');
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Auto-switch mode based on class schedule
  useEffect(() => {
    if (!selectedGroup?.schedules?.length) return;
    const check = () => setMode(shouldShowCheckout(selectedGroup.schedules) ? 'check_out' : 'check_in');
    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [selectedGroup]);

  const groupStudents = useMemo(() => {
    if (!selectedGroupId) return [];
    const members = getGroupMembers(selectedGroupId);
    return members.map(m => {
      const student = students.find(s => s.id === m.student_contact_id);
      return { memberId: m.id, studentId: m.student_contact_id, name: student?.full_name || 'Desconocido', age: student?.age };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedGroupId, students, getGroupMembers]);

  const getStudentRecord = (studentId: string) => records.find(r => r.student_contact_id === studentId);

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent') => {
    try {
      await upsertAttendance.mutateAsync({
        student_contact_id: studentId,
        group_id: selectedGroupId || undefined,
        class_date: dateStr,
        status,
        check_in: status === 'present' ? new Date().toISOString() : null,
      });
      toast.success(status === 'present' ? 'Asistencia marcada' : 'Ausencia registrada');
    } catch {
      toast.error('Error al marcar asistencia');
    }
    setSelectedStudentId(null);
  };

  const handleCheckOut = async (studentId: string) => {
    try {
      await upsertAttendance.mutateAsync({
        student_contact_id: studentId,
        group_id: selectedGroupId || undefined,
        class_date: dateStr,
        check_out: new Date().toISOString(),
      });
      toast.success('Salida registrada');
    } catch {
      toast.error('Error al registrar salida');
    }
    setSelectedStudentId(null);
  };

  const markAllPresent = async () => {
    for (const s of groupStudents) {
      const existing = getStudentRecord(s.studentId);
      if (!existing) {
        await upsertAttendance.mutateAsync({
          student_contact_id: s.studentId,
          group_id: selectedGroupId || undefined,
          class_date: dateStr,
          status: 'present',
          check_in: new Date().toISOString(),
        });
      }
    }
    toast.success('Todos marcados como presentes');
  };

  const getStudentColor = (studentId: string): { bg: string; border: string; text: string; label: string } => {
    const record = getStudentRecord(studentId);
    if (!record) return { bg: 'bg-muted/40', border: 'border-border/60', text: 'text-muted-foreground', label: 'Sin marcar' };
    if (record.status === 'present' && record.check_out) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-700', label: 'Salida ✓' };
    if (record.status === 'present') return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-700', label: 'Presente' };
    if (record.status === 'late') return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-700', label: 'Tardanza' };
    if (record.status === 'absent') return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-700', label: 'Ausente' };
    return { bg: 'bg-muted/40', border: 'border-border/60', text: 'text-muted-foreground', label: '' };
  };

  const selectedStudentData = groupStudents.find(s => s.studentId === selectedStudentId);
  const selectedRecord = selectedStudentId ? getStudentRecord(selectedStudentId) : undefined;

  // Today's schedule info for selected group
  const todaySchedule = useMemo(() => {
    if (!selectedGroup?.schedules?.length) return null;
    const crNow = getCRTime();
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const todayName = dayNames[crNow.getDay()];
    return selectedGroup.schedules.find(s => s.day.toLowerCase() === todayName) || null;
  }, [selectedGroup]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Asistencia</h2>
            <p className="text-xs text-muted-foreground">Control de entrada y salida de estudiantes</p>
          </div>
        </div>

        {/* Mode indicator */}
        {selectedGroupId && (
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'check_in' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => setMode('check_in')}
            >
              <LogIn className="h-3.5 w-3.5" /> Entrada
            </Button>
            <Button
              variant={mode === 'check_out' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => setMode('check_out')}
            >
              <LogOut className="h-3.5 w-3.5" /> Salida
            </Button>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(selectedDate, 'EEEE dd MMM', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={d => { if (d) { setSelectedDate(d); setCalOpen(false); } }}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedGroupId || '_none'} onValueChange={v => setSelectedGroupId(v === '_none' ? '' : v)}>
              <SelectTrigger className="h-9 text-xs flex-1 min-w-[200px]">
                <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Seleccionar grupo</SelectItem>
                {activeGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedGroupId && mode === 'check_in' && (
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 ml-auto" onClick={markAllPresent}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Todos presentes
              </Button>
            )}
          </div>

          {/* Schedule + Summary row */}
          {selectedGroupId && (
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {selectedGroup?.schedules?.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] py-0.5 gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span className="capitalize">{s.day}</span> {s.start}–{s.end}
                </Badge>
              ))}

              {todaySchedule && (
                <Badge variant={mode === 'check_out' ? 'default' : 'secondary'} className="text-[10px] py-0.5 gap-1 ml-auto">
                  {mode === 'check_out' ? <LogOut className="h-2.5 w-2.5" /> : <LogIn className="h-2.5 w-2.5" />}
                  {mode === 'check_out' ? 'Modo salida activo' : `Clase hoy ${todaySchedule.start}–${todaySchedule.end}`}
                </Badge>
              )}

              {groupStudents.length > 0 && (
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-green-600 font-medium">{summary.presentCount} ✓</span>
                  <span className="text-red-500 font-medium">{summary.absentCount} ✗</span>
                  <span className="text-muted-foreground">{summary.attendanceRate}%</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Grid */}
      {!selectedGroupId ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Selecciona un grupo para tomar asistencia</p>
          </CardContent>
        </Card>
      ) : groupStudents.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No hay alumnos inscritos en este grupo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {groupStudents.map(s => {
            const colors = getStudentColor(s.studentId);
            const record = getStudentRecord(s.studentId);
            return (
              <button
                key={s.studentId}
                onClick={() => setSelectedStudentId(s.studentId)}
                className={cn(
                  'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200',
                  'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                  colors.bg, colors.border,
                )}
              >
                {/* Avatar circle */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1.5',
                  colors.bg, colors.text,
                  'border', colors.border,
                )}>
                  {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Name */}
                <p className={cn('text-[11px] font-medium text-center leading-tight truncate w-full', colors.text)}>
                  {s.name.split(' ')[0]}
                </p>

                {/* Status label */}
                <span className={cn('text-[9px] mt-0.5', colors.text)}>
                  {colors.label}
                </span>

                {/* Time indicator */}
                {record?.check_in && (
                  <span className="text-[8px] text-muted-foreground mt-0.5">
                    {format(new Date(record.check_in), 'HH:mm')}
                    {record.check_out && ` → ${format(new Date(record.check_out), 'HH:mm')}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Student Action Dialog */}
      <Dialog open={!!selectedStudentId} onOpenChange={v => { if (!v) setSelectedStudentId(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base text-center">
              {selectedStudentData?.name || ''}
            </DialogTitle>
            {selectedStudentData?.age && (
              <p className="text-xs text-muted-foreground text-center">{selectedStudentData.age} años</p>
            )}
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Current status */}
            {selectedRecord && (
              <div className="text-center">
                <Badge className={cn(
                  'text-xs py-1 px-3',
                  selectedRecord.status === 'present' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                  selectedRecord.status === 'absent' ? 'bg-red-500/10 text-red-700 border-red-500/20' :
                  'bg-amber-500/10 text-amber-700 border-amber-500/20'
                )}>
                  {selectedRecord.status === 'present' ? 'Presente' : selectedRecord.status === 'absent' ? 'Ausente' : 'Tardanza'}
                  {selectedRecord.check_in && ` • ${format(new Date(selectedRecord.check_in), 'HH:mm')}`}
                </Badge>
              </div>
            )}

            {/* Actions based on mode */}
            {mode === 'check_in' ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-20 flex-col gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleMarkAttendance(selectedStudentId!, 'present')}
                >
                  <CheckCircle2 className="h-7 w-7" />
                  <span className="text-xs font-semibold">Asistió</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-20 flex-col gap-2 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  onClick={() => handleMarkAttendance(selectedStudentId!, 'absent')}
                >
                  <XCircle className="h-7 w-7" />
                  <span className="text-xs font-semibold">No Asistió</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRecord?.status === 'present' && !selectedRecord?.check_out ? (
                  <Button
                    size="lg"
                    className="w-full h-16 flex-col gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleCheckOut(selectedStudentId!)}
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="text-xs font-semibold">Marcar Salida</span>
                  </Button>
                ) : selectedRecord?.check_out ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Salida registrada a las {format(new Date(selectedRecord.check_out), 'hh:mm a')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {selectedRecord?.status === 'absent' ? 'El estudiante está marcado como ausente' : 'Primero marca la entrada del estudiante'}
                    </p>
                    {/* Allow marking attendance even in checkout mode */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Button
                        size="lg"
                        className="h-16 flex-col gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleMarkAttendance(selectedStudentId!, 'present')}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-[10px] font-semibold">Asistió</span>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-16 flex-col gap-1.5 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10"
                        onClick={() => handleMarkAttendance(selectedStudentId!, 'absent')}
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="text-[10px] font-semibold">No Asistió</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
