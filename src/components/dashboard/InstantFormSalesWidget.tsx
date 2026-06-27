import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { useInstantFormSales, useInstantFormLeads } from '@/hooks/use-instant-form-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const formatMoney = (amount: number, currency: string) => {
  const symbol = currency === 'USD' ? '$' : '₡';
  return symbol + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
};

export const InstantFormSalesWidget = ({ clientId }: Props) => {
  const { data: sales = [], isLoading } = useInstantFormSales(clientId);
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('month');

  const filteredSales = useMemo(() => {
    if (rangeDays === 'all') return sales;
    if (rangeDays === 'month') {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return sales.filter((s) => new Date(s.sale_date).getTime() >= firstOfMonth);
    }
    const days = parseInt(rangeDays, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return sales.filter((s) => new Date(s.sale_date).getTime() >= cutoff);
  }, [sales, rangeDays]);

  const filteredLeads = useMemo(() => {
    if (rangeDays === 'all') return leads;
    if (rangeDays === 'month') {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return leads.filter((l) => {
        const ts = l.created_time || l.created_at;
        return ts ? new Date(ts).getTime() >= firstOfMonth : false;
      });
    }
    const days = parseInt(rangeDays, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return leads.filter((l) => {
      const ts = l.created_time || l.created_at;
      return ts ? new Date(ts).getTime() >= cutoff : false;
    });
  }, [leads, rangeDays]);

  const totals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    filteredSales.forEach((s) => {
      byCurrency[s.currency] = (byCurrency[s.currency] || 0) + Number(s.amount || 0);
    });
    return byCurrency;
  }, [filteredSales]);

  const conversionRate = filteredLeads.length > 0
    ? Math.round((filteredSales.length / filteredLeads.length) * 1000) / 10
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Ventas desde Instant Form
          <Badge variant="secondary">{filteredSales.length}</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Total ventas
            </div>
            <div className="mt-1 space-y-0.5">
              {Object.keys(totals).length === 0 ? (
                <div className="text-lg font-semibold">—</div>
              ) : (
                Object.entries(totals).map(([cur, amt]) => (
                  <div key={cur} className="text-lg font-semibold tabular-nums">
                    {formatMoney(amt, cur)}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Cantidad
            </div>
            <div className="text-lg font-semibold mt-1">{filteredSales.length}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Conversión
            </div>
            <div className="text-lg font-semibold mt-1">{conversionRate}%</div>
          </div>
        </div>

        {/* Recent sales */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Ventas recientes</div>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : filteredSales.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay ventas registradas desde formularios.
            </div>
          ) : (
            <div className="rounded-md border divide-y max-h-[280px] overflow-y-auto">
              {filteredSales.slice(0, 20).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.customer_name || 'Cliente'}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatDate(s.sale_date)}</span>
                      {s.product && <span className="truncate">· {s.product}</span>}
                    </div>
                  </div>
                  <div className="font-semibold text-sm tabular-nums">
                    {formatMoney(Number(s.amount), s.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
