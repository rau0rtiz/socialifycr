import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

export interface BillingInfo {
  id_type?: 'fisica' | 'juridica' | 'dimex' | 'pasaporte' | '';
  id_number?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  economic_activity_code?: string;
}

interface Props {
  value: BillingInfo;
  onChange: (next: BillingInfo) => void;
  compact?: boolean;
  title?: string;
}

const ID_TYPES = [
  { value: 'fisica', label: 'Física' },
  { value: 'juridica', label: 'Jurídica' },
  { value: 'dimex', label: 'DIMEX' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

export const BillingInfoSection = ({ value, onChange, compact = false, title = 'Datos de facturación' }: Props) => {
  const set = (patch: Partial<BillingInfo>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <span className="text-[10px] text-muted-foreground">(opcional)</span>
        </div>
      )}
      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-3'}>
        <div>
          <Label className="text-xs">Tipo de cédula</Label>
          <Select value={value.id_type || ''} onValueChange={(v) => set({ id_type: v as BillingInfo['id_type'] })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Número de documento</Label>
          <Input value={value.id_number || ''} onChange={e => set({ id_number: e.target.value })} placeholder="0-0000-0000" className="mt-1.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Nombre / Razón social</Label>
          <Input value={value.full_name || ''} onChange={e => set({ full_name: e.target.value })} placeholder="Nombre completo o razón social" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs">Teléfono</Label>
          <Input value={value.phone || ''} onChange={e => set({ phone: e.target.value })} placeholder="8888-8888" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs">Correo electrónico</Label>
          <Input type="email" value={value.email || ''} onChange={e => set({ email: e.target.value })} placeholder="email@..." className="mt-1.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Dirección</Label>
          <Textarea value={value.address || ''} onChange={e => set({ address: e.target.value })} placeholder="Provincia, cantón, distrito, señas..." className="mt-1.5 min-h-[60px] text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Código de actividad económica</Label>
          <Input value={value.economic_activity_code || ''} onChange={e => set({ economic_activity_code: e.target.value })} placeholder="Ej: 855902" className="mt-1.5" />
        </div>
      </div>
    </div>
  );
};

export const isBillingEmpty = (b?: BillingInfo | null): boolean => {
  if (!b) return true;
  return !b.id_type && !b.id_number && !b.full_name && !b.phone && !b.email && !b.address && !b.economic_activity_code;
};
