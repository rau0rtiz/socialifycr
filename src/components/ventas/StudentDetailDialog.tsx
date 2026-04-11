import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { StudentContact } from '@/hooks/use-student-contacts';
import { CalendarDays, CreditCard, FileText, Mail, Phone, Shield, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentContact | null;
  purchaseCount?: number;
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

export const StudentDetailDialog = ({
  open,
  onOpenChange,
  student,
  purchaseCount = 0,
}: StudentDetailDialogProps) => {
  if (!student) return null;

  const statusLabel = student.status === 'active' ? 'Activo' : 'Inactivo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

        <div className="space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};