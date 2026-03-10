import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Package } from 'lucide-react';
import { MessageSale } from '@/hooks/use-sales-tracking';

interface SalesByProductChartProps {
  sales: MessageSale[];
}

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 70%, 50%)',
  'hsl(40, 90%, 50%)',
  'hsl(0, 70%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(320, 70%, 50%)',
  'hsl(60, 80%, 45%)',
];

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export const SalesByProductChart = ({ sales }: SalesByProductChartProps) => {
  const data = useMemo(() => {
    const completed = sales.filter(s => s.status === 'completed');
    const byProduct: Record<string, { amount: number; count: number; currency: string }> = {};

    completed.forEach(s => {
      const key = s.product || 'Sin producto';
      if (!byProduct[key]) byProduct[key] = { amount: 0, count: 0, currency: s.currency };
      byProduct[key].amount += Number(s.amount);
      byProduct[key].count += 1;
    });

    return Object.entries(byProduct)
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-5 w-5" />
          Ventas por Producto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <ChartContainer config={chartConfig} className="h-[200px] w-[200px] flex-shrink-0">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
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
            </PieChart>
          </ChartContainer>

          <div className="flex-1 space-y-1.5 w-full">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="truncate max-w-[150px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(item.value, item.currency)}</span>
                  <span className="text-muted-foreground ml-1 text-xs">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
