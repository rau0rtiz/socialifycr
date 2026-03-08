import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // Previous month for comparison
  const prevStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');

  const { data: prevSales = [] } = useQuery({
    queryKey: ['monthly-sales-report-prev', clientId, prevStart, prevEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, amount, currency, source')
        .eq('client_id', clientId)
        .gte('sale_date', prevStart)
        .lte('sale_date', prevEnd);
      if (error) throw error;
      return (data || []) as Pick<SaleRow, 'id' | 'amount' | 'currency' | 'source'>[];
    },
  });

  const completed = sales.filter(s => s.status === 'completed');
  const totalCRC = completed.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalUSD = completed.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const prevCompleted = prevSales.filter((s: any) => !s.status || s.status === 'completed');
  const prevCRC = prevCompleted.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const prevUSD = prevCompleted.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

  // By source
  const bySource: Record<string, { count: number; crc: number; usd: number }> = {};
  for (const s of completed) {
    if (!bySource[s.source]) bySource[s.source] = { count: 0, crc: 0, usd: 0 };
    bySource[s.source].count++;
    if (s.currency === 'CRC') bySource[s.source].crc += Number(s.amount);
    else bySource[s.source].usd += Number(s.amount);
  }

  const sourceLabels: Record<string, string> = {
    story: 'Historia',
    ad: 'Publicidad',
    referral: 'Referencia',
    organic: 'Orgánico',
    other: 'Otro',
  };

  const canGoForward = !isFuture(addMonths(currentMonth, 1));
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const crcChange = pctChange(totalCRC, prevCRC);
  const usdChange = pctChange(totalUSD, prevUSD);
  const countChange = pctChange(completed.length, prevCompleted.length);

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))} disabled={!canGoForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ventas</p>
                    <p className="text-3xl font-bold text-foreground">{completed.length}</p>
                  </div>
                  <ChangeIndicator value={countChange} />
                </div>
              </CardContent>
            </Card>

            {(totalCRC > 0 || prevCRC > 0) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total CRC</p>
                      <p className="text-2xl font-bold text-foreground">₡{totalCRC.toLocaleString('es-CR')}</p>
                    </div>
                    <ChangeIndicator value={crcChange} />
                  </div>
                </CardContent>
              </Card>
            )}

            {(totalUSD > 0 || prevUSD > 0) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total USD</p>
                      <p className="text-2xl font-bold text-foreground">${totalUSD.toLocaleString('en-US')}</p>
                    </div>
                    <ChangeIndicator value={usdChange} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* By source */}
          {Object.keys(bySource).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Desglose por Fuente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(bySource)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([source, data]) => {
                      const pct = Math.round((data.count / completed.length) * 100);
                      return (
                        <div key={source} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-foreground">
                            {sourceLabels[source] || source}
                          </div>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground w-20 text-right">
                            {data.count} ({pct}%)
                          </div>
                          <div className="text-sm text-foreground w-32 text-right">
                            {data.crc > 0 && `₡${data.crc.toLocaleString('es-CR')}`}
                            {data.crc > 0 && data.usd > 0 && ' / '}
                            {data.usd > 0 && `$${data.usd.toLocaleString('en-US')}`}
                          </div>
                        </div>
                      );
                    })}
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

const ChangeIndicator = ({ value }: { value: number }) => {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
      <Icon className="h-4 w-4" />
      {isPositive ? '+' : ''}{value}%
    </div>
  );
};
