import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, DollarSign, Hash, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isFuture, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MonthlySalesReportProps {
  clientId: string;
}

interface SaleRow {
  id: string;
  amount: number;
  currency: string;
  source: string;
  sale_date: string;
  customer_name: string | null;
  product: string | null;
  status: string;
}

const SOURCE_COLORS: Record<string, string> = {
  story: 'hsl(var(--chart-1))',
  ad: 'hsl(var(--chart-2))',
  referral: 'hsl(var(--chart-3))',
  organic: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

const SOURCE_LABELS: Record<string, string> = {
  story: 'Historia',
  ad: 'Publicidad',
  referral: 'Referencia',
  organic: 'Orgánico',
  other: 'Otro',
};

export const MonthlySalesReport = ({ clientId }: MonthlySalesReportProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['monthly-sales-report', clientId, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, amount, currency, source, sale_date, customer_name, product, status')
        .eq('client_id', clientId)
        .gte('sale_date', start)
        .lte('sale_date', end)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SaleRow[];
    },
  });

  const prevStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');

  const { data: prevSales = [] } = useQuery({
    queryKey: ['monthly-sales-report-prev', clientId, prevStart, prevEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, amount, currency, source, status')
        .eq('client_id', clientId)
        .gte('sale_date', prevStart)
        .lte('sale_date', prevEnd);
      if (error) throw error;
      return (data || []) as (Pick<SaleRow, 'id' | 'amount' | 'currency' | 'source'> & { status?: string })[];
    },
  });

  const completed = sales.filter(s => s.status === 'completed');
  const totalCRC = completed.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalUSD = completed.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const prevCompleted = prevSales.filter(s => !s.status || s.status === 'completed');
  const prevCRC = prevCompleted.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const prevUSD = prevCompleted.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const crcChange = pctChange(totalCRC, prevCRC);
  const usdChange = pctChange(totalUSD, prevUSD);
  const countChange = pctChange(completed.length, prevCompleted.length);

  // Pie chart data
  const bySource: Record<string, number> = {};
  for (const s of completed) {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
  }
  const pieData = Object.entries(bySource).map(([source, count]) => ({
    name: SOURCE_LABELS[source] || source,
    value: count,
    color: SOURCE_COLORS[source] || 'hsl(var(--muted-foreground))',
  }));

  // Daily bar chart data
  const byDay: Record<string, number> = {};
  for (const s of completed) {
    const day = format(parseISO(s.sale_date), 'd');
    byDay[day] = (byDay[day] || 0) + 1;
  }
  const barData = Object.entries(byDay)
    .map(([day, count]) => ({ day: `${day}`, ventas: count }))
    .sort((a, b) => Number(a.day) - Number(b.day));

  const canGoForward = !isFuture(addMonths(currentMonth, 1));
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))} disabled={!canGoForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              icon={Hash}
              label="Total Ventas"
              value={String(completed.length)}
              change={countChange}
              gradient="from-primary/10 to-primary/5"
              iconBg="bg-primary/15 text-primary"
            />
            {(totalCRC > 0 || prevCRC > 0) && (
              <KPICard
                icon={DollarSign}
                label="Total CRC"
                value={`₡${totalCRC.toLocaleString('es-CR')}`}
                change={crcChange}
                gradient="from-chart-1/10 to-chart-1/5"
                iconBg="bg-chart-1/15 text-chart-1"
              />
            )}
            {(totalUSD > 0 || prevUSD > 0) && (
              <KPICard
                icon={DollarSign}
                label="Total USD"
                value={`$${totalUSD.toLocaleString('en-US')}`}
                change={usdChange}
                gradient="from-chart-2/10 to-chart-2/5"
                iconBg="bg-chart-2/15 text-chart-2"
              />
            )}
          </div>

          {/* Charts Row */}
          {completed.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart - Source Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ventas por Fuente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} ventas`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                          <span className="ml-auto font-semibold text-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Daily Sales */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ventas por Día</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip formatter={(value: number) => [`${value} ventas`, 'Ventas']} />
                      <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Sales Table */}
          {completed.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Ventas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completed.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.customer_name || 'Cliente anónimo'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sale.product || 'Sin producto'} · {format(parseISO(sale.sale_date), 'd MMM', { locale: es })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {SOURCE_LABELS[sale.source] || sale.source}
                      </Badge>
                      <p className="text-sm font-bold text-foreground shrink-0">
                        {sale.currency === 'CRC' ? '₡' : '$'}{Number(sale.amount).toLocaleString(sale.currency === 'CRC' ? 'es-CR' : 'en-US')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {completed.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se registraron ventas en {monthLabel}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, change, gradient, iconBg }: {
  icon: typeof Hash;
  label: string;
  value: string;
  change: number;
  gradient: string;
  iconBg: string;
}) => (
  <Card className={`overflow-hidden bg-gradient-to-br ${gradient} border-0 shadow-sm`}>
    <CardContent className="pt-6 pb-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change !== 0 && (
        <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${change > 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
          {change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {change > 0 ? '+' : ''}{change}% vs mes anterior
        </div>
      )}
    </CardContent>
  </Card>
);
