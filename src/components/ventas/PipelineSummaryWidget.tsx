import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SetterAppointment } from '@/hooks/use-setter-appointments';
import { MessageSale } from '@/hooks/use-sales-tracking';
import { SetterDailyReport } from '@/hooks/use-setter-daily-reports';
import { CampaignInsights } from '@/hooks/use-ads-data';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, DollarSign, MessageCircle, CalendarDays,
  CheckCircle2, XCircle, TrendingUp, ShoppingCart, Filter, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isWithinInterval, parseISO } from 'date-fns';

interface PipelineSummaryWidgetProps {
  appointments: SetterAppointment[];
  sales: MessageSale[];
  dailyReports: SetterDailyReport[];
  campaigns: CampaignInsights[];
  adCurrency: string;
  dateRange: { start: Date; end: Date };
}

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
  dateRange,
}: PipelineSummaryWidgetProps) => {
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const range = dateRange;

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return isWithinInterval(d, { start: range.start, end: range.end });
    });
  }, [appointments, range]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = parseISO(s.sale_date);
      return isWithinInterval(d, { start: range.start, end: range.end }) && s.status !== 'cancelled';
    });
  }, [sales, range]);

  const filteredReports = useMemo(() => {
    return dailyReports.filter(r => {
      const d = parseISO(r.report_date);
      return isWithinInterval(d, { start: range.start, end: range.end });
    });
  }, [dailyReports, range]);

  const adSpend = useMemo(() => {
    const targetCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(c => selectedCampaignIds.includes(c.id))
      : campaigns;
    return targetCampaigns.reduce((sum, c) => sum + c.spend, 0);
  }, [campaigns, selectedCampaignIds]);

  const totalConversations = useMemo(() => {
    const targetCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(c => selectedCampaignIds.includes(c.id))
      : campaigns;
    return targetCampaigns
      .filter(c => c.objective === 'MESSAGES' || c.resultType?.toLowerCase().includes('messaging'))
      .reduce((sum, c) => sum + c.results, 0);
  }, [campaigns, selectedCampaignIds]);

  const totalFollowups = filteredReports.reduce((s, r) => s + r.followups, 0);

  const completed = filteredAppointments.filter(a =>
    a.status === 'completed' || a.status === 'sold' || (a.status as string) === 'not_sold'
  ).length;
  const noShows = filteredAppointments.filter(a => a.status === 'no_show').length;
  const showRate = (completed + noShows) > 0 ? (completed / (completed + noShows)) * 100 : 0;

  const sold = filteredAppointments.filter(a => a.status === 'sold').length;
  const notSold = filteredAppointments.filter(a => (a.status as string) === 'not_sold').length;
  const closedCalls = sold + notSold;
  const closeRate = closedCalls > 0 ? (sold / closedCalls) * 100 : 0;

  const totalSalesUSD = filteredSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSalesCRC = filteredSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const cashLabel = totalSalesUSD > 0
    ? `$${totalSalesUSD.toLocaleString()}`
    : totalSalesCRC > 0
    ? `₡${totalSalesCRC.toLocaleString()}`
    : '$0';

  const totalContractUSD = filteredSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.total_sale_amount || s.amount), 0);
  const totalContractCRC = filteredSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.total_sale_amount || s.amount), 0);
  const pendingUSD = totalContractUSD - totalSalesUSD;
  const pendingCRC = totalContractCRC - totalSalesCRC;
  const pendingSub = pendingUSD > 0
    ? `$${pendingUSD.toLocaleString()} pendiente`
    : pendingCRC > 0
    ? `₡${pendingCRC.toLocaleString()} pendiente`
    : 'Todo cobrado';

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const items = [
    {
      icon: DollarSign,
      label: 'Gasto Ads',
      value: formatCurrency(adSpend, adCurrency),
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      filterNode: campaigns.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
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
      ) : null,
    },
    {
      icon: MessageCircle,
      label: 'Conversaciones',
      value: totalConversations.toString(),
      sub: `${totalFollowups} seguimientos`,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
    {
      icon: CalendarDays,
      label: 'Agendas',
      value: filteredAppointments.length.toString(),
      sub: `${filteredReports.reduce((s, r) => s + r.appointments_made, 0)} desde reportes`,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      icon: CheckCircle2,
      label: 'Show Rate',
      value: `${showRate.toFixed(0)}%`,
      sub: `${completed} asistieron`,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      progress: showRate,
    },
    {
      icon: XCircle,
      label: 'No Show',
      value: `${noShows}`,
      sub: `de ${completed + noShows} citas`,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      icon: ShoppingCart,
      label: 'Ventas',
      value: filteredSales.length.toString(),
      sub: totalSalesUSD > 0 ? `$${totalSalesUSD.toLocaleString()}` : totalSalesCRC > 0 ? `₡${totalSalesCRC.toLocaleString()}` : '-',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Close Rate',
      value: `${closeRate.toFixed(0)}%`,
      sub: `${sold}/${closedCalls} cerrados`,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      progress: closeRate,
    },
    {
      icon: Wallet,
      label: 'Cash Collected',
      value: cashLabel,
      sub: pendingSub,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
    },
  ];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          Resumen de Ventas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map(({ icon: Icon, label, value, sub, color, bg, progress, filterNode }) => (
            <div key={label} className="p-3 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-shadow space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className={cn('p-1 rounded-md', bg)}>
                  <Icon className={cn('h-3 w-3', color)} />
                </div>
                <span className="text-[10px] font-medium flex-1">{label}</span>
                {filterNode}
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
              {progress !== undefined && (
                <Progress value={progress} className="h-1.5" />
              )}
              {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
