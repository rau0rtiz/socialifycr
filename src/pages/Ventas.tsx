import { useState, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
import { AdSalesRanking } from '@/components/dashboard/AdSalesRanking';
import { SetterTracker } from '@/components/ventas/SetterTracker';
import { SalesGoalBar } from '@/components/ventas/SalesGoalBar';
import { SalesByProductChart } from '@/components/ventas/SalesByProductChart';
import { ClosureRateWidget } from '@/components/ventas/ClosureRateWidget';
import { PipelineSummaryWidget } from '@/components/ventas/PipelineSummaryWidget';
import { SetterDailyCalendar } from '@/components/ventas/SetterDailyCalendar';
import { CampaignsDrilldown } from '@/components/dashboard/CampaignsDrilldown';
import { CollectionsWidget } from '@/components/ventas/CollectionsWidget';


import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useCampaigns, DatePresetKey, DateRange } from '@/hooks/use-ads-data';
import { useClientFeatures } from '@/hooks/use-client-features';
import { useSetterAppointments, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { useSetterDailyReports } from '@/hooks/use-setter-daily-reports';
import { useClientProducts } from '@/hooks/use-client-products';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CalendarIcon } from 'lucide-react';
import { SalePrefill } from '@/components/dashboard/RegisterSaleDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Global pipeline period ──────────────────────────────────────────────
export type GlobalPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_90d' | 'custom';

const GLOBAL_PERIOD_LABELS: Record<GlobalPeriod, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  last_90d: 'Últimos 90 días',
  custom: 'Personalizado',
};

/** Costa Rica is always UTC-6 (no DST) */
const getCRNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));

export const getGlobalDateRange = (period: GlobalPeriod, customFrom?: Date, customTo?: Date) => {
  const crNow = getCRNow();
  switch (period) {
    case 'today':
      return { start: startOfDay(crNow), end: endOfDay(crNow) };
    case 'yesterday': {
      const y = subDays(crNow, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case 'this_week':
      return { start: startOfWeek(crNow, { weekStartsOn: 1 }), end: endOfDay(crNow) };
    case 'this_month':
      return { start: startOfMonth(crNow), end: endOfDay(crNow) };
    case 'last_90d':
      return { start: subDays(crNow, 90), end: endOfDay(crNow) };
    case 'custom':
      return { start: customFrom || subDays(crNow, 30), end: customTo || crNow };
  }
};

/** Map global period → DatePresetKey for Meta API hooks */
const toMetaPreset = (period: GlobalPeriod, customFrom?: Date, customTo?: Date): { datePreset: DatePresetKey; customRange?: DateRange } => {
  switch (period) {
    case 'this_month': return { datePreset: 'this_month' };
    case 'last_90d': return { datePreset: 'last_90d' };
    default: {
      const range = getGlobalDateRange(period, customFrom, customTo);
      return { datePreset: 'custom', customRange: { from: range.start, to: range.end } };
    }
  }
};

// ── Component ───────────────────────────────────────────────────────────
const Ventas = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const { isClient, clientAccess, loading: roleLoading } = useUserRole();
  
  const clientId = selectedClient?.id || null;
  const { data: metaConnection } = useMetaConnection(clientId);
  const hasAdAccount = !!metaConnection?.ad_account_id;
  const { flags } = useClientFeatures(clientId);

  const isMindCoach = selectedClient?.name?.toLowerCase().includes('mind coach');

  // Global time range state
  const [globalPeriod, setGlobalPeriod] = useState<GlobalPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const globalRange = useMemo(() => getGlobalDateRange(globalPeriod, customFrom, customTo), [globalPeriod, customFrom, customTo]);
  const metaMapping = useMemo(() => toMetaPreset(globalPeriod, customFrom, customTo), [globalPeriod, customFrom, customTo]);

  // Setter appointments — pass start date ISO string
  const periodStartIso = globalRange.start.toISOString().split('T')[0];

  const { data: campaignsResult } = useCampaigns(
    clientId, hasAdAccount,
    metaMapping.datePreset, metaMapping.customRange
  );
  const campaigns = campaignsResult?.campaigns || [];
  const adCurrency = campaignsResult?.currency || 'USD';
  const totalAdSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  // Get all-time sales for the goal bar (current year)
  const { sales: allSales, summary } = useSalesTracking(clientId);
  const { products: clientProducts } = useClientProducts(clientId);

  // Daily reports for Mind Coach
  const { reports: dailyReports } = useSetterDailyReports(clientId);

  // Prefill state for converting setter lead → sale
  const [salePrefill, setSalePrefill] = useState<SalePrefill | null>(null);
  const [showSaleFromSetter, setShowSaleFromSetter] = useState(false);
  const salesRef = useRef<HTMLDivElement>(null);

  const { appointments, updateAppointment } = useSetterAppointments(clientId, undefined, periodStartIso);

  const handleConvertToSale = (appointment: SetterAppointment) => {
    const prefill: SalePrefill = {
      customer_name: appointment.lead_name,
      product: (appointment as any).product || undefined,
      appointmentId: appointment.id,
      closer_name: appointment.setter_name || undefined,
      message_platform: appointment.source === 'ads' ? 'whatsapp' : undefined,
    };
    if (appointment.ad_id) {
      prefill.source = 'ad';
      prefill.ad_id = appointment.ad_id;
      prefill.ad_name = appointment.ad_name || undefined;
      prefill.ad_campaign_id = appointment.ad_campaign_id || undefined;
      prefill.ad_campaign_name = appointment.ad_campaign_name || undefined;
    }
    setSalePrefill(prefill);
    setShowSaleFromSetter(true);
    setTimeout(() => {
      salesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaleRegistered = async (appointmentId?: string) => {
    if (appointmentId) {
      try {
        await updateAppointment.mutateAsync({ id: appointmentId, status: 'sold' } as any);
      } catch {
        // silent
      }
    }
    setSalePrefill(null);
    setShowSaleFromSetter(false);
  };

  const handlePeriodChange = (value: string) => {
    const p = value as GlobalPeriod;
    setGlobalPeriod(p);
    if (p !== 'custom') {
      setCustomFrom(undefined);
      setCustomTo(undefined);
    }
  };

  if (clientsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Selecciona un cliente</CardTitle>
              <CardDescription>
                Selecciona un cliente del menú superior para ver sus ventas.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getDateDisplayText = () => {
    if (globalPeriod === 'custom' && customFrom && customTo) {
      return `${format(customFrom, 'dd MMM', { locale: es })} - ${format(customTo, 'dd MMM', { locale: es })}`;
    }
    return GLOBAL_PERIOD_LABELS[globalPeriod];
  };

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-8 space-y-6">
        {/* Page header with global time range */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Ventas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seguimiento y análisis de ventas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={globalPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 text-xs sm:text-sm w-40 sm:w-48 rounded-lg">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue>{getDateDisplayText()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GLOBAL_PERIOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {globalPeriod === 'custom' && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-9 text-xs sm:text-sm gap-1.5',
                      !customFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customFrom && customTo
                      ? `${format(customFrom, 'dd/MM/yy')} – ${format(customTo, 'dd/MM/yy')}`
                      : 'Seleccionar fechas'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customFrom ? { from: customFrom, to: customTo } : undefined}
                    onSelect={(range) => {
                      setCustomFrom(range?.from);
                      setCustomTo(range?.to);
                      if (range?.from && range?.to) setCalendarOpen(false);
                    }}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* === MIND COACH: Pipeline Summary at top === */}
        {isMindCoach && (
          <PipelineSummaryWidget
            appointments={appointments}
            sales={allSales}
            dailyReports={dailyReports}
            campaigns={campaigns}
            adCurrency={adCurrency}
            dateRange={globalRange}
          />
        )}

        {/* Sales Goal Bar */}
        <SalesGoalBar
          clientId={selectedClient.id}
          currentSalesUSD={summary.totalUSD}
          currentSalesCRC={summary.totalCRC}
          primaryColor={selectedClient.primary_color || undefined}
          accentColor={selectedClient.accent_color || undefined}
        />

        {/* === MIND COACH: Setter Daily Calendar + Products side by side === */}
        {isMindCoach && (
          <SetterDailyCalendar clientId={selectedClient.id} />
        )}

        {/* Ad ranking - at top for most clients, hidden for Mind Coach here (shown at bottom) */}
        {!isMindCoach && (
          <AdSalesRanking
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
            datePreset={metaMapping.datePreset}
          />
        )}

        {/* Setter pipeline (lead → sale flow) */}
        {flags.setter_tracker && (
          <SetterTracker
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
            onConvertToSale={handleConvertToSale}
            periodStartIso={periodStartIso}
          />
        )}

        {/* Sales tracking */}
        <div ref={salesRef}>
          <SalesTrackingSection
            clientId={selectedClient.id}
            campaigns={campaigns}
            adSpend={totalAdSpend}
            adCurrency={adCurrency}
            hasAdAccount={hasAdAccount}
            salePrefill={salePrefill}
            showSaleDialog={showSaleFromSetter}
            onSaleFromSetter={handleSaleRegistered}
          />
        </div>

        {/* Collections (pending installments) */}
        <CollectionsWidget clientId={selectedClient.id} />


        {isMindCoach && hasAdAccount && (
          <CampaignsDrilldown
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
            datePreset={metaMapping.datePreset}
            customRange={metaMapping.customRange}
          />
        )}

        {/* Bottom section: charts side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by product pie chart */}
          <SalesByProductChart sales={allSales} products={clientProducts} />

          {/* Closure rate per seller */}
          <ClosureRateWidget appointments={appointments} />
        </div>

        {/* Ad ranking at bottom for Mind Coach */}
        {isMindCoach && (
          <AdSalesRanking
            clientId={selectedClient.id}
            hasAdAccount={hasAdAccount}
            datePreset={metaMapping.datePreset}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Ventas;
