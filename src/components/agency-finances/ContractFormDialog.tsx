import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AgencyContract, BillingAccount, useUpsertBillingAccount, useUpsertContract } from '@/hooks/use-agency-finances';
import { Plus } from 'lucide-react';

interface Client { id: string; name: string }

const SERVICE_OPTIONS = ['Pauta', 'Contenido orgánico', 'Reportes', 'Setter', 'Closer', 'Frameworks', 'Email Marketing', 'Stories'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: Client[];
  billingAccounts: BillingAccount[];
  initial?: AgencyContract | null;
}

export const ContractFormDialog = ({ open, onOpenChange, clients, billingAccounts, initial }: Props) => {
  const upsert = useUpsertContract();
  const upsertBilling = useUpsertBillingAccount();
  const [showNewBilling, setShowNewBilling] = useState(false);
  const [newBillingName, setNewBillingName] = useState('');

  const [form, setForm] = useState<Partial<AgencyContract>>({
    client_id: '',
    billing_account_id: null,
    monthly_amount: 0,
    currency: 'USD',
    billing_frequency: 'monthly',
    posts_per_month: 0,
    services: [],
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    status: 'active',
    churn_reason: null,
    notes: null,
  });

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({
      client_id: '',
      billing_account_id: null,
      monthly_amount: 0,
      currency: 'USD',
      billing_frequency: 'monthly',
      posts_per_month: 0,
      services: [],
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      status: 'active',
      churn_reason: null,
      notes: null,
    });
  }, [initial, open]);

  const toggleService = (s: string) => {
    const cur = form.services || [];
    setForm({ ...form, services: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] });
  };

  const handleSave = async () => {
    if (!form.client_id) return;
    let billingId = form.billing_account_id ?? null;
    if (showNewBilling && newBillingName.trim()) {
      billingId = await upsertBilling.mutateAsync({ name: newBillingName.trim() });
    }
    await upsert.mutateAsync({ ...form, billing_account_id: billingId, client_id: form.client_id! } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pagador / Paraguas</Label>
              {!showNewBilling ? (
                <div className="flex gap-2">
                  <Select value={form.billing_account_id ?? 'none'} onValueChange={(v) => setForm({ ...form, billing_account_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Directo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Directo (sin paraguas)</SelectItem>
                      {billingAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowNewBilling(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Ej. Hilda Lopez" value={newBillingName} onChange={(e) => setNewBillingName(e.target.value)} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowNewBilling(false); setNewBillingName(''); }}>Cancelar</Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Monto</Label>
              <Input type="number" value={form.monthly_amount ?? 0} onChange={(e) => setForm({ ...form, monthly_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v: any) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CRC">CRC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frecuencia</Label>
              <Select value={form.billing_frequency} onValueChange={(v: any) => setForm({ ...form, billing_frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Posts / mes</Label>
              <Input type="number" value={form.posts_per_month ?? 0} onChange={(e) => setForm({ ...form, posts_per_month: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="churned">Churn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Servicios incluidos</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SERVICE_OPTIONS.map(s => (
                <Badge
                  key={s}
                  variant={form.services?.includes(s) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleService(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Fecha fin (opcional)</Label>
              <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
            </div>
          </div>

          {form.status === 'churned' && (
            <div>
              <Label>Razón de churn</Label>
              <Input value={form.churn_reason ?? ''} onChange={(e) => setForm({ ...form, churn_reason: e.target.value })} />
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.client_id || upsert.isPending}>
            {upsert.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
