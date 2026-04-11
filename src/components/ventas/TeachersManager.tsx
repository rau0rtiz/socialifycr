import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useClientTeachers, TeacherScheduleBlock, TeacherInput } from '@/hooks/use-client-teachers';
import { useClientProducts } from '@/hooks/use-client-products';
import { GraduationCap, Plus, Pencil, Trash2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const AUDIENCE_OPTIONS = [
  { value: 'adults', label: 'Adultos' },
  { value: 'children', label: 'Niños' },
  { value: 'corporate', label: 'Corporativo' },
];

interface TeachersManagerProps {
  clientId: string;
}

export const TeachersManager = ({ clientId }: TeachersManagerProps) => {
  const { teachers, isLoading, addTeacher, updateTeacher, deleteTeacher } = useClientTeachers(clientId);
  const { products } = useClientProducts(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [schedules, setSchedules] = useState<TeacherScheduleBlock[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);

  const resetForm = () => {
    setName(''); setEmail(''); setPhone('');
    setSchedules([]); setSelectedProductIds([]); setSelectedAudience([]);
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (t: any) => {
    setEditing(t.id);
    setName(t.name);
    setEmail(t.email || '');
    setPhone(t.phone || '');
    setSchedules(t.available_schedules || []);
    setSelectedProductIds(t.product_ids || []);
    setSelectedAudience(t.audience_types || []);
    setDialogOpen(true);
  };

  const addScheduleBlock = () => {
    setSchedules([...schedules, { day: 'Lunes', start: '08:00', end: '12:00' }]);
  };

  const updateScheduleBlock = (idx: number, field: keyof TeacherScheduleBlock, value: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedules(updated);
  };

  const removeScheduleBlock = (idx: number) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const toggleAudience = (value: string) => {
    setSelectedAudience(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    const input: TeacherInput = {
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      available_schedules: schedules,
      product_ids: selectedProductIds,
      audience_types: selectedAudience,
    };
    try {
      if (editing) {
        await updateTeacher.mutateAsync({ id: editing, ...input });
        toast.success('Profesor actualizado');
      } else {
        await addTeacher.mutateAsync(input);
        toast.success('Profesor creado');
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeacher.mutateAsync(id);
      toast.success('Profesor eliminado');
      setDeleteConfirm(null);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <GraduationCap className="h-4 w-4 text-purple-500" />
              </div>
              Profesores
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin profesores</p>
              <p className="text-xs text-muted-foreground mt-1">Agrega profesores para asignarlos a ventas.</p>
              <Button size="sm" variant="outline" onClick={openNew} className="mt-3 h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Crear primer profesor
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map(t => (
                <div
                  key={t.id}
                  className="group rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer p-3.5"
                  onClick={() => openEdit(t)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {t.audience_types.map(a => (
                          <Badge key={a} variant="secondary" className="text-[10px] py-0">
                            {AUDIENCE_OPTIONS.find(o => o.value === a)?.label || a}
                          </Badge>
                        ))}
                        {t.available_schedules.length > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {t.available_schedules.length} bloques
                          </span>
                        )}
                        {t.product_ids.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {t.product_ids.length} producto{t.product_ids.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0">
          <div className="px-6 pt-6 pb-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                </div>
                {editing ? 'Editar Profesor' : 'Nuevo Profesor'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 pb-4 overflow-y-auto space-y-4" style={{ maxHeight: '60vh' }}>
            {/* Basic info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del profesor" className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." className="mt-1.5" type="email" />
                </div>
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="8888-8888" className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Audiencia que maneja</Label>
              <div className="flex gap-2 flex-wrap">
                {AUDIENCE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedAudience.includes(opt.value)}
                      onCheckedChange={() => toggleAudience(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Productos que puede impartir</Label>
              {products.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay productos creados aún.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedProductIds.includes(p.id)}
                        onCheckedChange={() => toggleProduct(p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule blocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Horarios disponibles</Label>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addScheduleBlock}>
                  <Plus className="h-3 w-3" /> Bloque
                </Button>
              </div>
              {schedules.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin bloques de horario definidos.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((block, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                      <Select value={block.day} onValueChange={v => updateScheduleBlock(idx, 'day', v)}>
                        <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="time" value={block.start} onChange={e => updateScheduleBlock(idx, 'start', e.target.value)} className="h-7 text-[10px] w-24" />
                      <span className="text-[10px] text-muted-foreground">a</span>
                      <Input type="time" value={block.end} onChange={e => updateScheduleBlock(idx, 'end', e.target.value)} className="h-7 text-[10px] w-24" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeScheduleBlock(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="px-6 pb-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={addTeacher.isPending || updateTeacher.isPending} size="sm">
              {(addTeacher.isPending || updateTeacher.isPending) ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar profesor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} size="sm">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} size="sm" disabled={deleteTeacher.isPending}>
              {deleteTeacher.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
