import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PayClient, PayDate } from '@/hooks/use-agency-payments';

export interface SystemClient { id: string; name: string; logo_url: string | null }

interface Tract { id?: string; day_of_month: number; amount: number; label: string | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: PayClient | null;
  tracts: PayDate[];
  systemClients: SystemClient[];
  onSave: (payload: { client: Partial<PayClient> & { id?: string }; tracts: Tract[] }) => Promise<any>;
  onDelete?: (id: string) => void;
  saving?: boolean;
}

const emptyClient = (): Partial<PayClient> => ({
  name: '',
  currency: 'CRC',
  iva_rate: 0,
  active: true,
  billing_frequency: 'monthly',
  invoice_day: 1,
  anchor_month: null,
  logo_url: null,
  client_id: null,
  billing_name: '',
  billing_tax_id: '',
  billing_email: '',
  billing_phone: '',
  billing_address: '',
  notes: '',
});

export const PaymentClientDialog = ({
  open, onOpenChange, client, tracts, systemClients, onSave, onDelete, saving,
}: Props) => {
  const [form, setForm] = useState<Partial<PayClient> & { id?: string }>(emptyClient());
  const [rows, setRows] = useState<Tract[]>([{ day_of_month: 1, amount: 0, label: 'Tracto 1' }]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({ ...client });
      setRows(
        tracts.length
          ? tracts.map(t => ({ id: t.id, day_of_month: t.day_of_month, amount: Number(t.amount), label: t.label }))
          : [{ day_of_month: 1, amount: 0, label: 'Tracto 1' }],
      );
    } else {
      setForm(emptyClient());
      setRows([{ day_of_month: 1, amount: 0, label: 'Tracto 1' }]);
    }
  }, [open, client, tracts]);

  const set = (patch: Partial<PayClient>) => setForm(f => ({ ...f, ...patch }));

  const linkedLogo = systemClients.find(c => c.id === form.client_id)?.logo_url || null;
  const previewLogo = form.logo_url || linkedLogo;
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const symbol = form.currency === 'CRC' ? '₡' : '$';

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Solo imágenes');
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen supera 5MB');
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `agency-payments/logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('content-images').getPublicUrl(path);
      set({ logo_url: data.publicUrl });
      toast.success('Foto actualizada');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!form.name?.trim()) return toast.error('El nombre es obligatorio');
    if (form.billing_frequency === 'quarterly' && !form.anchor_month) {
      return toast.error('Indicá el mes inicial del ciclo trimestral');
    }
    await onSave({
      client: {
        ...form,
        name: form.name.trim(),
        iva_rate: Number(form.iva_rate || 0),
        invoice_day: Number(form.invoice_day || 1),
      },
      tracts: rows
        .filter(r => r.day_of_month)
        .map((r, i) => ({
          id: r.id,
          day_of_month: Math.min(Math.max(Number(r.day_of_month) || 1, 1), 31),
          amount: Number(r.amount || 0),
          label: r.label || `Tracto ${i + 1}`,
        })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? `Editar ${client.name}` : 'Nuevo cliente de pagos'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identidad */}
          <div className="flex items-start gap-4">
            <div className="text-center">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo del cliente" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUpload(e.target.files?.[0] || null)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 mt-1 text-[11px]"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cambiar'}
              </Button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Cliente</Label>
                <Input className="mt-1.5" value={form.name || ''} onChange={e => set({ name: e.target.value })} placeholder="Nombre del cliente" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Vincular con cliente del sistema (hereda su logo)</Label>
                <Select
                  value={form.client_id || 'none'}
                  onValueChange={v => set({ client_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular</SelectItem>
                    {systemClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Facturación */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={form.currency || 'CRC'} onValueChange={v => set({ currency: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">Colones (₡)</SelectItem>
                  <SelectItem value="USD">Dólares ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">IVA (%)</Label>
              <Input type="number" min={0} max={13} step={1} className="mt-1.5" value={form.iva_rate ?? 0} onChange={e => set({ iva_rate: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Frecuencia</Label>
              <Select
                value={form.billing_frequency || 'monthly'}
                onValueChange={v => set({ billing_frequency: v as PayClient['billing_frequency'] })}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Día de facturación</Label>
              <Input type="number" min={1} max={31} className="mt-1.5" value={form.invoice_day ?? 1} onChange={e => set({ invoice_day: Number(e.target.value) })} />
            </div>
            {form.billing_frequency === 'quarterly' && (
              <div className="col-span-2">
                <Label className="text-xs">Mes inicial del ciclo trimestral</Label>
                <Input
                  type="month"
                  className="mt-1.5"
                  value={form.anchor_month ? form.anchor_month.slice(0, 7) : ''}
                  onChange={e => set({ anchor_month: e.target.value ? `${e.target.value}-01` : null })}
                />
              </div>
            )}
            <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Cliente activo</p>
                <p className="text-[11px] text-muted-foreground">Los inactivos no aparecen en el tracker mensual</p>
              </div>
              <Switch checked={!!form.active} onCheckedChange={v => set({ active: v })} />
            </div>
          </div>

          <Separator />

          {/* Tractos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fechas de pago (tractos)</p>
                <p className="text-[11px] text-muted-foreground">Total mensual: {symbol}{total.toLocaleString()}</p>
              </div>
              {rows.length < 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => setRows(r => [...r, { day_of_month: 15, amount: 0, label: `Tracto ${r.length + 1}` }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar tracto
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.id || i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px]">Etiqueta</Label>
                    <Input
                      className="mt-1 h-9"
                      value={r.label || ''}
                      onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      placeholder={`Tracto ${i + 1}`}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-[11px]">Día</Label>
                    <Input
                      type="number" min={1} max={31} className="mt-1 h-9"
                      value={r.day_of_month}
                      onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, day_of_month: Number(e.target.value) } : x))}
                    />
                  </div>
                  <div className="w-36">
                    <Label className="text-[11px]">Monto ({symbol})</Label>
                    <Input
                      type="number" min={0} step="0.01" className="mt-1 h-9"
                      value={r.amount}
                      onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                    />
                  </div>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Datos de facturación */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Datos de facturación</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Razón social / Nombre</Label>
                <Input className="mt-1.5" value={form.billing_name || ''} onChange={e => set({ billing_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cédula jurídica</Label>
                <Input className="mt-1.5" value={form.billing_tax_id || ''} onChange={e => set({ billing_tax_id: e.target.value })} placeholder="3-101-000000" />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input className="mt-1.5" value={form.billing_phone || ''} onChange={e => set({ billing_phone: e.target.value })} placeholder="8888-8888" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Correo</Label>
                <Input type="email" className="mt-1.5" value={form.billing_email || ''} onChange={e => set({ billing_email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Dirección</Label>
                <Textarea className="mt-1.5 min-h-[60px] text-sm" value={form.billing_address || ''} onChange={e => set({ billing_address: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notas internas</Label>
                <Textarea className="mt-1.5 min-h-[50px] text-sm" value={form.notes || ''} onChange={e => set({ notes: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {client && onDelete && (
            <Button
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => {
                if (confirm(`¿Eliminar ${client.name} del tracker de pagos?`)) {
                  onDelete(client.id);
                  onOpenChange(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
