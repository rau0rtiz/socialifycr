import { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  LineChart,
} from 'recharts';
import { Pencil, TrendingDown } from 'lucide-react';
import type { LaunchReport } from '@/hooks/use-launch-reports';
import { computeCostPerSignup, computeCostPerConversation } from '@/lib/format-launch-report';

interface Props {
  reports: LaunchReport[];
  currency: string;
  onEditDate: (d: Date) => void;
}

type Range = '7' | '14' | '30' | 'all';

export const LaunchReportCharts = ({ reports, currency, onEditDate }: Props) => {
  const [range, setRange] = useState<Range>('14');

  const filtered = useMemo(() => {
    if (range === 'all') return reports;
    const cutoff = subDays(new Date(), parseInt(range));
    return reports.filter((r) => parseISO(r.report_date) >= cutoff);
  }, [reports, range]);

  const chartData = useMemo(
    () =>
      filtered.map((r) => {
        const cps = computeCostPerSignup(Number(r.spend_snapshot) || 0, r.group_signups || 0);
        const cpc = computeCostPerConversation(Number(r.spend_snapshot) || 0, r.conversations_snapshot || 0);
        return {
          date: r.report_date,
          label: format(parseISO(r.report_date), 'd MMM', { locale: es }),
          spend: Number(r.spend_snapshot) || 0,
          conversations: r.conversations_snapshot || 0,
          signups: r.group_signups || 0,
          ctr: Number(r.manychat_ctr) || 0,
          cps,
          cpc,
        };
      }),
    [filtered],
  );

  const symbol = currency === 'CRC' ? '₡' : '$';

  // Totals
  const totals = useMemo(() => {
    const spend = filtered.reduce((s, r) => s + (Number(r.spend_snapshot) || 0), 0);
    const signups = filtered.reduce((s, r) => s + (r.group_signups || 0), 0);
    const conv = filtered.reduce((s, r) => s + (r.conversations_snapshot || 0), 0);
    const avgCps = signups > 0 ? spend / signups : 0;
    let best: { date: string; cps: number } | null = null;
    filtered.forEach((r) => {
      const cps = computeCostPerSignup(Number(r.spend_snapshot) || 0, r.group_signups || 0);
      if (cps > 0 && (!best || cps < best.cps)) best = { date: r.report_date, cps };
    });
    return { spend, signups, conv, avgCps, best };
  }, [filtered]);

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
        Aún no has guardado reportes. Guarda el primero para empezar a visualizar el progreso del lanzamiento.
      </div>
    );
  }

  const fmt = (n: number, dec = 0) => `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

  return (
    <div className="space-y-4 pt-2 border-t border-border/50">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Histórico del Lanzamiento</h3>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="h-8">
            <TabsTrigger value="7" className="text-xs h-6 px-2">7d</TabsTrigger>
            <TabsTrigger value="14" className="text-xs h-6 px-2">14d</TabsTrigger>
            <TabsTrigger value="30" className="text-xs h-6 px-2">30d</TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-6 px-2">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground">Inversión total</div>
          <div className="text-lg font-bold">{fmt(totals.spend, 2)}</div>
        </Card>
        <Card className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground">Ingresos totales</div>
          <div className="text-lg font-bold">{totals.signups}</div>
        </Card>
        <Card className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground">Costo/ingreso prom.</div>
          <div className="text-lg font-bold">{fmt(totals.avgCps, 2)}</div>
        </Card>
        <Card className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Mejor día
          </div>
          <div className="text-lg font-bold">
            {totals.best ? fmt(totals.best.cps, 2) : '—'}
          </div>
          {totals.best && (
            <div className="text-[10px] text-muted-foreground">
              {format(parseISO(totals.best.date), "d MMM", { locale: es })}
            </div>
          )}
        </Card>
      </div>

      {/* Chart: signups + cost per signup */}
      <Card className="p-3">
        <div className="text-xs text-muted-foreground mb-2">Ingresos al grupo y costo por ingreso</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${symbol}${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(value: any, name: string) => {
                  if (name === 'Costo/ingreso') return [fmt(Number(value), 2), name];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="signups" name="Ingresos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cps" name="Costo/ingreso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Chart: spend area */}
      <Card className="p-3">
        <div className="text-xs text-muted-foreground mb-2">Inversión diaria</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${symbol}${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(value: any) => [fmt(Number(value), 2), 'Inversión']}
              />
              <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Chart: CTR + cost per conversation */}
      <Card className="p-3">
        <div className="text-xs text-muted-foreground mb-2">CTR Manychat y costo por conversación</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${symbol}${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="ctr" name="CTR Manychat (%)" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="cpc" name="Costo/conversación" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Inversión</th>
                <th className="px-3 py-2 text-right">Conv.</th>
                <th className="px-3 py-2 text-right">Costo/conv.</th>
                <th className="px-3 py-2 text-right">Ingresos</th>
                <th className="px-3 py-2 text-right">Costo/ingreso</th>
                <th className="px-3 py-2 text-right">CTR MC</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map((r) => {
                const cps = computeCostPerSignup(Number(r.spend_snapshot) || 0, r.group_signups || 0);
                const cpc = computeCostPerConversation(Number(r.spend_snapshot) || 0, r.conversations_snapshot || 0);
                return (
                  <tr key={r.id} className="border-t border-border/50">
                    <td className="px-3 py-2">{format(parseISO(r.report_date), "EEE d MMM", { locale: es })}</td>
                    <td className="px-3 py-2 text-right">{fmt(Number(r.spend_snapshot) || 0, 2)}</td>
                    <td className="px-3 py-2 text-right">{r.conversations_snapshot}</td>
                    <td className="px-3 py-2 text-right">{fmt(cpc, 2)}</td>
                    <td className="px-3 py-2 text-right">{r.group_signups}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(cps, 2)}</td>
                    <td className="px-3 py-2 text-right">{Number(r.manychat_ctr).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEditDate(parseISO(r.report_date))}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default LaunchReportCharts;
