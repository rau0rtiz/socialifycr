import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, AlertTriangle, CheckCircle2, Plus, Send, Trash2, Loader2, Sparkles } from 'lucide-react';
import {
  AgencyCollection,
  useAgencyCollections,
  useUpsertCollection,
  useMarkCollectionPaid,
  useDeleteCollection,
  useSendDailyCollectionsEmail,
} from '@/hooks/use-agency-collections';
import { CustomerSummary } from '@/hooks/use-agency-finances';

const fmtMoney = (n: number, c: string) =>
  c === 'CRC' ? `₡${Math.round(n).toLocaleString('es-CR')}` : `$${Math.round(n).toLocaleString('en-US')}`;

const todayStr = () => {
  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  return nowCR.toISOString().slice(0, 10);
};

const fmtDateShort = (iso: string) => {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', timeZone: 'America/Costa_Rica' });
};

const TYPE_LABEL: Record<string, string> = {
  recurring: 'Mensual recurrente',
  one_off: 'One-off (producción única)',
  post_production: 'Post-producción',
};

interface Props {
  customers: CustomerSummary[];
}

export const CollectionsSection = ({ customers }: Props) => {
  const { data: collections = [], isLoading } = useAgencyCollections();
  const upsert = useUpsertCollection();
  const markPaid = useMarkCollectionPaid();
  const del = useDeleteCollection();
  const sendEmail = useSendDailyCollectionsEmail();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AgencyCollection | null>(null);
  const [form, setForm] = useState<Partial<AgencyCollection>>({});

  // Pay dialog (manual amount + upsell support)
  const [payTarget, setPayTarget] = useState<AgencyCollection | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Quick upsell dialog
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellForm, setUpsellForm] = useState<{ customer_name: string; amount: string; currency: 'USD' | 'CRC'; notes: string }>({
    customer_name: '',
    amount: '',
    currency: 'USD',
    notes: '',
  });

  const today = todayStr();
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const groups = useMemo(() => {
    const pending = collections.filter(c => c.status === 'pending');
    return {
      overdue: pending.filter(c => c.due_date < today),
      today: pending.filter(c => c.due_date === today),
      upcoming: pending.filter(c => c.due_date > today && c.due_date <= in7days),
      future: pending.filter(c => c.due_date > in7days),
    };
  }, [collections, today, in7days]);

  const totalUsd = (items: AgencyCollection[]) =>
    items.reduce((s, c) => s + (c.currency === 'CRC' ? c.amount / 520 : Number(c.amount)), 0);

  const openNew = (customerName?: string) => {
    setEditing(null);
    setForm({
      customer_name: customerName || '',
      due_date: today,
      amount: 0,
      currency: 'USD',
      collection_type: 'recurring',
    });
    setOpenForm(true);
  };

  const openEdit = (c: AgencyCollection) => {
    setEditing(c);
    setForm(c);
    setOpenForm(true);
  };

  const handleSave = () => {
    if (!form.customer_name || !form.due_date || !form.amount) {
      return;
    }
    upsert.mutate(
      {
        ...(editing ? { id: editing.id } : {}),
        customer_name: form.customer_name!,
        due_date: form.due_date!,
        amount: Number(form.amount),
        currency: (form.currency || 'USD') as any,
        collection_type: (form.collection_type || 'recurring') as any,
        notes: form.notes ?? null,
      },
      { onSuccess: () => { setOpenForm(false); setForm({}); } }
    );
  };

  const renderRow = (c: AgencyCollection, variant: 'overdue' | 'today' | 'upcoming' | 'future') => {
    const colorMap = {
      overdue: 'border-l-red-500 bg-red-500/5',
      today: 'border-l-emerald-500 bg-emerald-500/5',
      upcoming: 'border-l-amber-500 bg-amber-500/5',
      future: 'border-l-muted-foreground/30',
    };
    return (
      <div key={c.id} className={`border-l-4 ${colorMap[variant]} px-3 py-2 rounded-r flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{c.customer_name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{TYPE_LABEL[c.collection_type]?.split(' ')[0]}</Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{fmtDateShort(c.due_date)}</span>
            <span>·</span>
            <span className="font-mono font-semibold text-foreground">{fmtMoney(c.amount, c.currency)}</span>
            {c.notes && <span className="truncate italic">— {c.notes}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(c)}>Editar</Button>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setPayTarget(c);
              setPayAmount(String(c.amount));
              setPayNotes(c.notes || '');
            }}
            disabled={markPaid.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Cobrado
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => del.mutate(c.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Cobros pendientes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Total pendiente: <span className="font-semibold text-foreground">{fmtMoney(totalUsd([...groups.overdue, ...groups.today, ...groups.upcoming, ...groups.future]), 'USD')}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => sendEmail.mutate({ test_email: 'ale@socialifycr.com' })} disabled={sendEmail.isPending}>
              {sendEmail.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Test correo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/40 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400"
              onClick={() => {
                setUpsellForm({ customer_name: '', amount: '', currency: 'USD', notes: '' });
                setUpsellOpen(true);
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Registrar upsell
            </Button>
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo cobro
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <>
            {/* Vencidos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Vencidos ({groups.overdue.length})
                </h3>
                {groups.overdue.length > 0 && (
                  <span className="text-xs font-mono text-muted-foreground">{fmtMoney(totalUsd(groups.overdue), 'USD')}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {groups.overdue.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-3 py-2">Sin cobros vencidos 🎉</p>
                ) : groups.overdue.map(c => renderRow(c, 'overdue'))}
              </div>
            </div>

            {/* Hoy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  📅 Hoy ({groups.today.length})
                </h3>
                {groups.today.length > 0 && (
                  <span className="text-xs font-mono text-muted-foreground">{fmtMoney(totalUsd(groups.today), 'USD')}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {groups.today.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-3 py-2">Nada para cobrar hoy</p>
                ) : groups.today.map(c => renderRow(c, 'today'))}
              </div>
            </div>

            {/* Próximos 7 días */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  ⏳ Próximos 7 días ({groups.upcoming.length})
                </h3>
                {groups.upcoming.length > 0 && (
                  <span className="text-xs font-mono text-muted-foreground">{fmtMoney(totalUsd(groups.upcoming), 'USD')}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {groups.upcoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-3 py-2">Sin cobros próximos</p>
                ) : groups.upcoming.map(c => renderRow(c, 'upcoming'))}
              </div>
            </div>

            {/* Futuros */}
            {groups.future.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Más adelante ({groups.future.length}) — {fmtMoney(totalUsd(groups.future), 'USD')}
                </summary>
                <div className="space-y-1.5 mt-2">
                  {groups.future.map(c => renderRow(c, 'future'))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>

      {/* Form dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cobro' : 'Nuevo cobro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <Select value={form.customer_name || ''} onValueChange={(v) => setForm(f => ({ ...f, customer_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona cliente..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.customer_name} value={c.customer_name}>{c.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-1"
                placeholder="...o escribe un nombre nuevo"
                value={form.customer_name || ''}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de cobro</Label>
                <Input type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.collection_type || 'recurring'} onValueChange={(v) => setForm(f => ({ ...f, collection_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Mensual recurrente</SelectItem>
                    <SelectItem value="one_off">One-off</SelectItem>
                    <SelectItem value="post_production">Post-producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto</Label>
                <Input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={form.currency || 'USD'} onValueChange={(v) => setForm(f => ({ ...f, currency: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea placeholder="Detalles del cobro..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending || !form.customer_name || !form.due_date || !form.amount}>
              {upsert.isPending ? 'Guardando...' : editing ? 'Guardar' : 'Crear cobro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm payment dialog (manual amount — supports upsells / partial) */}
      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{payTarget.customer_name}</span> · programado: <span className="font-mono">{fmtMoney(payTarget.amount, payTarget.currency)}</span>
              </div>
              <div>
                <Label>Monto cobrado ({payTarget.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Si fue distinto al programado, ajústalo aquí"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tip: si cobraste de más por un upsell, sube el monto. Si fue parcial, bájalo.
                </p>
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Ej: incluye upsell de post-producción"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!payTarget || !payAmount || markPaid.isPending}
              onClick={async () => {
                if (!payTarget) return;
                const amt = Number(payAmount);
                if (!Number.isFinite(amt) || amt <= 0) return;
                // Save notes if changed
                if ((payNotes || '') !== (payTarget.notes || '')) {
                  await upsert.mutateAsync({ id: payTarget.id, customer_name: payTarget.customer_name, due_date: payTarget.due_date, amount: payTarget.amount, currency: payTarget.currency, collection_type: payTarget.collection_type, notes: payNotes || null });
                }
                markPaid.mutate({ id: payTarget.id, paid_amount: amt }, {
                  onSuccess: () => setPayTarget(null),
                });
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick upsell dialog — creates a new collection already marked as paid */}
      <Dialog open={upsellOpen} onOpenChange={setUpsellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" /> Registrar upsell o pago extra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Úsalo para cobros adicionales fuera del plan recurrente (upsells, ajustes, producción extra). Se guarda como cobrado de inmediato.
            </p>
            <div>
              <Label>Cliente</Label>
              <Select value={upsellForm.customer_name} onValueChange={(v) => setUpsellForm(f => ({ ...f, customer_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona cliente..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.customer_name} value={c.customer_name}>{c.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-1"
                placeholder="...o escribe un nombre nuevo"
                value={upsellForm.customer_name}
                onChange={e => setUpsellForm(f => ({ ...f, customer_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={upsellForm.amount}
                  onChange={e => setUpsellForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={upsellForm.currency} onValueChange={(v) => setUpsellForm(f => ({ ...f, currency: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Concepto / notas</Label>
              <Textarea
                placeholder="Ej: Upsell post-producción reel especial"
                value={upsellForm.notes}
                onChange={e => setUpsellForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpsellOpen(false)}>Cancelar</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!upsellForm.customer_name || !upsellForm.amount || upsert.isPending || markPaid.isPending}
              onClick={async () => {
                const amt = Number(upsellForm.amount);
                if (!Number.isFinite(amt) || amt <= 0) return;
                // Insert a new collection (one_off) then mark paid
                const today = todayStr();
                // We need the new id — quick path: insert via supabase directly is wrapped in upsert, but it doesn't return id.
                // Workaround: create then refetch and find the latest matching record.
                await upsert.mutateAsync({
                  customer_name: upsellForm.customer_name,
                  due_date: today,
                  amount: amt,
                  currency: upsellForm.currency,
                  collection_type: 'one_off',
                  notes: upsellForm.notes ? `[Upsell] ${upsellForm.notes}` : '[Upsell]',
                });
                // Refetch handled by invalidate; mark-paid is tricky without id, so do a direct update via a brief query.
                try {
                  const { data } = await (await import('@/integrations/supabase/client')).supabase
                    .from('agency_collections' as any)
                    .select('id')
                    .eq('customer_name', upsellForm.customer_name)
                    .eq('due_date', today)
                    .eq('amount', amt)
                    .order('created_at', { ascending: false })
                    .limit(1);
                  const newId = (data as any)?.[0]?.id;
                  if (newId) {
                    await markPaid.mutateAsync({ id: newId, paid_amount: amt });
                  }
                } catch {}
                setUpsellOpen(false);
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Guardar como cobrado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
