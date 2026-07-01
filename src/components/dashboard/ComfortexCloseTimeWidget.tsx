import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Timer, Zap, Hourglass } from 'lucide-react';
import { isInRange } from '@/lib/comfortex-leads';
import { useInstantFormLeads, useInstantFormSales } from '@/hooks/use-instant-form-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'all', label: 'Todo' },
  { value: 'today', label: 'Hoy' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const BUCKETS = [
  { label: '<24h', max: 24 },
  { label: '1–3d', max: 24 * 3 },
  { label: '4–7d', max: 24 * 7 },
  { label: '8–14d', max: 24 * 14 },
  { label: '15d+', max: Infinity },
];

const formatDuration = (hours: number): string => {
  if (!isFinite(hours) || hours < 0) return '—';
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return `${m} min`;
  }
  if (hours < 48) return `${hours.toFixed(1)} h`;
  const days = hours / 24;
  return `${days.toFixed(1)} d`;
};

export const ComfortexCloseTimeWidget = ({ clientId }: Props) => {
  const { data: leads = [], isLoading: leadsLoading } = useInstantFormLeads(clientId);
  const { data: sales = [], isLoading: salesLoading } = useInstantFormSales(clientId);
  const [rangeDays, setRangeDays] = useState('all');

  const leadById = useMemo(() => {
    const map = new Map<string, string | null>();
    leads.forEach((l) => map.set(l.id, l.created_time || l.created_at));
    return map;
  }, [leads]);

  const durationsHours = useMemo(() => {
    const arr: number[] = [];
    sales.forEach((s) => {
      if (!s.lead_id) return;
      if (!isInRange(s.sale_date, rangeDays)) return;
      const leadTs = leadById.get(s.lead_id);
      if (!leadTs) return;
      const start = new Date(leadTs).getTime();
      const end = new Date(s.created_at).getTime();
      if (!isFinite(start) || !isFinite(end) || end < start) return;
      arr.push((end - start) / (1000 * 60 * 60));
    });
    return arr.sort((a, b) => a - b);
  }, [sales, leadById, rangeDays]);

  const stats = useMemo(() => {
    const n = durationsHours.length;
    if (n === 0) return null;
    const sum = durationsHours.reduce((a, b) => a + b, 0);
    const avg = sum / n;
    const median = n % 2 === 1
      ? durationsHours[(n - 1) / 2]
      : (durationsHours[n / 2 - 1] + durationsHours[n / 2]) / 2;
    const fastest = durationsHours[0];
    const slowest = durationsHours[n - 1];
    const buckets = BUCKETS.map((b) => ({ label: b.label, count: 0 }));
    durationsHours.forEach((h) => {
      const idx = BUCKETS.findIndex((b) => h < b.max);
      const finalIdx = idx === -1 ? BUCKETS.length - 1 : idx;
      buckets[finalIdx].count += 1;
    });
    const maxBucket = Math.max(...buckets.map((b) => b.count), 1);
    return { n, avg, median, fastest, slowest, buckets, maxBucket };
  }, [durationsHours]);

  const isLoading = leadsLoading || salesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Tiempo de cierre
            {stats && <Badge variant="secondary">{stats.n}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Desde formulario hasta venta</p>
        </div>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : !stats ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay ventas vinculadas a leads en este periodo.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 p-3">
                <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] font-medium">
                  <Timer className="h-3.5 w-3.5" /> Promedio
                </div>
                <div className="text-2xl font-bold mt-1 text-[hsl(var(--primary))] tabular-nums">
                  {formatDuration(stats.avg)}
                </div>
              </div>
              <div className="rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 p-3">
                <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--info))] font-medium">
                  <Hourglass className="h-3.5 w-3.5" /> Mediana
                </div>
                <div className="text-2xl font-bold mt-1 text-[hsl(var(--info))] tabular-nums">
                  {formatDuration(stats.median)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border p-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3" /> Más rápido
                </span>
                <span className="font-semibold tabular-nums">{formatDuration(stats.fastest)}</span>
              </div>
              <div className="rounded-md border p-2 flex items-center justify-between">
                <span className="text-muted-foreground">Más lento</span>
                <span className="font-semibold tabular-nums">{formatDuration(stats.slowest)}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Distribución</div>
              <div className="space-y-1.5">
                {stats.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-xs">
                    <div className="w-12 text-muted-foreground">{b.label}</div>
                    <div className="flex-1 h-4 bg-muted/40 rounded overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))]/70 rounded"
                        style={{ width: `${(b.count / stats.maxBucket) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-right font-medium tabular-nums">{b.count}</div>
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
