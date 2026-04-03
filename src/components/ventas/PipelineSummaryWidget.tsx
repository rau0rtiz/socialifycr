import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SetterAppointment } from '@/hooks/use-setter-appointments';
import { MessageSale } from '@/hooks/use-sales-tracking';
import { SetterDailyReport } from '@/hooks/use-setter-daily-reports';
import { CampaignInsights } from '@/hooks/use-ads-data';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  BarChart3, DollarSign, MessageCircle, CalendarDays,
  CheckCircle2, XCircle, TrendingUp, ShoppingCart, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isWithinInterval, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';

export type PipelinePeriod = 'last_7d' | 'last_30d' | 'this_month';

interface PipelineSummaryWidgetProps {
  appointments: SetterAppointment[];
  sales: MessageSale[];
  dailyReports: SetterDailyReport[];
  campaigns: CampaignInsights[];
  adCurrency: string;
  period: PipelinePeriod;
  onPeriodChange: (p: PipelinePeriod) => void;
}

const periodLabels: Record<PipelinePeriod, string> = {
  last_7d: 'Últimos 7 días',
  last_30d: 'Últimos 30 días',
  this_month: 'Este mes',
};

const getDateRange = (period: PipelinePeriod): { start: Date; end: Date } => {
  const now = new Date();
  switch (period) {
    case 'last_7d':
      return { start: subDays(now, 7), end: now };
    case 'last_30d':
      return { start: subDays(now, 30), end: now };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat(currency === 'CRC' ? 'es-CR' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const PipelineSummaryWidget = ({
  appointments,
  sales,
  dailyReports,
  campaigns,
  adCurrency,
  period,
  onPeriodChange,
}: PipelineSummaryWidgetProps) => {
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  
  const range = useMemo(() => getDateRange(period), [period]);

  // Filter appointments by date range
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return isWithinInterval(d, { start: range.start, end: range.end });
    });
  }, [appointments, range]);

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = parseISO(s.sale_date);
      return isWithinInterval(d, { start: range.start, end: range.end }) && s.status === 'completed';
    });
  }, [sales, range]);

  // Filter daily reports by date range
  const filteredReports = useMemo(() => {
    return dailyReports.filter(r => {
      const d = parseISO(r.report_date);
      return isWithinInterval(d, { start: range.start, end: range.end });
    });
  }, [dailyReports, range]);

  // Ad spend calculation (from selected campaigns or all)
  const adSpend = useMemo(() => {
    const targetCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(c => selectedCampaignIds.includes(c.id))
      : campaigns;
    return targetCampaigns.reduce((sum, c) => sum + c.spend, 0);
  }, [campaigns, selectedCampaignIds]);

  // Conversation totals from daily reports
  const totalConversations = filteredReports.reduce((s, r) => s + r.ig_conversations + r.wa_conversations, 0);
  const totalFollowups = filteredReports.reduce((s, r) => s + r.followups, 0);

  // Show rate calculation
  const completed = filteredAppointments.filter(a => 
    a.status === 'completed' || a.status === 'sold' || (a.status as string) === 'not_sold'
  ).length;
  const noShows = filteredAppointments.filter(a => a.status === 'no_show').length;
  const showRate = (completed + noShows) > 0 ? (completed / (completed + noShows)) * 100 : 0;
  const noShowRate = (completed + noShows) > 0 ? (noShows / (completed + noShows)) * 100 : 0;

  // Close rate
  const sold = filteredAppointments.filter(a => a.status === 'sold').length;
  const notSold = filteredAppointments.filter(a => (a.status as string) === 'not_sold').length;
  const closedCalls = sold + notSold;
  const closeRate = closedCalls > 0 ? (sold / closedCalls) * 100 : 0;

  // Total sales amount
  const totalSalesUSD = filteredSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSalesCRC = filteredSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen del Pipeline
          </CardTitle>
          <Select value={period} onValueChange={(v) => onPeriodChange(v as PipelinePeriod)}>
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Ad Spend with campaign selector */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="text-[10px] font-medium">Gasto ads</span>
              {campaigns.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-auto">
                      <Filter className="h-2.5 w-2.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <p className="text-xs font-medium mb-2">Filtrar campañas</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {campaigns.map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-muted">
                          <Checkbox
                            checked={selectedCampaignIds.includes(c.id)}
                            onCheckedChange={() => toggleCampaign(c.id)}
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedCampaignIds.length > 0 && (
                      <Button variant="ghost" size="sm" className="w-full mt-1 h-6 text-[10px]" onClick={() => setSelectedCampaignIds([])}>
                        Ver todas
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(adSpend, adCurrency)}</p>
            {selectedCampaignIds.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{selectedCampaignIds.length} campañas</p>
            )}
          </div>

          <KPICard icon={MessageCircle} label="Conversaciones" value={totalConversations} sub={`${totalFollowups} seguimientos`} />
          <KPICard icon={CalendarDays} label="Agendas" value={filteredAppointments.length} sub={`${filteredReports.reduce((s, r) => s + r.appointments_made, 0)} desde reportes`} />
          <KPICard icon={CheckCircle2} label="Show Rate" value={`${showRate.toFixed(0)}%`} sub={`${completed} asistieron`} />
          <KPICard icon={XCircle} label="No Show" value={`${noShowRate.toFixed(0)}%`} sub={`${noShows} no asistieron`} />
          <KPICard icon={ShoppingCart} label="Ventas" value={filteredSales.length.toString()} sub={totalSalesUSD > 0 ? `$${totalSalesUSD.toLocaleString()}` : totalSalesCRC > 0 ? `₡${totalSalesCRC.toLocaleString()}` : '-'} />
          <KPICard icon={TrendingUp} label="Close Rate" value={`${closeRate.toFixed(0)}%`} sub={`${sold}/${closedCalls} cerrados`} />
        </div>
      </CardContent>
    </Card>
  );
};

const KPICard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub: string }) => (
  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);
