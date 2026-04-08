import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Building2 } from 'lucide-react';
import { MessageSale } from '@/hooks/use-sales-tracking';

interface SalesByBrandChartProps {
  sales: MessageSale[];
}

const COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(40, 90%, 50%)',
  'hsl(0, 65%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(320, 65%, 55%)',
  'hsl(60, 80%, 45%)',
];

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export const SalesByBrandChart = ({ sales }: SalesByBrandChartProps) => {
  const data = useMemo(() => {
    const completed = sales.filter(s => s.status === 'completed');
    const byBrand: Record<string, { amount: number; count: number; currency: string }> = {};

    completed.forEach(s => {
      const key = s.brand || 'Sin marca';
      if (!byBrand[key]) byBrand[key] = { amount: 0, count: 0, currency: s.currency };
      byBrand[key].amount += Number(s.amount);
      byBrand[key].count += 1;
    });

    return Object.entries(byBrand)
      .map(([name, val], i) => ({
        name,
        value: val.amount,
        count: val.count,
        currency: val.currency,
        fill: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  if (data.length === 0) return null;

  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
          Ventas por Marca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return v.toString();
                }}
                className="text-muted-foreground"
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const item = data.find(d => d.name === name);
                      return `${formatCurrency(Number(value), item?.currency || 'USD')} (${item?.count || 0} ventas)`;
                    }}
                  />
                }
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="space-y-1.5">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="truncate max-w-[160px] text-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground">{formatCurrency(item.value, item.currency)}</span>
                  <span className="text-muted-foreground ml-1.5 text-xs">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
