import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, User, ShoppingCart, Calendar, DollarSign, Pencil, Save, X, IdCard } from 'lucide-react';
import { StudentContact, StudentContactInput } from '@/hooks/use-student-contacts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface StudentDetailDialogProps {
  student: StudentContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: StudentContactInput) => Promise<void>;
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

export const StudentDetailDialog = ({ student, open, onOpenChange, onSave, clientId }: StudentDetailDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StudentContactInput>({} as any);

  // Fetch sales linked to this student
  const { data: sales = [] } = useQuery({
    queryKey: ['student-sales', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, sale_date, amount, currency, product, closer_name, notes, status, payment_method, customer_name')
        .eq('student_contact_id', student.id)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.id,
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const mainCurrency = sales[0]?.currency || 'CRC';

  const startEdit = () => {
    if (!student) return;
    setForm({
      full_name: student.full_name,
      phone: student.phone,
      email: student.email,
      id_number: student.id_number,
      age: student.age,
      gender: student.gender,
      notes: student.notes,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      guardian_id_number: student.guardian_id_number,
      guardian_email: student.guardian_email,
      status: student.status,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!student || !form.full_name?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      await onSave(student.id, form);
      setEditing(false);
      toast.success('Estudiante actualizado');
    } catch {
      toast.error('Error al guardar');
    }
  };

  if (!student) return null;

  const isMinor = (editing ? form.age : student.age) != null && (editing ? (form.age ?? 99) : (student.age ?? 99)) < 18;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-3">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">{student.full_name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                      {student.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {sales.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{sales.length} compra{sales.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={startEdit}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        <Tabs defaultValue="info" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mb-2 w-auto self-start">
            <TabsTrigger value="info" className="text-xs gap-1.5"><User className="h-3 w-3" /> Información</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs gap-1.5"><ShoppingCart className="h-3 w-3" /> Compras</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1" style={{ maxHeight: '55vh' }}>
            {/* ── Info Tab ── */}
            <TabsContent value="info" className="px-6 pb-6 mt-0 space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label className="text-xs">Nombre completo <span className="text-destructive">*</span></Label>
                    <Input value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Teléfono</Label><Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} className="mt-1.5" /></div>
                    <div><Label className="text-xs">Correo</Label><Input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} type="email" className="mt-1.5" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Cédula</Label><Input value={form.id_number || ''} onChange={e => setForm(f => ({ ...f, id_number: e.target.value || null }))} className="mt-1.5" /></div>
                    <div><Label className="text-xs">Edad</Label><Input type="number" min={0} value={form.age != null ? String(form.age) : ''} onChange={e => setForm(f => ({ ...f, age: e.target.value ? parseInt(e.target.value) : null }))} className="mt-1.5" /></div>
                    <div>
                      <Label className="text-xs">Género</Label>
                      <Select value={form.gender || ''} onValueChange={v => setForm(f => ({ ...f, gender: v || null }))}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={form.status || 'active'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Notas</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} className="mt-1.5 min-h-[60px] text-sm" /></div>

                  {isMinor && (
                    <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-500/5">
                      <p className="text-xs font-semibold text-amber-700">Encargado (menores de edad)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Nombre</Label><Input value={form.guardian_name || ''} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value || null }))} className="mt-1.5" /></div>
                        <div><Label className="text-xs">Teléfono</Label><Input value={form.guardian_phone || ''} onChange={e => setForm(f => ({ ...f, guardian_phone: e.target.value || null }))} className="mt-1.5" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Cédula</Label><Input value={form.guardian_id_number || ''} onChange={e => setForm(f => ({ ...f, guardian_id_number: e.target.value || null }))} className="mt-1.5" /></div>
                        <div><Label className="text-xs">Correo</Label><Input value={form.guardian_email || ''} onChange={e => setForm(f => ({ ...f, guardian_email: e.target.value || null }))} type="email" className="mt-1.5" /></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1"><X className="h-3 w-3" /> Cancelar</Button>
                    <Button size="sm" onClick={handleSave} className="gap-1"><Save className="h-3 w-3" /> Guardar</Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Read-only info display */}
                  <div className="space-y-3">
                    <InfoRow icon={Phone} label="Teléfono" value={student.phone} />
                    <InfoRow icon={Mail} label="Correo" value={student.email} />
                    <InfoRow icon={IdCard} label="Cédula" value={student.id_number} />
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow icon={Calendar} label="Edad" value={student.age != null ? `${student.age} años` : null} />
                      <InfoRow icon={User} label="Género" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
                    </div>
                  </div>

                  {student.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Notas</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{student.notes}</p>
                      </div>
                    </>
                  )}

                  {student.guardian_name && (
                    <>
                      <Separator />
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Encargado</p>
                        <InfoRow icon={User} label="Nombre" value={student.guardian_name} />
                        <InfoRow icon={Phone} label="Teléfono" value={student.guardian_phone} />
                        <InfoRow icon={IdCard} label="Cédula" value={student.guardian_id_number} />
                        <InfoRow icon={Mail} label="Correo" value={student.guardian_email} />
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Purchases Tab ── */}
            <TabsContent value="purchases" className="px-6 pb-6 mt-0 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Total compras</p>
                  <p className="text-lg font-bold text-foreground">{sales.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Ingresos totales</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalRevenue, mainCurrency)}</p>
                </div>
              </div>

              {sales.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin compras registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sales.map(sale => (
                    <div key={sale.id} className="p-3 rounded-xl border border-border/50 bg-card space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{sale.product || 'Sin producto'}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(sale.sale_date), "d 'de' MMMM yyyy", { locale: es })}
                            {sale.closer_name && ` · ${sale.closer_name}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{formatCurrency(sale.amount, sale.currency)}</p>
                          <Badge variant="outline" className={`text-[10px] mt-0.5 ${sale.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}`}>
                            {sale.status === 'completed' ? 'Pagado' : sale.status === 'pending' ? 'Pendiente' : sale.status}
                          </Badge>
                        </div>
                      </div>
                      {sale.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{sale.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => (
  <div className="flex items-center gap-2.5">
    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
    <span className="text-sm text-foreground">{value || '—'}</span>
  </div>
);
