import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CustomerSummary, AgencyInvoice, toUsd } from '@/hooks/use-agency-finances';
import { useAgencyCollections } from '@/hooks/use-agency-collections';

const fmtMoney = (n: number, c: string) =>
  c === 'CRC' ? `₡${Math.round(n).toLocaleString('es-CR')}` : `$${Math.round(n).toLocaleString('en-US')}`;

const fmtDateLong = (iso: string) => {
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00Z');
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Costa_Rica' });
};

interface Props {
  customer: CustomerSummary | null;
  invoices: AgencyInvoice[];
  onClose: () => void;
}

export const CustomerHistoryDialog = ({ customer, invoices, onClose }: Props) => {
  const { data: collections = [] } = useAgencyCollections();

  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    return invoices
      .filter(i => i.customer_name.trim().toLowerCase() === customer.customer_name.toLowerCase())
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [customer, invoices]);

  const customerCollections = useMemo(() => {
    if (!customer) return [];
    return collections
      .filter(c => c.customer_name.trim().toLowerCase() === customer.customer_name.toLowerCase())
      .sort((a, b) => (b.paid_at || b.due_date).localeCompare(a.paid_at || a.due_date));
  }, [customer, collections]);

  // Combinar y ordenar todo cronológicamente
  const timeline = useMemo(() => {
    const items: Array<{
      date: string;
      label: string;
      amount: number;
      currency: string;
      source: 'invoice' | 'collection';
      status: string;
      notes?: string;
    }> = [];
    customerInvoices.forEach(i => items.push({
      date: i.invoice_date,
      label: i.invoice_number || `Factura ${i.invoice_external_id || ''}`,
      amount: Number(i.total) || 0,
      currency: i.currency,
      source: 'invoice',
      status: i.status || 'pagada',
    }));
    customerCollections.forEach(c => items.push({
      date: c.paid_at?.slice(0, 10) || c.due_date,
      label: c.collection_type === 'one_off' ? 'One-off' : c.collection_type === 'post_production' ? 'Post-prod' : 'Mensual',
      amount: Number(c.paid_amount ?? c.amount),
      currency: c.currency,
      source: 'collection',
      status: c.status,
      notes: c.notes || undefined,
    }));
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [customerInvoices, customerCollections]);

  const totalUsd = timeline
    .filter(t => t.status !== 'cancelled' && t.status !== 'pending')
    .reduce((s, t) => s + toUsd(t.amount, t.currency), 0);

  return (
    <Dialog open={!!customer} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer?.customer_name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Historial completo · LTV: <span className="font-mono font-semibold">{fmtMoney(totalUsd, 'USD')}</span> · {timeline.length} movimientos
          </p>
        </DialogHeader>

        <div className="space-y-1 mt-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin historial registrado</p>
          ) : (
            timeline.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-muted/50 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.label}</span>
                    {t.source === 'invoice' ? (
                      <Badge variant="outline" className="text-[10px] h-5">Zoho</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] h-5">Cobro</Badge>
                    )}
                    {t.status === 'pending' && <Badge variant="secondary" className="text-[10px] h-5">Pendiente</Badge>}
                    {t.status === 'cancelled' && <Badge variant="destructive" className="text-[10px] h-5">Cancelado</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDateLong(t.date)}
                    {t.notes && <span className="italic"> — {t.notes}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-semibold">{fmtMoney(t.amount, t.currency)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
