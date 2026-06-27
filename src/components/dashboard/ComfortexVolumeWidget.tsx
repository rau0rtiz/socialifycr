import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { useInstantFormSales, parseFormSaleNotes } from '@/hooks/use-instant-form-leads';
import { VOLUME_BUCKETS } from '@/lib/comfortex-leads';

const RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

const inRange = (dateStr: string | null | undefined, rangeDays: string): boolean => {
  if (rangeDays === 'all') return true;
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return false;
  if (rangeDays === 'month') {
    const now = new Date();
    return ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  const days = parseInt(rangeDays, 10);
  if (!days) return true;
  return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
};

interface Props { clientId: string }

export const ComfortexVolumeWidget = ({ clientId }: Props) => {
  const { data: sales = [] } = useInstantFormSales(clientId);
  const [rangeDays, setRangeDays] = useState('month');

  const stats = useMemo(() => {
    const items = sales
      .filter((s) => inRange(s.sale_date || s.created_at, rangeDays))
      .map((s) => ({ sale: s, qty: parseFormSaleNotes(s.notes).quantity || 0 }))
      .filter((x) => x.qty > 0);

    const total = items.reduce((s, x) => s + x.qty, 0);
    const avg = items.length ? total / items.length : 0;

    const buckets = VOLUME_BUCKETS.map((b) => ({
      label: b.label,
      count: items.filter((x) => x.qty >= b.min && x.qty <= b.max).length,
      volume: items.filter((x) => x.qty >= b.min && x.qty <= b.max).reduce((s, x) => s + x.qty, 0),
    }));
    const maxBucket = Math.max(1, ...buckets.map((b) => b.volume));

    return { items, total, avg, buckets, maxBucket, count: items.length };
  }, [sales, rangeDays]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Volumen de camisas vendidas
          <Badge variant="secondary">{stats.count} ventas</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.count === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin ventas en este rango.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 bg-success/5 border-success/30">
                <p className="text-xs text-muted-foreground">Volumen total vendido</p>
                <p className="text-2xl font-semibold tabular-nums">{stats.total.toLocaleString('es-CR')}</p>
                <p className="text-xs text-muted-foreground">camisas</p>
              </div>
              <div className="rounded-lg border p-3 bg-info/5 border-info/30">
                <p className="text-xs text-muted-foreground">Promedio por venta</p>
                <p className="text-2xl font-semibold tabular-nums">{Math.round(stats.avg).toLocaleString('es-CR')}</p>
                <p className="text-xs text-muted-foreground">camisas/venta</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2 font-medium">Distribución por volumen</p>
              <div className="space-y-1.5">
                {stats.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-xs w-16 tabular-nums">{b.label}</span>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/80"
                        style={{ width: `${(b.volume / stats.maxBucket) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-20 text-right text-muted-foreground">
                      {b.volume.toLocaleString('es-CR')} <span className="opacity-60">({b.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
