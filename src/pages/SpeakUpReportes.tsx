import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesGoalBar } from '@/components/ventas/SalesGoalBar';
import { SpeakUpSalesSummary } from '@/components/ventas/SpeakUpSalesSummary';
import { SpeakUpAnalytics } from '@/components/ventas/SpeakUpAnalytics';
import { RecentSalesTicker } from '@/components/ventas/RecentSalesTicker';
import { SalesByProductChart } from '@/components/ventas/SalesByProductChart';
import { CollectionsWidget } from '@/components/ventas/CollectionsWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBrand } from '@/contexts/BrandContext';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { useClientProducts } from '@/hooks/use-client-products';
import { getGlobalDateRange, type GlobalPeriod } from '@/pages/Ventas';

const PERIOD_LABELS: Record<GlobalPeriod, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  last_90d: 'Últimos 90 días',
  custom: 'Personalizado',
};

const SpeakUpReportes = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const isSpkUp = selectedClient?.name?.toLowerCase().includes('speak up');

  const [period, setPeriod] = useState<GlobalPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const range = useMemo(() => getGlobalDateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const clientId = selectedClient?.id || null;
  const { sales: chartSales } = useSalesTracking(clientId, { start: range.start, end: range.end });
  const { summary } = useSalesTracking(clientId);
  const { products: clientProducts } = useClientProducts(clientId);

  if (clientsLoading) return <DashboardLayout><div className="p-6">Cargando...</div></DashboardLayout>;
  if (!selectedClient) return <DashboardLayout><div className="p-6">Selecciona un cliente</div></DashboardLayout>;
  if (!isSpkUp) return <Navigate to="/ventas" replace />;

  const hasSalesChartData = chartSales.length > 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Reportes</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as GlobalPeriod)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABELS) as GlobalPeriod[]).map(k => (
                  <SelectItem key={k} value={k}>{PERIOD_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-9', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    {customFrom && customTo
                      ? `${format(customFrom, 'dd MMM', { locale: es })} - ${format(customTo, 'dd MMM', { locale: es })}`
                      : 'Rango'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: customFrom, to: customTo }}
                    onSelect={(r) => { setCustomFrom(r?.from); setCustomTo(r?.to); }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <SalesGoalBar
          clientId={selectedClient.id}
          currentSalesUSD={summary.totalUSD}
          currentSalesCRC={summary.totalCRC}
          primaryColor={selectedClient.primary_color || undefined}
          accentColor={selectedClient.accent_color || undefined}
        />

        <SpeakUpSalesSummary clientId={selectedClient.id} />

        <RecentSalesTicker clientId={selectedClient.id} dateRange={range} />

        <SpeakUpAnalytics clientId={selectedClient.id} />

        {hasSalesChartData ? (
          <SalesByProductChart sales={chartSales} products={clientProducts} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No hay ventas en el periodo seleccionado.
            </CardContent>
          </Card>
        )}

        <CollectionsWidget clientId={selectedClient.id} />
      </div>
    </DashboardLayout>
  );
};

export default SpeakUpReportes;
