import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';
import { isInRange } from '@/lib/comfortex-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const dayKey = (iso: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const tz = new Date(d.getTime() - 6 * 60 * 60 * 1000);
    return tz.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

export const InstantFormDailyBarWidget = ({ clientId }: Props) => {
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('30');

  const chartData = useMemo(() => {
    const filtered = leads.filter((l) => isInRange(l.created_time || l.created_at, rangeDays));
    const counts = new Map<string, number>();
    filtered.forEach((l) => {
      const k = dayKey(l.created_time || l.created_at);
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }),
        leads: count,
      }));
  }, [leads, rangeDays]);

  const total = chartData.reduce((s, x) => s + x.leads, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-[hsl(var(--chart-2,142_71%_45%))]" />
          Leads por día
          <Badge variant="secondary">{total}</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : chartData.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Sin datos en este rango.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="leadsBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2,142 71% 45%))" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2,142 71% 45%))" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="leads" fill="url(#leadsBarFill)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
