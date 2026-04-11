import { useState, useMemo } from 'react';
import { useClassGroups } from '@/hooks/use-class-groups';
import { useAttendance } from '@/hooks/use-attendance';
import { useStudentContacts } from '@/hooks/use-student-contacts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Users, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceTrackerProps {
  clientId: string;
}

export const AttendanceTracker = ({ clientId }: AttendanceTrackerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [calOpen, setCalOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { groups, getGroupMembers } = useClassGroups(clientId);
  const { students } = useStudentContacts(clientId);
  const { records, upsertAttendance, summary } = useAttendance(clientId, dateStr, selectedGroupId || undefined);

  const activeGroups = groups.filter(g => g.status === 'active');

  const groupStudents = useMemo(() => {
    if (!selectedGroupId) return [];
    const members = getGroupMembers(selectedGroupId);
    return members.map(m => {
      const student = students.find(s => s.id === m.student_contact_id);
      return { memberId: m.id, studentId: m.student_contact_id, name: student?.full_name || 'Desconocido', age: student?.age };
    });
  }, [selectedGroupId, students, getGroupMembers]);

  const getStudentRecord = (studentId: string) => records.find(r => r.student_contact_id === studentId);

  const handleToggleStatus = async (studentId: string, newStatus: string) => {
    try {
      await upsertAttendance.mutateAsync({
        student_contact_id: studentId,
        group_id: selectedGroupId || undefined,
        class_date: dateStr,
        status: newStatus,
        check_in: newStatus !== 'absent' ? new Date().toISOString() : null,
      });
    } catch {
      toast.error('Error al marcar asistencia');
    }
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

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Asistencia
        </CardTitle>
        <CardDescription className="text-xs">Controla la asistencia de los estudiantes por grupo y fecha</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(selectedDate, 'dd MMM yyyy', { locale: es })}
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
            <SelectTrigger className="h-9 text-xs w-56">
              <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Seleccionar grupo</SelectItem>
              {activeGroups.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedGroupId ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Selecciona un grupo para tomar asistencia</p>
          </div>
        ) : groupStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No hay alumnos inscritos en este grupo</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-medium">{summary.presentCount}</span> presentes
              </div>
              <div className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3.5 w-3.5" />
                <span className="font-medium">{summary.absentCount}</span> ausentes
              </div>
              <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                Tasa: <span className="font-bold">{summary.attendanceRate}%</span>
              </div>
            </div>

            {/* Schedules */}
            {selectedGroup?.schedules && selectedGroup.schedules.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedGroup.schedules.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] py-0 gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="capitalize">{s.day}</span> {s.start}-{s.end}
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={markAllPresent}>
                Marcar todos presentes
              </Button>
            </div>

            {/* Student list */}
            <div className="space-y-1">
              {groupStudents.map(s => {
                const record = getStudentRecord(s.studentId);
                const status = record?.status || 'unmarked';
                return (
                  <div key={s.studentId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {s.age && <p className="text-[10px] text-muted-foreground">{s.age} años</p>}
                    </div>

                    {/* Status indicator */}
                    {status === 'present' && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Presente</Badge>}
                    {status === 'late' && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Tardanza</Badge>}
                    {status === 'absent' && <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Ausente</Badge>}

                    {/* Check-in time */}
                    {record?.check_in && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(record.check_in), 'HH:mm')}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant={status === 'present' ? 'default' : 'outline'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleStatus(s.studentId, status === 'present' ? 'absent' : 'present')}
                        title="Presente"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={status === 'late' ? 'default' : 'outline'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleStatus(s.studentId, 'late')}
                        title="Tardanza"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={status === 'absent' ? 'destructive' : 'outline'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleStatus(s.studentId, 'absent')}
                        title="Ausente"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                      {(status === 'present' || status === 'late') && !record?.check_out && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] ml-1" onClick={() => handleCheckOut(s.studentId)}>
                          Salida
                        </Button>
                      )}
                      {record?.check_out && (
                        <span className="text-[10px] text-green-600 ml-1">
                          ✓ {format(new Date(record.check_out), 'HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
