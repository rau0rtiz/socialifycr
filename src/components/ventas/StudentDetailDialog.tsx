import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentContact } from '@/hooks/use-student-contacts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  Phone,
  Shield,
  ShoppingBag,
  UserRound,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentContact | null;
  purchaseCount?: number;
  clientId?: string;
}

const statusClasses: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
};

// ── Purchases Tab ──
const PurchasesTab = ({ studentId, clientId }: { studentId: string; clientId: string }) => {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['student-purchases', studentId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, amount, currency, product, sale_date, status, payment_method, num_installments, installments_paid')
        .eq('client_id', clientId)
        .eq('student_contact_id', studentId)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId && !!clientId,
  });

  if (isLoading) return <div className="space-y-2 py-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No hay compras registradas</p>
      </div>
    );
  }

  const fmt = (amount: number, currency: string) =>
    currency === 'CRC' ? `₡${amount.toLocaleString('es-CR')}` : `$${amount.toLocaleString('en-US')}`;

  return (
    <div className="space-y-2 py-1">
      {sales.map(sale => {
        const isPaid = sale.status === 'completed' && (sale.num_installments ?? 1) <= (sale.installments_paid ?? 1);
        return (
          <div
            key={sale.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{sale.product || 'Sin producto'}</p>
              <p className="text-[11px] text-muted-foreground">
                {format(new Date(sale.sale_date), 'dd MMM yyyy', { locale: es })}
                {sale.payment_method && ` · ${sale.payment_method}`}
              </p>
              {(sale.num_installments ?? 1) > 1 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Cuota {sale.installments_paid ?? 0}/{sale.num_installments}
                </p>
              )}
            </div>
            <div className="text-right ml-3 shrink-0">
              <p className="text-sm font-semibold text-foreground">{fmt(sale.amount, sale.currency)}</p>
              <Badge
                variant="outline"
                className={`text-[9px] mt-0.5 ${isPaid ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-500/10 text-amber-700 border-amber-200'}`}
              >
                {isPaid ? 'Pagado' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Attendance Tab ──
const AttendanceTab = ({ studentId, clientId }: { studentId: string; clientId: string }) => {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance', studentId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, class_date, status, check_in, check_out, notes, group_id')
        .eq('client_id', clientId)
        .eq('student_contact_id', studentId)
        .order('class_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId && !!clientId,
  });

  // Get group names for the records
  const groupIds = [...new Set(records.map(r => r.group_id).filter(Boolean))] as string[];
  const { data: groups = [] } = useQuery({
    queryKey: ['student-attendance-groups', groupIds],
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      const { data, error } = await supabase
        .from('class_groups')
        .select('id, name')
        .in('id', groupIds);
      if (error) throw error;
      return data || [];
    },
    enabled: groupIds.length > 0,
  });

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));

  if (isLoading) return <div className="space-y-2 py-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No hay registros de asistencia</p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
    present: { label: 'Presente', icon: CheckCircle2, class: 'text-primary' },
    absent: { label: 'Ausente', icon: XCircle, class: 'text-destructive' },
    late: { label: 'Tardío', icon: CalendarDays, class: 'text-amber-600' },
    excused: { label: 'Justificado', icon: CalendarDays, class: 'text-muted-foreground' },
  };

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const totalCount = records.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3 py-1">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
          <p className="text-lg font-semibold text-foreground">{totalCount}</p>
          <p className="text-[10px] text-muted-foreground">Clases</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
          <p className="text-lg font-semibold text-foreground">{presentCount}</p>
          <p className="text-[10px] text-muted-foreground">Asistió</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
          <p className="text-lg font-semibold text-primary">{attendanceRate}%</p>
          <p className="text-[10px] text-muted-foreground">Tasa</p>
        </div>
      </div>

      {/* Records */}
      <div className="max-h-[240px] overflow-y-auto space-y-1.5">
        {records.map(record => {
          const cfg = statusConfig[record.status] || statusConfig.present;
          const StatusIcon = cfg.icon;
          return (
            <div key={record.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.class}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {format(new Date(record.class_date + 'T12:00:00'), 'EEEE dd MMM', { locale: es })}
                </p>
                {record.group_id && groupMap[record.group_id] && (
                  <p className="text-[10px] text-muted-foreground">{groupMap[record.group_id]}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-[9px] ${cfg.class}`}>
                {cfg.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Dialog ──
export const StudentDetailDialog = ({
  open,
  onOpenChange,
  student,
  purchaseCount = 0,
  clientId,
}: StudentDetailDialogProps) => {
  if (!student) return null;

  const resolvedClientId = clientId || student.client_id;
  const statusLabel = student.status === 'active' ? 'Activo' : 'Inactivo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden p-0">
        <div className="px-5 pt-5 pb-2">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {student.full_name}
              <Badge variant="outline" className={statusClasses[student.status] || statusClasses.inactive}>
                {statusLabel}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Información del estudiante registrada en la base de datos.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <div className="px-5">
            <TabsList className="w-full">
              <TabsTrigger value="personal" className="flex-1 text-xs gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex-1 text-xs gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Compras
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex-1 text-xs gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Asistencia
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '55vh' }}>
            {/* Personal Tab */}
            <TabsContent value="personal" className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Compras</p>
                  <div className="mt-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-foreground">{purchaseCount}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Edad</p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-foreground">{student.age ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border rounded-lg border border-border px-3">
                <InfoRow icon={Phone} label="Teléfono" value={student.phone} />
                <InfoRow icon={Mail} label="Correo" value={student.email} />
                <InfoRow icon={Shield} label="Cédula" value={student.id_number} />
                <InfoRow icon={UserRound} label="Género" value={student.gender} />
                <InfoRow
                  icon={CalendarDays}
                  label="Creado"
                  value={student.created_at ? format(new Date(student.created_at), 'dd MMM yyyy', { locale: es }) : null}
                />
              </div>

              {(student.guardian_name || student.guardian_phone || student.guardian_email || student.guardian_id_number) && (
                <>
                  <Separator />
                  <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-foreground">Información del encargado</p>
                    <div className="divide-y divide-border">
                      <InfoRow icon={UserRound} label="Nombre" value={student.guardian_name} />
                      <InfoRow icon={Phone} label="Teléfono" value={student.guardian_phone} />
                      <InfoRow icon={Mail} label="Correo" value={student.guardian_email} />
                      <InfoRow icon={Shield} label="Cédula" value={student.guardian_id_number} />
                    </div>
                  </div>
                </>
              )}

              {student.notes && (
                <div className="rounded-lg border border-border bg-primary/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
                    <FileText className="h-3.5 w-3.5" />
                    Notas
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{student.notes}</p>
                </div>
              )}
            </TabsContent>

            {/* Purchases Tab */}
            <TabsContent value="purchases" className="mt-3">
              <PurchasesTab studentId={student.id} clientId={resolvedClientId} />
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="mt-3">
              <AttendanceTab studentId={student.id} clientId={resolvedClientId} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};