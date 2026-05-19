import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarIcon, Copy, Rocket, Save, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  useLaunchReports,
  useUpsertLaunchReport,
  useLaunchCampaigns,
  useCampaignDayInsights,
  type LaunchReport,
} from '@/hooks/use-launch-reports';
import { useMetaConnections } from '@/hooks/use-platform-connections';
import {
  formatLaunchReport,
  computeCostPerSignup,
  computeCostPerConversation,
} from '@/lib/format-launch-report';
import { LaunchReportCharts } from './LaunchReportCharts';

interface Props {
  clientId: string;
}

const todayCR = () => {
  // Costa Rica is UTC-6, no DST
  const now = new Date();
  const offsetMs = (now.getTimezoneOffset() - -360) * 60_000;
  return new Date(now.getTime() - offsetMs);
};

export const LaunchReportWidget = ({ clientId }: Props) => {
  const [date, setDate] = useState<Date>(todayCR());
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: metaConnections } = useMetaConnections(clientId);
  const eligibleConnections = (metaConnections || []).filter((c) => !!c.ad_account_id);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  useEffect(() => {
    if (!connectionId && eligibleConnections.length > 0) {
      setConnectionId(eligibleConnections[0].id);
    }
  }, [eligibleConnections, connectionId]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useLaunchCampaigns(clientId, connectionId);
  const { data: allReports = [] } = useLaunchReports(clientId);
  const upsert = useUpsertLaunchReport();

  // Current day report from DB (if any)
  const existing = useMemo(() => allReports.find((r) => r.report_date === dateStr), [allReports, dateStr]);

  // Previous day report for comparison
  const prevDayStr = format(subDays(date, 1), 'yyyy-MM-dd');
  const prevReport = useMemo(() => allReports.find((r) => r.report_date === prevDayStr), [allReports, prevDayStr]);

  // Form state — initialize from existing or defaults
  const [campaignId, setCampaignId] = useState<string>('');
  const [groupSignups, setGroupSignups] = useState<string>('0');
  const [manychatCtr, setManychatCtr] = useState<string>('0');

  useEffect(() => {
    if (existing) {
      setCampaignId(existing.campaign_id || '');
      setGroupSignups(String(existing.group_signups || 0));
      setManychatCtr(String(existing.manychat_ctr || 0));
    } else {
      // Default campaign = last used
      const lastUsed = [...allReports].reverse().find((r) => r.campaign_id)?.campaign_id;
      setCampaignId(lastUsed || '');
      setGroupSignups('0');
      setManychatCtr('0');
    }
  }, [existing, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useCampaignDayInsights(
    clientId,
    connectionId,
    campaignId || null,
    date,
  );

  const spend = insights?.spend ?? existing?.spend_snapshot ?? 0;
  const conversations = insights?.conversations ?? existing?.conversations_snapshot ?? 0;
  const currency = insights?.currency ?? existing?.currency ?? 'USD';

  const signupsNum = parseInt(groupSignups) || 0;
  const ctrNum = parseFloat(manychatCtr) || 0;
  const costPerSignup = computeCostPerSignup(spend, signupsNum);
  const costPerConv = computeCostPerConversation(spend, conversations);
  const prevCps = prevReport ? computeCostPerSignup(prevReport.spend_snapshot || 0, prevReport.group_signups || 0) : 0;

  const symbol = currency === 'CRC' ? '₡' : '$';
  const fmt = (n: number, dec = 2) => `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

  const handleSave = async () => {
    const campaignName = campaigns.find((c) => c.id === campaignId)?.name || existing?.campaign_name || null;
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        report_date: dateStr,
        campaign_id: campaignId || null,
        campaign_name: campaignName,
        spend_snapshot: spend,
        conversations_snapshot: conversations,
        currency,
        group_signups: signupsNum,
        manychat_ctr: ctrNum,
      });
      toast.success('Reporte guardado');
    } catch (e: any) {
      toast.error('No se pudo guardar', { description: e?.message });
    }
  };

  const handleCopy = async () => {
    const text = formatLaunchReport(
      { date, spend, currency, conversations, groupSignups: signupsNum, manychatCtr: ctrNum },
      prevReport ? { date: parseISO(prevReport.report_date), costPerSignup: prevCps } : null,
    );
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Reporte copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const cpsDelta = prevCps > 0 && costPerSignup > 0 ? costPerSignup - prevCps : 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Reporte Diario de Lanzamiento
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(date, "EEEE d 'de' MMM", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="h-9" onClick={() => refetchInsights()} disabled={insightsLoading}>
              <RefreshCw className={cn('h-4 w-4', insightsLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Connection + campaign selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {eligibleConnections.length > 1 && (
            <div>
              <Label className="text-xs text-muted-foreground">Cuenta Meta</Label>
              <Select value={connectionId || ''} onValueChange={setConnectionId}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Selecciona cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleConnections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.account_label || c.platform_page_name || `Ad ${c.ad_account_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={eligibleConnections.length > 1 ? '' : 'md:col-span-2'}>
            <Label className="text-xs text-muted-foreground">Campaña de Lanzamiento</Label>
            <Select value={campaignId} onValueChange={setCampaignId} disabled={campaignsLoading || campaigns.length === 0}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder={campaignsLoading ? 'Cargando…' : 'Selecciona campaña'} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">💰 Inversión del día</div>
            {insightsLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <div className="text-xl font-bold mt-1">{fmt(spend)}</div>
            )}
          </div>
          <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Conversaciones</div>
            {insightsLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <div className="text-xl font-bold mt-1">{conversations}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{fmt(costPerConv)} c/u</div>
          </div>
          <div className="rounded-lg border border-border/50 p-3 bg-muted/30 col-span-2 md:col-span-1">
            <div className="text-xs text-muted-foreground">Costo por ingreso</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-2">
              {fmt(costPerSignup)}
              {prevCps > 0 && costPerSignup > 0 && (
                <Badge variant={cpsDelta < 0 ? 'default' : 'destructive'} className="h-5 px-1.5">
                  {cpsDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                </Badge>
              )}
            </div>
            {prevCps > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Ayer: {fmt(prevCps)}
              </div>
            )}
          </div>
        </div>

        {/* Manual inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Ingresos al grupo</Label>
            <Input
              type="number"
              min="0"
              value={groupSignups}
              onChange={(e) => setGroupSignups(e.target.value)}
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CTR Manychat (%)</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={manychatCtr}
              onChange={(e) => setManychatCtr(e.target.value)}
              className="h-9 mt-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {existing ? 'Actualizar' : 'Guardar'}
          </Button>
          <Button variant="secondary" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            Copiar reporte
          </Button>
          {existing && (
            <Badge variant="outline" className="self-center">
              Última actualización: {format(parseISO(existing.updated_at), "d MMM HH:mm", { locale: es })}
            </Badge>
          )}
        </div>

        {/* Historical charts + table */}
        <LaunchReportCharts reports={allReports} currency={currency} onEditDate={(d) => setDate(d)} />
      </CardContent>
    </Card>
  );
};

export default LaunchReportWidget;
