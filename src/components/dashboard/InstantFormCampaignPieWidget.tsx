import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';

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

const COLORS = [
  'hsl(var(--chart-1, 217 91% 60%))',
  'hsl(var(--chart-2, 142 71% 45%))',
  'hsl(var(--chart-3, 38 92% 50%))',
  'hsl(var(--chart-4, 271 91% 65%))',
  'hsl(var(--chart-5, 0 84% 60%))',
  'hsl(var(--chart-6, 199 89% 48%))',
  'hsl(var(--chart-7, 24 95% 53%))',
  'hsl(var(--chart-8, 168 76% 42%))',
];

export const InstantFormCampaignPieWidget = ({ clientId }: Props) => {
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('month');
  const [breakdownBy, setBreakdownBy] = useState<'campaign_name' | 'adset_name' | 'ad_name'>('campaign_name');

  const filtered = useMemo(
    () => leads.filter((l) => isInRange(l.created_time || l.created_at, rangeDays)),
    [leads, rangeDays],
  );

  const data = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((l) => {
      const key = ((l as any)[breakdownBy] as string) || '(sin asignar)';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = filtered.length || 1;
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
    // Collapse tail into "Otros" if too many
    if (arr.length > 8) {
      const head = arr.slice(0, 7);
      const tail = arr.slice(7);
      const tailCount = tail.reduce((s, x) => s + x.count, 0);
      head.push({ name: `Otros (${tail.length})`, count: tailCount, pct: Math.round((tailCount / total) * 100) });
      return head;
    }
    return arr;
  }, [filtered, breakdownBy]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-5 w-5 text-[hsl(var(--chart-1,217_91%_60%))]" />
          Leads por campaña
          <Badge variant="secondary">{filtered.length}</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={breakdownBy} onValueChange={(v) => setBreakdownBy(v as any)}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign_name">Campaña</SelectItem>
              <SelectItem value="adset_name">Conjunto (adset)</SelectItem>
              <SelectItem value="ad_name">Anuncio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Sin datos en este rango.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 items-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                  formatter={(value: any, _name: any, props: any) => [`${value} leads · ${props.payload.pct}%`, props.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate" title={d.name}>{d.name}</span>
                  <span className="tabular-nums text-muted-foreground">{d.count} · {d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
