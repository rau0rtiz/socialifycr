import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronLeft, ChevronRight, Users, Settings2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';


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
  const [manageRow, setManageRow] = useState<{
    client: PayClient;
    schedule: PayDate;
    dueIso: string;
    dueDay: number;
    amountWithIva: number;
    ivaRate: number;
    base: number;
    record: PayRecord | undefined;
  } | null>(null);

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

  // Flatten all installments into ledger rows, sorted by due day
  const ledger = useMemo(() => {
    const items: {
      client: PayClient;
      schedule: PayDate;
      dueIso: string;
      dueDay: number;
      base: number;
      withIva: number;
      ivaRate: number;
      record: PayRecord | undefined;
    }[] = [];
    rows.forEach(r => {
      r.installments.forEach(i => {
        items.push({
          client: r.client,
          schedule: i.date,
          dueIso: i.dueIso,
          dueDay: clampDay(monthDate.getFullYear(), monthDate.getMonth(), i.date.day_of_month),
          base: i.base,
          withIva: i.withIva,
          ivaRate: r.ivaRate,
          record: i.record,
        });
      });
    });
    return items.sort((a, b) => a.dueDay - b.dueDay);
  }, [rows, monthDate]);

  // Aggregated status buckets
  const todayIso = isoDate(new Date());
  const currentPeriodIso = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const isCurrentMonth = periodIso === currentPeriodIso;

  const statusOf = (dueIso: string, paid: boolean): 'paid' | 'overdue' | 'pending' => {
    if (paid) return 'paid';
    if (isCurrentMonth && dueIso < todayIso) return 'overdue';
    return 'pending';
  };

  const bucketTotals = useMemo(() => {
    const b: Record<string, { paid: number; pending: number; overdue: number; sym: string }> = {};
    ledger.forEach(i => {
      const cur = i.client.currency || 'USD';
      const sym = cur === 'CRC' ? '₡' : '$';
      b[cur] ??= { paid: 0, pending: 0, overdue: 0, sym };
      const amt = i.record?.paid ? Number(i.record.amount || i.withIva) : i.withIva;
      const st = statusOf(i.dueIso, !!i.record?.paid);
      if (st === 'paid') b[cur].paid += amt;
      else if (st === 'overdue') b[cur].overdue += amt;
      else b[cur].pending += amt;
    });
    return b;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, todayIso, isCurrentMonth]);

  // Mini annual matrix — status per client across 6 surrounding months
  const miniMonths = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) =>
      new Date(monthDate.getFullYear(), monthDate.getMonth() - 2 + i, 1),
    );
  }, [monthDate]);

  const monthPills = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 3 + i, 1);
      return d;
    });
  }, [monthDate]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestión de Cobros</h1>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
              Panel de control financiero
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowNewClient(true)} size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Nuevo cliente
            </Button>
          </div>
        </div>

        {/* Month selector strip */}
        <div className="px-8 py-3 bg-muted/30 border-b border-border flex items-center gap-2 overflow-x-auto">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {monthPills.map((d) => {
              const active = d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
              const label = d.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '').toUpperCase();
              const year = d.getFullYear() !== new Date().getFullYear() ? ` ${String(d.getFullYear()).slice(2)}` : '';
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1))}
                  className={cn(
                    'px-3 py-1 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background',
                  )}
                >
                  {active ? d.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }).toUpperCase() : `${label}${year}`}
                </button>
              );
            })}
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Left: Mini annual matrix + KPI */}
            <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 p-5">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Estado por cliente
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {rows.length === 0 && !loadingClients && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Agregá un cliente.
                  </div>
                )}
                {rows.map(({ client }) => {
                  return (
                    <button
                      key={client.id}
                      onClick={() => setEditClient(client)}
                      className="w-full flex items-center justify-between gap-2 group text-left"
                    >
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {miniMonths.map((mDate) => {
                          const mIso = isoDate(mDate);
                          const isSel = mDate.getMonth() === monthDate.getMonth() && mDate.getFullYear() === monthDate.getFullYear();
                          // We only have records for the selected month; approximate: dot filled if selected month has all paid
                          if (!isSel) {
                            return <span key={mIso} className="w-1.5 h-1.5 rounded-full bg-muted" />;
                          }
                          const clientLedger = ledger.filter(l => l.client.id === client.id);
                          if (clientLedger.length === 0) {
                            return <span key={mIso} className="w-1.5 h-1.5 rounded-full bg-muted ring-2 ring-muted/40" />;
                          }
                          const hasOverdue = clientLedger.some(l => statusOf(l.dueIso, !!l.record?.paid) === 'overdue');
                          const allPaid = clientLedger.every(l => l.record?.paid);
                          const cls = hasOverdue
                            ? 'bg-red-500 ring-red-500/20'
                            : allPaid
                              ? 'bg-emerald-500 ring-emerald-500/20'
                              : 'bg-primary ring-primary/20';
                          return <span key={mIso} className={cn('w-1.5 h-1.5 rounded-full ring-2', cls)} />;
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2">
                {Object.entries(bucketTotals).map(([cur, t]) => (
                  <div key={cur} className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                    <div className="text-[9px] font-bold text-primary uppercase tracking-widest">
                      Pendiente {cur}
                    </div>
                    <div className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">
                      {t.sym}
                      {(t.pending + t.overdue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Cobrado {t.sym}{t.paid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right: Detailed ledger */}
            <div className="flex-1 min-w-0">
              {ledger.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? 'Sin clientes activos todavía.'
                    : 'Ningún cliente tiene fechas configuradas para este mes.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pl-6 pr-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vence</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cliente / Concepto</th>
                        <th className="px-3 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monto</th>
                        <th className="px-3 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Método</th>
                        <th className="pl-3 pr-6 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {ledger.map((i) => {
                        const paid = !!i.record?.paid;
                        const st = statusOf(i.dueIso, paid);
                        const sym = i.client.currency === 'CRC' ? '₡' : '$';
                        const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), i.dueDay);
                        return (
                          <tr key={i.client.id + i.schedule.id} className="hover:bg-muted/40 group transition-colors">
                            <td className="pl-6 pr-3 py-3">
                              <div className="text-xs font-bold text-foreground tabular-nums">
                                {String(i.dueDay).padStart(2, '0')} {dueDate.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '')}
                              </div>
                              {paid && i.record?.paid_at && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                                  ✓ {new Date(i.record.paid_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                onClick={() => setEditClient(i.client)}
                                className="flex items-center gap-2.5 text-left group/name"
                              >
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full shrink-0',
                                  st === 'paid' && 'bg-emerald-500',
                                  st === 'overdue' && 'bg-red-500',
                                  st === 'pending' && 'bg-primary',
                                )} />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-foreground group-hover/name:text-primary transition-colors truncate">
                                    {i.client.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {i.schedule.label || 'Cuota mensual'}
                                    {i.ivaRate > 0 && ` · IVA ${i.ivaRate}%`}
                                  </div>
                                </div>
                              </button>
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <span className="text-xs font-bold text-foreground tabular-nums">
                                {sym}{i.withIva.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                              {i.ivaRate > 0 && (
                                <div className="text-[9px] text-muted-foreground">
                                  base {sym}{i.base.toLocaleString()}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Select
                                value={i.record?.payment_method || ''}
                                onValueChange={(m) =>
                                  setMethod.mutate({
                                    client: i.client,
                                    schedule: i.schedule,
                                    current: i.record,
                                    dueIso: i.dueIso,
                                    amountWithIva: i.withIva,
                                    method: m,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 text-[11px] px-2 border-transparent bg-transparent hover:bg-background hover:border-border focus:border-border w-[130px]">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_METHODS.map(m => (
                                    <SelectItem key={m.value} value={m.value} className="text-xs">
                                      {m.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="pl-3 pr-6 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePaid.mutate({
                                      client: i.client,
                                      schedule: i.schedule,
                                      current: i.record,
                                      dueIso: i.dueIso,
                                      amountWithIva: i.withIva,
                                    })
                                  }
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all',
                                    st === 'paid' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400',
                                    st === 'overdue' && 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-400',
                                    st === 'pending' && 'bg-primary/10 text-primary hover:bg-primary/20',
                                  )}
                                >
                                  {st === 'paid' ? 'Pagado' : st === 'overdue' ? 'Vencido' : 'Pendiente'}
                                </button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    setManageRow({
                                      client: i.client,
                                      schedule: i.schedule,
                                      dueIso: i.dueIso,
                                      dueDay: i.dueDay,
                                      amountWithIva: i.withIva,
                                      ivaRate: i.ivaRate,
                                      base: i.base,
                                      record: i.record,
                                    })
                                  }
                                >
                                  <Settings2 className="h-3 w-3" /> Gestionar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>



          {/* Footer summary */}
          {ledger.length > 0 && (
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex gap-5 flex-wrap text-[10px] font-bold text-muted-foreground">
                {Object.entries(bucketTotals).map(([cur, t]) => (
                  <div key={cur} className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      PAGADO {t.sym}{t.paid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      PENDIENTE {t.sym}{t.pending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      VENCIDO {t.sym}{t.overdue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
        )}
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
      {manageRow && (
        <ManagePaymentDialog
          open
          onClose={() => setManageRow(null)}
          row={manageRow}
          periodIso={periodIso}
          onSaved={() => qc.invalidateQueries({ queryKey: ['agency-pay-records', periodIso] })}
        />
      )}
    </DashboardLayout>
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


// ---------- Manage Payment Dialog ----------

function ManagePaymentDialog({
  open,
  onClose,
  row,
  periodIso,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  row: {
    client: PayClient;
    schedule: PayDate;
    dueIso: string;
    dueDay: number;
    amountWithIva: number;
    ivaRate: number;
    base: number;
    record: PayRecord | undefined;
  };
  periodIso: string;
  onSaved: () => void;
}) {
  const sym = row.client.currency === 'CRC' ? '₡' : '$';
  const [paid, setPaid] = useState(!!row.record?.paid);
  const [amount, setAmount] = useState<number>(
    Number(row.record?.amount ?? row.amountWithIva) || row.amountWithIva,
  );
  const [method, setMethod] = useState<string>(row.record?.payment_method || '');
  const [paidAt, setPaidAt] = useState<string>(
    row.record?.paid_at ? row.record.paid_at.slice(0, 10) : isoDate(new Date()),
  );
  const [notes, setNotes] = useState<string>(row.record?.notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        amount,
        paid,
        paid_at: paid ? new Date(paidAt).toISOString() : null,
        payment_method: method || null,
        notes: notes || null,
      };
      if (row.record) {
        const { error } = await (supabase as any)
          .from('agency_payment_records')
          .update(payload)
          .eq('id', row.record.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_payment_records').insert({
          client_id: row.client.id,
          schedule_id: row.schedule.id,
          period: periodIso,
          due_date: row.dueIso,
          currency: row.client.currency,
          ...payload,
        });
        if (error) throw error;
      }
      toast.success('Pago actualizado');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!row.record) return;
    if (!confirm('¿Eliminar este registro de pago?')) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('agency_payment_records')
        .delete()
        .eq('id', row.record.id);
      if (error) throw error;
      toast.success('Registro eliminado');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar pago</DialogTitle>
          <div className="text-xs text-muted-foreground mt-1">
            {row.client.name} · Vence día {row.dueDay}
            {row.schedule.label ? ` · ${row.schedule.label}` : ''}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Marcar como pagado
              </div>
              <div className="text-[11px] text-muted-foreground">
                {paid ? 'Registrado como cobrado' : 'Aún pendiente de cobro'}
              </div>
            </div>
            <Checkbox checked={paid} onCheckedChange={(v) => setPaid(!!v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Monto ({sym})
              </Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-9 mt-1"
              />
              {row.ivaRate > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Base {sym}{row.base.toLocaleString()} · IVA {row.ivaRate}%
                </div>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Fecha de pago
              </Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                disabled={!paid}
                className="h-9 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Método de pago
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Seleccioná un método" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Notas
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referencia, comprobante, comentario..."
              className="mt-1 min-h-[70px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {row.record && (
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={saving}
                className="text-destructive hover:text-destructive gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

