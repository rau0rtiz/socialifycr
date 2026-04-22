import { useMemo } from 'react';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface SalesBySizeChartProps {
  clientId: string;
  dateRange?: { start: Date; end: Date };
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única', 'Sin talla'];

// Themed palette using HSL design tokens
const SIZE_COLORS: Record<string, string> = {
  XS: 'hsl(280 70% 60%)',
  S: 'hsl(220 70% 55%)',
  M: 'hsl(160 70% 45%)',
  L: 'hsl(45 90% 55%)',
  XL: 'hsl(20 85% 55%)',
  XXL: 'hsl(0 75% 55%)',
  'Única': 'hsl(200 60% 50%)',
  'Sin talla': 'hsl(0 0% 60%)',
};

export const SalesBySizeChart = ({ clientId, dateRange }: SalesBySizeChartProps) => {
  const { sales } = useSalesTracking(clientId, dateRange);

  const data = useMemo(() => {
    const map = new Map<string, { size: string; count: number; revenue: number }>();
    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      if (s.currency !== 'CRC') continue; // Alma Bendita uses CRC
      const size = (s as any).garment_size || 'Sin talla';
      const existing = map.get(size) || { size, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(s.amount) || 0;
      map.set(size, existing);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
    return arr;
  }, [sales]);

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shirt className="h-4 w-4" />
          Ventas por Talla
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-sm text-muted-foreground gap-2">
            <Shirt className="h-8 w-8 opacity-30" />
            <p>Aún no hay ventas con talla registrada</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total prendas</p>
                <p className="text-xl font-bold">{totalCount}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ingresos</p>
                <p className="text-xl font-bold">₡{Math.round(totalRevenue).toLocaleString()}</p>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="size"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, _name, props) => {
                      const item = props?.payload as { revenue?: number } | undefined;
                      return [
                        `${value} prendas · ₡${Math.round(item?.revenue || 0).toLocaleString()}`,
                        'Ventas',
                      ];
                    }}
                    labelFormatter={(l) => `Talla ${l}`}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.map((d) => (
                      <Cell key={d.size} fill={SIZE_COLORS[d.size] || 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.map((d) => (
                <div key={d.size} className="flex items-center gap-2 rounded-md border bg-card/50 px-2 py-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ background: SIZE_COLORS[d.size] || 'hsl(var(--primary))' }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold truncate">{d.size}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.count} · ₡{Math.round(d.revenue).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
