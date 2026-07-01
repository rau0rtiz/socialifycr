import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { useInstantFormLeads, useInstantFormSales, parseFormSaleNotes } from '@/hooks/use-instant-form-leads';
import {
  filterByRange,
  isInRange as inRange,
  parseQuantity,
  getModelFromLead,
  titleCase,
  VOLUME_BUCKETS,
} from '@/lib/comfortex-leads';

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

interface Props { clientId: string }

export const ComfortexVolumeWidget = ({ clientId }: Props) => {
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const { data: sales = [] } = useInstantFormSales(clientId);
  const [rangeDays, setRangeDays] = useState('month');

  const filtered = useMemo(() => filterByRange(leads, rangeDays), [leads, rangeDays]);

  const stats = useMemo(() => {
    // Cotizado (desde leads — los rangos del Instant Form)
    const items = filtered
      .map((l) => ({
        lead: l,
        qty: parseQuantity(l.custom_answers?.cantidad_de_camisas),
      }))
      .filter((x) => x.qty !== null) as { lead: typeof filtered[number]; qty: number }[];

    const buckets = VOLUME_BUCKETS.map((b) => ({
      label: b.label,
      count: items.filter((x) => x.qty >= b.min && x.qty <= b.max).length,
    }));
    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
    const top = [...items].sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Ventas reales (desde sales registradas)
    const salesInRange = sales
      .filter((s) => inRange(s.sale_date || s.created_at, rangeDays))
      .map((s) => parseFormSaleNotes(s.notes).quantity || 0)
      .filter((q) => q > 0);
    const soldTotal = salesInRange.reduce((s, q) => s + q, 0);
    const soldAvg = salesInRange.length ? soldTotal / salesInRange.length : 0;

    return {
      items,
      buckets,
      maxBucket,
      top,
      withQty: items.length,
      soldTotal,
      soldAvg,
      salesCount: salesInRange.length,
    };
  }, [filtered, sales, rangeDays]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Volumen de camisas cotizadas
          <Badge variant="secondary">{stats.withQty} leads c/cantidad</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.withQty === 0 && stats.salesCount === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin datos en este rango.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 bg-success/5 border-success/30">
                <p className="text-xs text-muted-foreground">Volumen vendido (real)</p>
                <p className="text-2xl font-semibold tabular-nums">{stats.soldTotal.toLocaleString('es-CR')}</p>
                <p className="text-xs text-muted-foreground">
                  camisas · {stats.salesCount} venta{stats.salesCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-info/5 border-info/30">
                <p className="text-xs text-muted-foreground">Promedio por venta</p>
                <p className="text-2xl font-semibold tabular-nums">{Math.round(stats.soldAvg).toLocaleString('es-CR')}</p>
                <p className="text-xs text-muted-foreground">camisas/venta</p>
              </div>
            </div>

            {stats.withQty > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2 font-medium">
                  Distribución por rango cotizado (leads)
                </p>
                <div className="space-y-1.5">
                  {stats.buckets.map((b) => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-xs w-16 tabular-nums">{b.label}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/80"
                          style={{ width: `${(b.count / stats.maxBucket) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.top.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2 font-medium">Top 5 leads por volumen cotizado</p>
                <div className="space-y-1.5">
                  {stats.top.map((x) => {
                    const model = getModelFromLead(x.lead, 'all');
                    return (
                      <div key={x.lead.id} className="flex items-center justify-between text-sm border rounded px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{x.lead.full_name || '(sin nombre)'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {model ? titleCase(model) : '—'}
                            {x.lead.phone ? ` · ${x.lead.phone}` : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="tabular-nums">{x.qty.toLocaleString('es-CR')}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
