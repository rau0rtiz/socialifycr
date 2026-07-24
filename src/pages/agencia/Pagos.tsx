import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Circle, DollarSign, AlertTriangle, Users, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayClient {
  id: string;
  name: string;
  monthly_amount: number;
  currency: string;
  notes: string | null;
  active: boolean;
  iva_rate: number;
}
interface PayDate {
  id: string;
  client_id: string;
  day_of_month: number;
  amount: number;
  label: string | null;
  sort_order: number;
}
interface PayRecord {
  id: string;
  client_id: string;
  schedule_id: string | null;
  period: string; // YYYY-MM-DD
  due_date: string;
  amount: number;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
}

const PAYMENT_METHODS = [
  { value: 'compra_click', label: 'Compra Click' },
  { value: 'sinpe', label: 'SINPE' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
] as const;

const methodLabel = (v: string | null | undefined) =>
  PAYMENT_METHODS.find(m => m.value === v)?.label || '';

const monthLabel = (d: Date) =>
  d.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

const clampDay = (year: number, month0: number, day: number) => {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return Math.min(day, lastDay);
};

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Pagos() {
  const qc = useQueryClient();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editClient, setEditClient] = useState<PayClient | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const periodIso = isoDate(monthDate);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['agency-pay-clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as PayClient[];
    },
  });

  const { data: dates = [] } = useQuery({
    queryKey: ['agency-pay-dates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_dates')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PayDate[];
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ['agency-pay-records', periodIso],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_payment_records')
        .select('*')
        .eq('period', periodIso);
      if (error) throw error;
      return (data || []) as PayRecord[];
    },
  });

  // Build the expected list per client for the selected month
  const rows = useMemo(() => {
    return clients
      .filter(c => c.active)
      .map(c => {
        const ivaRate = Number(c.iva_rate || 0);
        const cDates = dates
          .filter(d => d.client_id === c.id)
          .sort((a, b) => a.day_of_month - b.day_of_month);
        const installments = cDates.map(d => {
          const day = clampDay(monthDate.getFullYear(), monthDate.getMonth(), d.day_of_month);
          const due = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
          const rec = records.find(r => r.schedule_id === d.id);
          const base = Number(d.amount || 0);
          const withIva = base * (1 + ivaRate / 100);
          return {
            date: d,
            dueIso: isoDate(due),
            record: rec,
            base,
            withIva,
          };
        });
        const totalDue = installments.reduce((s, i) => s + i.withIva, 0);
        const totalPaid = installments.reduce(
          (s, i) => s + (i.record?.paid ? Number(i.record.amount || i.withIva) : 0),
          0,
        );
        const subtotal = installments.reduce((s, i) => s + i.base, 0);
        const ivaAmount = totalDue - subtotal;
        return { client: c, installments, totalDue, totalPaid, subtotal, ivaAmount, ivaRate };
      });
  }, [clients, dates, records, monthDate]);

  const totals = useMemo(() => {
    const byCurrency: Record<string, { due: number; paid: number }> = {};
    rows.forEach(r => {
      const cur = r.client.currency || 'USD';
      byCurrency[cur] ??= { due: 0, paid: 0 };
      byCurrency[cur].due += r.totalDue;
      byCurrency[cur].paid += r.totalPaid;
    });
    return byCurrency;
  }, [rows]);

  const togglePaid = useMutation({
    mutationFn: async ({
      client,
      schedule,
      current,
      dueIso,
      amountWithIva,
    }: {
      client: PayClient;
      schedule: PayDate;
      current: PayRecord | undefined;
      dueIso: string;
      amountWithIva: number;
    }) => {
      if (current) {
        const newPaid = !current.paid;
        const { error } = await (supabase as any)
          .from('agency_payment_records')
          .update({
            paid: newPaid,
            paid_at: newPaid ? new Date().toISOString() : null,
          })
          .eq('id', current.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_payment_records').insert({
          client_id: client.id,
          schedule_id: schedule.id,
          period: periodIso,
          due_date: dueIso,
          amount: amountWithIva,
          currency: client.currency,
          paid: true,
          paid_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-pay-records', periodIso] }),
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const setMethod = useMutation({
    mutationFn: async ({
      client,
      schedule,
      current,
      dueIso,
      amountWithIva,
      method,
    }: {
      client: PayClient;
      schedule: PayDate;
      current: PayRecord | undefined;
      dueIso: string;
      amountWithIva: number;
      method: string;
    }) => {
      if (current) {
        const { error } = await (supabase as any)
          .from('agency_payment_records')
          .update({ payment_method: method })
          .eq('id', current.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_payment_records').insert({
          client_id: client.id,
          schedule_id: schedule.id,
          period: periodIso,
          due_date: dueIso,
          amount: amountWithIva,
          currency: client.currency,
          paid: false,
          payment_method: method,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-pay-records', periodIso] }),
    onError: (e: any) => toast.error(e.message || 'Error'),
  });


  const shiftMonth = (delta: number) =>
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pagos</h1>
          <p className="text-sm text-muted-foreground">
            Cobros recurrentes de clientes. Marcá cada pago cuando entre.
          </p>
        </div>
        <Button onClick={() => setShowNewClient(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[180px] text-center text-sm font-medium capitalize">
          {monthLabel(monthDate)}
        </div>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(totals).map(([cur, t]) => {
          const symbol = cur === 'CRC' ? '₡' : '$';
          const pct = t.due > 0 ? Math.round((t.paid / t.due) * 100) : 0;
          return (
            <Card key={cur} className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" /> Cobrado en {cur}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {symbol}
                {t.paid.toLocaleString()}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / {symbol}
                  {t.due.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{pct}% cobrado</div>
            </Card>
          );
        })}
        {rows.length === 0 && !loadingClients && (
          <Card className="p-4 sm:col-span-3 border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Agregá un cliente para empezar a llevar el control.
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        {rows.map(({ client, installments, totalDue, totalPaid, subtotal, ivaAmount, ivaRate }) => {
          const symbol = client.currency === 'CRC' ? '₡' : '$';
          const missing = installments.filter(i => !i.record?.paid).length;
          const noSchedule = installments.length === 0;
          return (
            <Card key={client.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-foreground">{client.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {symbol}
                    {totalPaid.toLocaleString()} / {symbol}
                    {totalDue.toLocaleString()} este mes ·{' '}
                    {noSchedule ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        Sin fechas configuradas
                      </span>
                    ) : missing === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Al día</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {missing} pendiente{missing > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {ivaRate > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Subtotal {symbol}{subtotal.toLocaleString()} + IVA {ivaRate}% ({symbol}{ivaAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditClient(client)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>

              {noSchedule ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-md p-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Configurá las fechas de
                  cobro en "Editar".
                </div>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {installments.map(({ date, dueIso, record, base, withIva }) => {
                    const paid = !!record?.paid;
                    const isOverdue =
                      !paid && dueIso < isoDate(new Date()) && periodIso === isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                    return (
                      <div
                        key={date.id}
                        className={cn(
                          'group flex flex-col gap-2 rounded-lg border px-3 py-2 transition-colors',
                          paid
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isOverdue
                              ? 'bg-red-500/5 border-red-500/30'
                              : 'bg-background border-border',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            togglePaid.mutate({
                              client,
                              schedule: date,
                              current: record,
                              dueIso,
                              amountWithIva: withIva,
                            })
                          }
                          className="flex items-center gap-3 text-left"
                        >
                          {paid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Circle
                              className={cn(
                                'h-5 w-5 shrink-0',
                                isOverdue ? 'text-red-500' : 'text-muted-foreground',
                              )}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">
                              {symbol}
                              {withIva.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              {ivaRate > 0 && (
                                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                  (IVA incl.)
                                </span>
                              )}
                              {date.label && (
                                <span className="text-xs text-muted-foreground font-normal ml-1">
                                  · {date.label}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Vence día {clampDay(monthDate.getFullYear(), monthDate.getMonth(), date.day_of_month)}
                              {paid && record?.paid_at && (
                                <span className="ml-1">
                                  · pagado {new Date(record.paid_at).toLocaleDateString('es-CR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        <Select
                          value={record?.payment_method || ''}
                          onValueChange={(m) =>
                            setMethod.mutate({
                              client,
                              schedule: date,
                              current: record,
                              dueIso,
                              amountWithIva: withIva,
                              method: m,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px] px-2">
                            <SelectValue placeholder="Método de pago" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => (
                              <SelectItem key={m.value} value={m.value} className="text-xs">
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>


      {showNewClient && (
        <ClientDialog
          open
          onClose={() => setShowNewClient(false)}
          client={null}
          existingDates={[]}
        />
      )}
      {editClient && (
        <ClientDialog
          open
          onClose={() => setEditClient(null)}
          client={editClient}
          existingDates={dates.filter(d => d.client_id === editClient.id)}
        />
      )}
    </div>
  );
}

// ---------- Client edit dialog ----------

interface DraftDate {
  key: string;
  id?: string;
  day_of_month: number;
  amount: number;
  label: string;
}

function ClientDialog({
  open,
  onClose,
  client,
  existingDates,
}: {
  open: boolean;
  onClose: () => void;
  client: PayClient | null;
  existingDates: PayDate[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(client?.name || '');
  const [currency, setCurrency] = useState(client?.currency || 'USD');
  const [notes, setNotes] = useState(client?.notes || '');
  const [active, setActive] = useState(client?.active ?? true);
  const [ivaEnabled, setIvaEnabled] = useState(Number(client?.iva_rate || 0) > 0);
  const [ivaRate, setIvaRate] = useState<number>(Number(client?.iva_rate || 13));
  const [drafts, setDrafts] = useState<DraftDate[]>(() =>
    existingDates.length
      ? existingDates.map(d => ({
          key: d.id,
          id: d.id,
          day_of_month: d.day_of_month,
          amount: Number(d.amount),
          label: d.label || '',
        }))
      : [{ key: crypto.randomUUID(), day_of_month: 15, amount: 0, label: '' }],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const effectiveIva = ivaEnabled ? ivaRate : 0;
  const monthlyTotal = drafts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const monthlyTotalWithIva = monthlyTotal * (1 + effectiveIva / 100);


  const save = async () => {
    if (!name.trim()) {
      toast.error('Ponle un nombre al cliente');
      return;
    }
    setSaving(true);
    try {
      let clientId = client?.id;
      if (clientId) {
        const { error } = await (supabase as any)
          .from('agency_payment_clients')
          .update({
            name: name.trim(),
            currency,
            notes: notes.trim() || null,
            active,
            monthly_amount: monthlyTotal,
            iva_rate: effectiveIva,
          })
          .eq('id', clientId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('agency_payment_clients')
          .insert({
            name: name.trim(),
            currency,
            notes: notes.trim() || null,
            active,
            monthly_amount: monthlyTotal,
            iva_rate: effectiveIva,
          })
          .select()
          .single();
        if (error) throw error;
        clientId = data.id;
      }


      // Sync dates: delete removed, upsert kept/new
      const keptIds = drafts.filter(d => d.id).map(d => d.id!) as string[];
      const removed = existingDates.filter(d => !keptIds.includes(d.id));
      if (removed.length) {
        await (supabase as any)
          .from('agency_payment_dates')
          .delete()
          .in('id', removed.map(r => r.id));
      }
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        if (d.id) {
          await (supabase as any)
            .from('agency_payment_dates')
            .update({
              day_of_month: d.day_of_month,
              amount: d.amount,
              label: d.label || null,
              sort_order: i,
            })
            .eq('id', d.id);
        } else {
          await (supabase as any).from('agency_payment_dates').insert({
            client_id: clientId,
            day_of_month: d.day_of_month,
            amount: d.amount,
            label: d.label || null,
            sort_order: i,
          });
        }
      }

      toast.success('Guardado');
      qc.invalidateQueries({ queryKey: ['agency-pay-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-pay-dates'] });
      qc.invalidateQueries({ queryKey: ['agency-pay-records'] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async () => {
    if (!client) return;
    if (!confirm(`¿Borrar "${client.name}" y todo su historial de cobros?`)) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('agency_payment_clients')
        .delete()
        .eq('id', client.id);
      if (error) throw error;
      toast.success('Cliente eliminado');
      qc.invalidateQueries({ queryKey: ['agency-pay-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-pay-dates'] });
      qc.invalidateQueries({ queryKey: ['agency-pay-records'] });
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const addRow = () =>
    setDrafts(prev => [
      ...prev,
      { key: crypto.randomUUID(), day_of_month: 30, amount: 0, label: '' },
    ]);
  const updateRow = (key: string, patch: Partial<DraftDate>) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d)));
  const removeRow = (key: string) =>
    setDrafts(prev => prev.filter(d => d.key !== key));

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Cliente" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CRC">CRC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={v => setActive(!!v)}
            />
            <Label htmlFor="active" className="text-xs cursor-pointer">
              Cliente activo (aparece en la lista mensual)
            </Label>
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="iva-enabled"
                checked={ivaEnabled}
                onCheckedChange={v => setIvaEnabled(!!v)}
              />
              <Label htmlFor="iva-enabled" className="text-xs cursor-pointer">
                Cobrar IVA
              </Label>
            </div>
            {ivaEnabled && (
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0">Tasa:</Label>
                <Select
                  value={String(ivaRate)}
                  onValueChange={(v) => setIvaRate(v === 'custom' ? ivaRate : Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13">13% (CR)</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="2">2%</SelectItem>
                    <SelectItem value="1">1%</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={ivaRate}
                  onChange={e => setIvaRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="h-8 text-xs w-20"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Fechas de cobro cada mes</Label>
              <span className="text-[11px] text-muted-foreground">
                {ivaEnabled ? (
                  <>Subtotal {currency === 'CRC' ? '₡' : '$'}{monthlyTotal.toLocaleString()} · Total con IVA {currency === 'CRC' ? '₡' : '$'}{monthlyTotalWithIva.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                ) : (
                  <>Total mensual: {currency === 'CRC' ? '₡' : '$'}{monthlyTotal.toLocaleString()}</>
                )}
              </span>
            </div>

            <div className="space-y-2">
              {drafts.map((d, idx) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-4">{idx + 1}.</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Día</span>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={d.day_of_month}
                      onChange={e =>
                        updateRow(d.key, {
                          day_of_month: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)),
                        })
                      }
                      className="h-9 w-16 text-xs text-center"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {currency === 'CRC' ? '₡' : '$'}
                    </span>
                    <Input
                      type="number"
                      value={d.amount}
                      onChange={e =>
                        updateRow(d.key, { amount: parseFloat(e.target.value) || 0 })
                      }
                      className="h-9 text-xs pl-5"
                      placeholder="0"
                    />
                  </div>
                  <Input
                    value={d.label}
                    onChange={e => updateRow(d.key, { label: e.target.value })}
                    placeholder="Etiqueta"
                    className="h-9 text-xs w-28"
                  />
                  {drafts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => removeRow(d.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                className="w-full text-xs h-9"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar otra fecha
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Los días 29–31 se ajustan automáticamente al último día del mes cuando corresponda
              (por ejemplo, febrero).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {client && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeClient}
                disabled={deleting}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
