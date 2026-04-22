import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Users, Phone, Mail, Calendar, DollarSign, Filter, Trash2, Plus, Pencil, ShieldAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStudentContacts, StudentContact, StudentContactInput } from '@/hooks/use-student-contacts';
import { useCustomerContacts, CustomerContact, CustomerAddress } from '@/hooks/use-customer-contacts';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/use-user-role';
import { useAuth } from '@/contexts/AuthContext';
import { StudentDetailDialog } from '@/components/ventas/StudentDetailDialog';
import { CustomerDetailDialog } from '@/components/clientes/CustomerDetailDialog';
import { MapPin, Shirt } from 'lucide-react';

// ── Legacy lead type for non-SpkUp clients ──
type LeadRecord = {
  id: string; lead_name: string; lead_phone: string | null; lead_email: string | null;
  source: string | null; status: string; setter_name: string | null; product: string | null;
  appointment_date: string; created_at: string | null; notes: string | null;
  not_sold_reason: string | null; estimated_value: number | null; currency: string;
  ad_campaign_name: string | null;
};

const STATUS_LABELS: Record<string, string> = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Completado', sold: 'Vendido', not_sold: 'No vendido', no_show: 'No se presentó', rescheduled: 'Reagendado' };
const STATUS_COLORS: Record<string, string> = { scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200', confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', completed: 'bg-gray-500/10 text-gray-600 border-gray-200', sold: 'bg-green-500/10 text-green-700 border-green-200', not_sold: 'bg-red-500/10 text-red-600 border-red-200', no_show: 'bg-orange-500/10 text-orange-600 border-orange-200', rescheduled: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };

const ClientDatabase = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id ?? null;
  const isSpkUp = selectedClient?.name?.toLowerCase().includes('speak up');
  const isAlmaBendita = selectedClient?.name?.toLowerCase().includes('alma bendita');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { systemRole, clientAccess } = useUserRole();

  // Check if user can delete students (account_manager for this client, or admin/owner)
  const isAdminOrOwner = systemRole === 'owner' || systemRole === 'admin';
  const isAccountManager = clientId ? clientAccess.some(a => a.clientId === clientId && a.role === 'account_manager') : false;
  const canDeleteStudents = isAdminOrOwner || isAccountManager;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Alma Bendita-specific filters
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [purchasesFilter, setPurchasesFilter] = useState<string>('all'); // all | with | without | gt3 | gt5
  const [amountFilter, setAmountFilter] = useState<string>('all'); // all | gt50k | gt100k | gt250k
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerContact | null>(null);

  // ── Speak Up: student_contacts ──
  const { students, isLoading: studentsLoading, addStudent, updateStudent, deleteStudent } = useStudentContacts(isSpkUp ? clientId : null);

  // ── Alma Bendita: customer_contacts (retail clients) ──
  const { contacts: customerContacts, isLoading: customersLoading } = useCustomerContacts(isAlmaBendita ? clientId : null);

  // ── Purchase counts per student ──
  const { data: purchaseCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['student-purchase-counts', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('message_sales')
        .select('student_contact_id')
        .eq('client_id', clientId)
        .not('student_contact_id', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.student_contact_id) {
          counts[row.student_contact_id] = (counts[row.student_contact_id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!clientId && !!isSpkUp,
  });
  const [studentDialog, setStudentDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentContact | null>(null);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sIdNumber, setSIdNumber] = useState('');
  const [sAge, setSAge] = useState('');
  const [sGender, setSGender] = useState('');
  const [sNotes, setSNotes] = useState('');
  const [sGuardianName, setSGuardianName] = useState('');
  const [sGuardianPhone, setSGuardianPhone] = useState('');
  const [sGuardianId, setSGuardianId] = useState('');
  const [sGuardianEmail, setSGuardianEmail] = useState('');

  const resetStudentForm = () => {
    setSName(''); setSPhone(''); setSEmail(''); setSIdNumber('');
    setSAge(''); setSGender(''); setSNotes('');
    setSGuardianName(''); setSGuardianPhone(''); setSGuardianId(''); setSGuardianEmail('');
    setEditingStudent(null);
  };

  const openNewStudent = () => { resetStudentForm(); setStudentDialog(true); };
  const openEditStudent = (s: any) => {
    setEditingStudent(s);
    setSName(s.full_name); setSPhone(s.phone || ''); setSEmail(s.email || '');
    setSIdNumber(s.id_number || ''); setSAge(s.age != null ? String(s.age) : '');
    setSGender(s.gender || ''); setSNotes(s.notes || '');
    setSGuardianName(s.guardian_name || ''); setSGuardianPhone(s.guardian_phone || '');
    setSGuardianId(s.guardian_id_number || ''); setSGuardianEmail(s.guardian_email || '');
    setStudentDialog(true);
  };

  const handleSaveStudent = async () => {
    if (!sName.trim()) { toast.error('El nombre es obligatorio'); return; }
    const age = sAge ? parseInt(sAge) : null;
    if (age != null && age < 18 && !sGuardianName.trim()) {
      toast.error('Los menores de edad requieren un encargado');
      return;
    }
    const input: StudentContactInput = {
      full_name: sName.trim(), phone: sPhone || null, email: sEmail || null,
      id_number: sIdNumber || null, age, gender: sGender || null, notes: sNotes || null,
      guardian_name: sGuardianName || null, guardian_phone: sGuardianPhone || null,
      guardian_id_number: sGuardianId || null, guardian_email: sGuardianEmail || null,
    };
    try {
      if (editingStudent) {
        await updateStudent.mutateAsync({ id: editingStudent.id, ...input });
        toast.success('Estudiante actualizado');
      } else {
        await addStudent.mutateAsync(input);
        toast.success('Estudiante creado');
      }
      setStudentDialog(false); resetStudentForm();
    } catch { toast.error('Error al guardar'); }
  };

  const isMinor = sAge ? parseInt(sAge) < 18 : false;

  // ── Legacy: setter_appointments for non-SpkUp ──
  const { data: appointmentLeads = [] } = useQuery<LeadRecord[]>({
    queryKey: ['client-database-leads', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('setter_appointments')
        .select('id, lead_name, lead_phone, lead_email, source, status, setter_name, product, appointment_date, created_at, notes, not_sold_reason, estimated_value, currency, ad_campaign_name')
        .eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRecord[];
    },
    enabled: !!clientId && !isSpkUp,
  });

  // ── Sales-only contacts (no appointment) for non-SpkUp ──
  const { data: salesContacts = [] } = useQuery<LeadRecord[]>({
    queryKey: ['client-database-sales-contacts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('message_sales')
        .select('id, customer_name, customer_phone, source, status, closer_name, product, sale_date, created_at, notes, amount, currency, ad_campaign_name')
        .eq('client_id', clientId)
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id,
        lead_name: s.customer_name || 'Sin nombre',
        lead_phone: s.customer_phone,
        lead_email: null,
        source: s.source,
        status: s.status === 'completed' ? 'sold' : s.status === 'pending' ? 'scheduled' : s.status === 'cancelled' ? 'not_sold' : s.status,
        setter_name: s.closer_name,
        product: s.product,
        appointment_date: s.sale_date,
        created_at: s.created_at,
        notes: s.notes,
        not_sold_reason: null,
        estimated_value: s.amount,
        currency: s.currency || 'CRC',
        ad_campaign_name: s.ad_campaign_name,
        _fromSale: true,
      })) as (LeadRecord & { _fromSale?: boolean })[];
    },
    enabled: !!clientId && !isSpkUp,
  });

  // ── Merge appointments + sales-only contacts (dedupe by name) ──
  const allLeads = useMemo(() => {
    const merged: LeadRecord[] = [...appointmentLeads];
    const existingNames = new Set(appointmentLeads.map(l => l.lead_name.toLowerCase().trim()));
    for (const sc of salesContacts) {
      const key = sc.lead_name.toLowerCase().trim();
      if (!existingNames.has(key)) {
        merged.push(sc);
        existingNames.add(key);
      }
    }
    return merged;
  }, [appointmentLeads, salesContacts]);

  const sources = useMemo(() => Array.from(new Set(allLeads.map(l => l.source).filter(Boolean))) as string[], [allLeads]);

  const filteredLeads = useMemo(() => {
    const filtered = allLeads.filter(lead => {
      const matchSearch = !search || lead.lead_name.toLowerCase().includes(search.toLowerCase()) || (lead.lead_phone && lead.lead_phone.includes(search)) || (lead.lead_email && lead.lead_email.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchSource = sourceFilter === 'all' || lead.source === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
    return filtered.sort((a, b) => a.lead_name.localeCompare(b.lead_name, 'es', { sensitivity: 'base' }));
  }, [allLeads, search, statusFilter, sourceFilter]);

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(s => {
      const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search)) || (s.email && s.email.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
    return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' }));
  }, [students, search, statusFilter]);

  // ── Alma Bendita: total spent per customer (for amount filter) ──
  const { data: customerSpend = {} } = useQuery<Record<string, number>>({
    queryKey: ['customer-spend', clientId],
    queryFn: async () => {
      if (!clientId) return {};
      const { data, error } = await supabase
        .from('message_sales')
        .select('customer_phone, customer_name, amount')
        .eq('client_id', clientId)
        .not('customer_name', 'is', null);
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) {
        const key = (row.customer_phone || row.customer_name || '').toString().trim().toLowerCase();
        if (!key) continue;
        totals[key] = (totals[key] || 0) + Number(row.amount || 0);
      }
      return totals;
    },
    enabled: !!clientId && !!isAlmaBendita,
    staleTime: 60_000,
  });

  const customerSpendFor = (c: CustomerContact) => {
    const key = (c.phone || c.full_name || '').toString().trim().toLowerCase();
    return customerSpend[key] || 0;
  };

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    customerContacts.forEach(c => (c.garment_sizes || []).forEach(s => { if (s) set.add(s); }));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [customerContacts]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = customerContacts.filter(c => {
      if (q) {
        const matchesSearch =
          c.full_name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.id_number && c.id_number.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      // Size filter
      if (sizeFilter !== 'all' && !(c.garment_sizes || []).includes(sizeFilter)) return false;
      // Purchases filter
      const tp = c.total_purchases || 0;
      if (purchasesFilter === 'with' && tp <= 0) return false;
      if (purchasesFilter === 'without' && tp > 0) return false;
      if (purchasesFilter === 'gt3' && tp < 3) return false;
      if (purchasesFilter === 'gt5' && tp < 5) return false;
      // Amount filter
      const spent = customerSpendFor(c);
      if (amountFilter === 'gt50k' && spent < 50_000) return false;
      if (amountFilter === 'gt100k' && spent < 100_000) return false;
      if (amountFilter === 'gt250k' && spent < 250_000) return false;
      return true;
    });
    return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' }));
  }, [customerContacts, search, sizeFilter, purchasesFilter, amountFilter, customerSpend]);

  const handleDeleteLead = async () => {
    if (!deleteTarget) return;
    if (isSpkUp) {
      // Require password verification
      if (!deletePassword.trim()) { toast.error('Ingresa tu contraseña para confirmar'); return; }
      setDeleteLoading(true);
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: deletePassword,
        });
        if (authError) { toast.error('Contraseña incorrecta'); setDeleteLoading(false); return; }
        await deleteStudent.mutateAsync(deleteTarget.id);
        toast.success('Estudiante eliminado');
      } catch { toast.error('Error al eliminar'); }
      setDeleteLoading(false);
    } else {
      const { error } = await supabase.from('setter_appointments').delete().eq('id', deleteTarget.id);
      if (error) { toast.error('No se pudo eliminar'); } else { toast.success('Lead eliminado'); queryClient.invalidateQueries({ queryKey: ['client-database-leads', clientId] }); }
    }
    setDeleteTarget(null);
    setDeletePassword('');
  };

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle className="text-lg">Selecciona un cliente</CardTitle>
              <p className="text-sm text-muted-foreground">Selecciona un cliente para ver su base de datos.</p>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totalCount = isSpkUp ? students.length : isAlmaBendita ? customerContacts.length : allLeads.length;
  const activeCount = isSpkUp ? students.filter(s => s.status === 'active').length : allLeads.filter(l => ['scheduled', 'confirmed', 'rescheduled'].includes(l.status)).length;
  const soldCount = isSpkUp ? 0 : allLeads.filter(l => l.status === 'sold').length;
  const customerWithPurchasesCount = customerContacts.filter(c => (c.total_purchases || 0) > 0).length;
  const customerWithAddressCount = customerContacts.filter(c => (c.addresses || []).length > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{isSpkUp ? 'Base de Estudiantes' : isAlmaBendita ? 'Base de Clientas' : 'Base de Clientes'}</h1>
          {isSpkUp && (
            <Button size="sm" onClick={openNewStudent} className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nuevo estudiante
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalCount}</p><p className="text-xs text-muted-foreground">{isSpkUp ? 'Total estudiantes' : isAlmaBendita ? 'Total clientas' : 'Total leads'}</p></div></CardContent></Card>
          {isSpkUp ? (
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Calendar className="h-5 w-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Activos</p></div></CardContent></Card>
          ) : isAlmaBendita ? (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{customerWithPurchasesCount}</p><p className="text-xs text-muted-foreground">Con compras</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{customerWithAddressCount}</p><p className="text-xs text-muted-foreground">Con dirección</p></div></CardContent></Card>
            </>
          ) : (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{soldCount}</p><p className="text-xs text-muted-foreground">Vendidos</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Activos</p></div></CardContent></Card>
            </>
          )}
          {isSpkUp && (
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Users className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{students.filter(s => s.status === 'inactive').length}</p><p className="text-xs text-muted-foreground">Inactivos</p></div></CardContent></Card>
          )}
        </div>

        {/* Filters */}
        <Card><CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, teléfono o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            {isSpkUp ? (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            ) : isAlmaBendita ? (
              <>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><Shirt className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Talla" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las tallas</SelectItem>
                    {allSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={purchasesFilter} onValueChange={setPurchasesFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Compras" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las compras</SelectItem>
                    <SelectItem value="with">Con compras</SelectItem>
                    <SelectItem value="without">Sin compras</SelectItem>
                    <SelectItem value="gt3">3 o más</SelectItem>
                    <SelectItem value="gt5">5 o más</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={amountFilter} onValueChange={setAmountFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><DollarSign className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Monto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier monto</SelectItem>
                    <SelectItem value="gt50k">≥ ₡50,000</SelectItem>
                    <SelectItem value="gt100k">≥ ₡100,000</SelectItem>
                    <SelectItem value="gt250k">≥ ₡250,000</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Fuente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fuentes</SelectItem>
                    {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent></Card>

        {/* Table */}
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            {isSpkUp ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Contacto</TableHead>
                    <TableHead className="text-xs">Edad</TableHead>
                    <TableHead className="text-xs">Compras</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Encargado</TableHead>
                    <TableHead className="text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No se encontraron estudiantes</TableCell></TableRow>
                  ) : filteredStudents.map(s => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer text-xs hover:bg-muted/40"
                      onClick={() => setSelectedStudent(s)}
                    >
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {s.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{s.phone}</span>}
                          {s.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{s.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{s.age ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {purchaseCounts[s.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-gray-500/10 text-gray-600 border-gray-200'}`}>
                          {s.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.guardian_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditStudent(s); }}><Pencil className="h-3 w-3" /></Button>
                          {canDeleteStudents && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : isAlmaBendita ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Contacto</TableHead>
                    <TableHead className="text-xs">Cédula</TableHead>
                    <TableHead className="text-xs">Tallas</TableHead>
                    <TableHead className="text-xs">Compras</TableHead>
                    <TableHead className="text-xs min-w-[200px]">Dirección principal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Cargando...</TableCell></TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No se encontraron clientas</TableCell></TableRow>
                  ) : filteredCustomers.map((c: CustomerContact) => {
                    const primaryAddress = (c.addresses || [])[0] as CustomerAddress | undefined;
                    const addressText = primaryAddress
                      ? [primaryAddress.address_line_1, primaryAddress.district, primaryAddress.city, primaryAddress.state]
                          .filter(Boolean).join(', ')
                      : '';
                    return (
                      <TableRow key={c.id} className="text-xs cursor-pointer hover:bg-muted/40" onClick={() => setSelectedCustomer(c)}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {c.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.id_number || '—'}</TableCell>
                        <TableCell>
                          {(c.garment_sizes || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(c.garment_sizes || []).map((sz, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                  <Shirt className="h-2.5 w-2.5" />{sz}
                                </Badge>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{c.total_purchases || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {addressText ? (
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{addressText}</span>
                              {(c.addresses || []).length > 1 && (
                                <Badge variant="outline" className="text-[9px] ml-1">+{(c.addresses || []).length - 1}</Badge>
                              )}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Contacto</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Fuente</TableHead>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No se encontraron leads</TableCell></TableRow>
                  ) : filteredLeads.map(lead => (
                    <TableRow key={lead.id} className="text-xs">
                      <TableCell className="font-medium">{lead.lead_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {lead.lead_phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{lead.lead_phone}</span>}
                          {lead.lead_email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{lead.lead_email}</span>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[lead.status] || ''}`}>{STATUS_LABELS[lead.status] || lead.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{lead.source || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.setter_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{lead.created_at ? format(new Date(lead.created_at), 'dd MMM yy', { locale: es }) : '—'}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(lead)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {(isSpkUp ? filteredStudents.length : isAlmaBendita ? filteredCustomers.length : filteredLeads.length) > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              Mostrando {isSpkUp ? filteredStudents.length : isAlmaBendita ? filteredCustomers.length : filteredLeads.length} de {totalCount} {isSpkUp ? 'estudiantes' : isAlmaBendita ? 'clientas' : 'leads'}
            </div>
          )}
        </CardContent></Card>
      </div>

      {/* Delete confirmation */}
      {isSpkUp ? (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletePassword(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Eliminar estudiante
              </DialogTitle>
              <DialogDescription>
                Estás a punto de eliminar permanentemente a <strong>{deleteTarget?.full_name}</strong>. Ingresa tu contraseña para confirmar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Contraseña</Label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="mt-1.5"
                  onKeyDown={e => { if (e.key === 'Enter') handleDeleteLead(); }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setDeleteTarget(null); setDeletePassword(''); }}>Cancelar</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLead}
                disabled={deleteLoading || !deletePassword.trim()}
              >
                {deleteLoading ? 'Verificando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar lead</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de eliminar a <strong>{deleteTarget?.lead_name}</strong>? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Student create/edit dialog */}
      {isSpkUp && (
        <Dialog open={studentDialog} onOpenChange={(o) => { if (!o) resetStudentForm(); setStudentDialog(o); }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0">
            <div className="px-6 pt-6 pb-3">
              <DialogHeader>
                <DialogTitle>{editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}</DialogTitle>
                <DialogDescription>
                  {editingStudent ? 'Actualiza la información del estudiante.' : 'Completa la información para crear un nuevo estudiante.'}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 pb-4 overflow-y-auto space-y-4" style={{ maxHeight: '60vh' }}>
              <div>
                <Label className="text-xs">Nombre completo <span className="text-destructive">*</span></Label>
                <Input value={sName} onChange={e => setSName(e.target.value)} placeholder="Nombre del estudiante" className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Teléfono</Label><Input value={sPhone} onChange={e => setSPhone(e.target.value)} placeholder="8888-8888" className="mt-1.5" /></div>
                <div><Label className="text-xs">Correo</Label><Input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="email@..." type="email" className="mt-1.5" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Cédula</Label><Input value={sIdNumber} onChange={e => setSIdNumber(e.target.value)} placeholder="0-0000-0000" className="mt-1.5" /></div>
                <div><Label className="text-xs">Edad</Label><Input type="number" min={0} value={sAge} onChange={e => setSAge(e.target.value)} placeholder="25" className="mt-1.5" /></div>
                <div>
                  <Label className="text-xs">Género</Label>
                  <Select value={sGender} onValueChange={setSGender}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Notas</Label><Textarea value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="Notas adicionales..." className="mt-1.5 min-h-[60px] text-sm" /></div>

              {/* Guardian section */}
              {isMinor && (
                <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-500/5">
                  <p className="text-xs font-semibold text-amber-700">Encargado (obligatorio para menores)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Nombre encargado <span className="text-destructive">*</span></Label><Input value={sGuardianName} onChange={e => setSGuardianName(e.target.value)} placeholder="Nombre completo" className="mt-1.5" /></div>
                    <div><Label className="text-xs">Teléfono encargado</Label><Input value={sGuardianPhone} onChange={e => setSGuardianPhone(e.target.value)} placeholder="8888-8888" className="mt-1.5" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Cédula encargado</Label><Input value={sGuardianId} onChange={e => setSGuardianId(e.target.value)} placeholder="0-0000-0000" className="mt-1.5" /></div>
                    <div><Label className="text-xs">Correo encargado</Label><Input value={sGuardianEmail} onChange={e => setSGuardianEmail(e.target.value)} placeholder="email@..." type="email" className="mt-1.5" /></div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStudentDialog(false); resetStudentForm(); }} size="sm">Cancelar</Button>
              <Button onClick={handleSaveStudent} disabled={addStudent.isPending || updateStudent.isPending} size="sm">
                {(addStudent.isPending || updateStudent.isPending) ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isSpkUp && (
        <StudentDetailDialog
          open={!!selectedStudent}
          onOpenChange={(open) => {
            if (!open) setSelectedStudent(null);
          }}
          student={selectedStudent}
          purchaseCount={selectedStudent ? purchaseCounts[selectedStudent.id] || 0 : 0}
          clientId={clientId || undefined}
        />
      )}
    </DashboardLayout>
  );
};

export default ClientDatabase;
