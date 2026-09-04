import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Loader2, Users } from 'lucide-react';
import {
  useAgencyPayments,
  Installment,
  PayClient,
} from '@/hooks/use-agency-payments';
import { MonthHeader } from '@/components/agency-payments/MonthHeader';
import { OverdueStrip } from '@/components/agency-payments/OverdueStrip';
import { PaymentClientRow } from '@/components/agency-payments/PaymentClientRow';
import { PaymentClientDialog, SystemClient } from '@/components/agency-payments/PaymentClientDialog';

export default function Pagos() {
  const [monthDate, setMonthDate] = useState(() => {
    const n = new Date();
    const cur = new Date(n.getFullYear(), n.getMonth(), 1);
    return cur < PAYMENTS_START ? PAYMENTS_START : cur;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    clients, dates, monthRows, totalsByCurrency, overdue, isLoading,
    saveClient, deleteClient, upsertRecord, togglePaid,
  } = useAgencyPayments(monthDate);

  const { data: systemClients = [] } = useQuery({
    queryKey: ['agency-pay-system-clients'],
    queryFn: async (): Promise<SystemClient[]> => {
      const { data, error } = await supabase.from('clients').select('id, name, logo_url').order('name');
      if (error) throw error;
      return (data || []) as SystemClient[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const logoOf = (c: PayClient) =>
    c.logo_url || systemClients.find(s => s.id === c.client_id)?.logo_url || null;

  const editing = useMemo(
    () => (editingId ? clients.find(c => c.id === editingId) || null : null),
    [editingId, clients],
  );
  const editingTracts = useMemo(
    () => dates.filter(d => d.client_id === editingId),
    [dates, editingId],
  );

  const markPaid = (inst: Installment) => {
    upsertRecord.mutate({
      inst,
      patch: { paid: true, paid_at: new Date().toISOString(), amount: inst.record?.amount ?? inst.withIva },
    });
  };

  const setMethod = (inst: Installment, method: string) => {
    upsertRecord.mutate({ inst, patch: { payment_method: method } });
  };

  const openNew = () => { setEditingId(null); setDialogOpen(true); };
  const openEdit = (id: string) => { setEditingId(id); setDialogOpen(true); };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <MonthHeader
          monthDate={monthDate}
          onShift={(d) => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + d, 1))}
          onToday={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          totals={totalsByCurrency}
          onNewClient={openNew}
        />

        <OverdueStrip items={overdue} onMarkPaid={markPaid} />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : monthRows.length === 0 ? (
          <Card className="p-10 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin clientes activos. Agregá el primero.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {monthRows.map(row => (
              <PaymentClientRow
                key={row.client.id}
                row={row}
                logo={logoOf(row.client)}
                monthDate={monthDate}
                onEdit={() => openEdit(row.client.id)}
                onTogglePaid={togglePaid}
                onSetMethod={setMethod}
              />
            ))}
          </div>
        )}
      </div>

      <PaymentClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        tracts={editingTracts}
        systemClients={systemClients}
        onSave={(p) => saveClient.mutateAsync(p)}
        onDelete={(id) => deleteClient.mutate(id)}
        saving={saveClient.isPending}
      />
    </DashboardLayout>
  );
}
