import { useState } from 'react';
import { useClassGroups, ClassGroupInput, CEFR_LEVELS, ClassGroup } from '@/hooks/use-class-groups';
import { useClientProducts } from '@/hooks/use-client-products';
import { useClientTeachers } from '@/hooks/use-client-teachers';
import { useStudentContacts } from '@/hooks/use-student-contacts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Edit2, Clock, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface GroupsManagerProps {
  clientId: string;
}

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const GroupsManager = ({ clientId }: GroupsManagerProps) => {
  const { groups, members, isLoading, addGroup, updateGroup, deleteGroup, getGroupMembers, getGroupOccupancy } = useClassGroups(clientId);
  const { products } = useClientProducts(clientId);
  const { teachers } = useClientTeachers(clientId);
  const { students } = useStudentContacts(clientId);
  const groupProducts = products.filter(p => p.category === 'group');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [englishLevel, setEnglishLevel] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classroom, setClassroom] = useState('');
  const [schedules, setSchedules] = useState<{ day: string; start: string; end: string }[]>([]);

  const resetForm = () => {
    setName(''); setProductId(''); setCapacity('10'); setAgeMin(''); setAgeMax('');
    setEnglishLevel(''); setTeacherId(''); setClassroom(''); setSchedules([]);
    setEditing(null);
  };

  const openEdit = (g: ClassGroup) => {
    setEditing(g);
    setName(g.name);
    setProductId(g.product_id);
    setCapacity(String(g.capacity));
    setAgeMin(g.age_range_min ? String(g.age_range_min) : '');
    setAgeMax(g.age_range_max ? String(g.age_range_max) : '');
    setEnglishLevel(g.english_level || '');
    setTeacherId(g.teacher_id || '');
    setClassroom(g.classroom || '');
    setSchedules(g.schedules || []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!productId) { toast.error('Selecciona un producto'); return; }
    const input: ClassGroupInput = {
      product_id: productId,
      name: name.trim(),
      capacity: parseInt(capacity) || 10,
      age_range_min: ageMin ? parseInt(ageMin) : null,
      age_range_max: ageMax ? parseInt(ageMax) : null,
      english_level: englishLevel || null,
      teacher_id: teacherId || null,
      classroom: classroom.trim() || null,
      schedules,
    };
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...input });
        toast.success('Grupo actualizado');
      } else {
        await addGroup.mutateAsync(input);
        toast.success('Grupo creado');
      }
      setShowForm(false);
      resetForm();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const addScheduleBlock = () => setSchedules(prev => [...prev, { day: 'lunes', start: '09:00', end: '10:00' }]);
  const removeScheduleBlock = (idx: number) => setSchedules(prev => prev.filter((_, i) => i !== idx));
  const updateScheduleBlock = (idx: number, field: string, value: string) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Cargando grupos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Grupos de Clases</h3>
          <p className="text-xs text-muted-foreground">Gestiona los grupos para clases grupales</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5" /> Nuevo Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No hay grupos creados</p>
            <p className="text-xs text-muted-foreground mt-1">Crea un grupo para organizar tus clases grupales</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const occ = getGroupOccupancy(g.id);
            const groupMembers = getGroupMembers(g.id);
            const prod = products.find(p => p.id === g.product_id);
            const teacher = teachers.find(t => t.id === g.teacher_id);
            const isExpanded = expandedId === g.id;
            return (
              <Card key={g.id} className="border-border/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left flex-1" onClick={() => setExpandedId(isExpanded ? null : g.id)}>
                      <CardTitle className="text-sm">{g.name}</CardTitle>
                      <CardDescription className="text-[10px] flex items-center gap-2 flex-wrap mt-1">
                        {prod && <span>{prod.name}</span>}
                        {g.english_level && <Badge variant="outline" className="text-[9px] py-0">{g.english_level}</Badge>}
                        {g.age_range_min != null && g.age_range_max != null && (
                          <span>{g.age_range_min}-{g.age_range_max} años</span>
                        )}
                        {g.classroom && <span>Aula: {g.classroom}</span>}
                      </CardDescription>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={occ >= g.capacity ? 'destructive' : 'secondary'} className="text-[10px]">
                        <Users className="h-3 w-3 mr-1" />
                        {occ}/{g.capacity}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm('¿Eliminar este grupo?')) deleteGroup.mutate(g.id, { onSuccess: () => toast.success('Grupo eliminado') });
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Schedules summary */}
                  {g.schedules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {g.schedules.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] py-0 gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="capitalize">{s.day}</span> {s.start}-{s.end}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {teacher && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> {teacher.name}
                    </p>
                  )}
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alumnos inscritos ({occ})</p>
                    {groupMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin alumnos aún</p>
                    ) : (
                      <div className="space-y-1">
                        {groupMembers.map(m => {
                          const student = students.find(s => s.id === m.student_contact_id);
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                              <span>{student?.full_name || 'Desconocido'}</span>
                              {student?.age && <span className="text-muted-foreground">{student.age} años</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Grupo A - Niños Principiantes" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Producto (grupal) *</Label>
              <Select value={productId || '_none'} onValueChange={v => setProductId(v === '_none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Seleccionar producto</SelectItem>
                  {groupProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  {groupProducts.length === 0 && <SelectItem value="_empty" disabled>No hay productos grupales</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Capacidad</Label>
                <Input type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Edad mín.</Label>
                <Input type="number" min={1} value={ageMin} onChange={e => setAgeMin(e.target.value)} className="h-9 text-sm" placeholder="-" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Edad máx.</Label>
                <Input type="number" min={1} value={ageMax} onChange={e => setAgeMax(e.target.value)} className="h-9 text-sm" placeholder="-" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nivel de inglés (CEFR)</Label>
                <Select value={englishLevel || '_none'} onValueChange={v => setEnglishLevel(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin especificar</SelectItem>
                    {CEFR_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Aula</Label>
                <Input value={classroom} onChange={e => setClassroom(e.target.value)} placeholder="Ej: Sala 2" className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Profesor</Label>
              <Select value={teacherId || '_none'} onValueChange={v => setTeacherId(v === '_none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {teachers.filter(t => t.status === 'active').map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Schedules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Horarios</Label>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addScheduleBlock}>
                  <Plus className="h-3 w-3" /> Agregar
                </Button>
              </div>
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={s.day} onValueChange={v => updateScheduleBlock(i, 'day', v)}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="time" value={s.start} onChange={e => updateScheduleBlock(i, 'start', e.target.value)} className="h-8 text-xs w-24" />
                  <Input type="time" value={s.end} onChange={e => updateScheduleBlock(i, 'end', e.target.value)} className="h-8 text-xs w-24" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeScheduleBlock(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={addGroup.isPending || updateGroup.isPending}>
                {addGroup.isPending || updateGroup.isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
