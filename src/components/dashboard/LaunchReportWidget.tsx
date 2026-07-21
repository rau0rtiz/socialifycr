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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarIcon, Copy, Rocket, Save, RefreshCw, TrendingDown, TrendingUp, Archive, Plus, Lock, Download } from 'lucide-react';
import {
  useLaunchReports,
  useUpsertLaunchReport,
  useLaunchCampaigns,
  useCampaignDayInsights,
  useLaunches,
  useCreateLaunch,
  useArchiveLaunch,
  useUpdateLaunch,
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
  const now = new Date();
  const offsetMs = (now.getTimezoneOffset() - -360) * 60_000;
  return new Date(now.getTime() - offsetMs);
};

export const LaunchReportWidget = ({ clientId }: Props) => {
  const [date, setDate] = useState<Date>(todayCR());
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: metaConnections } = useMetaConnections(clientId);
  const eligibleConnections = (metaConnections || []).filter((c) => !!c.ad_account_id);
  const connectionStorageKey = `launch-report:connection:${clientId}`;
  const [connectionId, setConnectionId] = useState<string | null>(() => {
    try { return localStorage.getItem(connectionStorageKey) || null; } catch { return null; }
  });
  useEffect(() => {
    const connectionStillAvailable = eligibleConnections.some((c) => c.id === connectionId);
    if ((!connectionId || !connectionStillAvailable) && eligibleConnections.length > 0) {
      setConnectionId(eligibleConnections[0].id);
    }
  }, [eligibleConnections, connectionId]);

  useEffect(() => {
    try {
      if (connectionId) localStorage.setItem(connectionStorageKey, connectionId);
    } catch { /* ignore */ }
  }, [connectionId, connectionStorageKey]);

  // Launches
  const { data: launches = [] } = useLaunches(clientId);
  const launchStorageKey = `launch-report:launch:${clientId}`;
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(() => {
    try { return localStorage.getItem(launchStorageKey) || null; } catch { return null; }
  });

  // Default to first active launch (or any) when no selection
  useEffect(() => {
    if (launches.length === 0) return;
    const stillExists = launches.some((l) => l.id === selectedLaunchId);
    if (!selectedLaunchId || !stillExists) {
      const active = launches.find((l) => l.status === 'active');
      setSelectedLaunchId((active || launches[0]).id);
    }
  }, [launches, selectedLaunchId]);

  useEffect(() => {
    try {
      if (selectedLaunchId) localStorage.setItem(launchStorageKey, selectedLaunchId);
    } catch { /* ignore */ }
  }, [selectedLaunchId, launchStorageKey]);

  const selectedLaunch = useMemo(
    () => launches.find((l) => l.id === selectedLaunchId) || null,
    [launches, selectedLaunchId],
  );
  const isArchived = selectedLaunch?.status === 'archived';

  const { data: campaigns = [], isLoading: campaignsLoading } = useLaunchCampaigns(clientId, connectionId);
  const { data: allReports = [] } = useLaunchReports(selectedLaunchId);
  const upsert = useUpsertLaunchReport();
  const createLaunch = useCreateLaunch();
  const archiveLaunch = useArchiveLaunch();
  const updateLaunch = useUpdateLaunch();

  // Current day report from DB (if any)
  const existing = useMemo(() => allReports.find((r) => r.report_date === dateStr), [allReports, dateStr]);

  // Previous day report for comparison
  const prevDayStr = format(subDays(date, 1), 'yyyy-MM-dd');
  const prevReport = useMemo(() => allReports.find((r) => r.report_date === prevDayStr), [allReports, prevDayStr]);

  // Campaign: per-day override takes precedence over launch default
  const [campaignId, setCampaignId] = useState<string>('');
  const [applyToLaunch, setApplyToLaunch] = useState(false);
  useEffect(() => {
    setCampaignId(existing?.campaign_id || selectedLaunch?.campaign_id || '');
    setApplyToLaunch(false);
  }, [existing?.campaign_id, selectedLaunch?.campaign_id, selectedLaunchId, dateStr]);

  const [groupSignups, setGroupSignups] = useState<string>('0');
  const [manychatCtr, setManychatCtr] = useState<string>('0');

  useEffect(() => {
    if (existing) {
      setGroupSignups(String(existing.group_signups || 0));
      setManychatCtr(String(existing.manychat_ctr || 0));
    } else {
      setGroupSignups('0');
      setManychatCtr('0');
    }
  }, [existing, dateStr]);

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useCampaignDayInsights(
    clientId,
    connectionId,
    isArchived ? null : (campaignId || null),
    isArchived ? null : date,
  );

  // Archived launches: always use stored snapshots (Meta may no longer serve that data).
  // Active launches: prefer live insights, fall back to stored values.
  const spend = isArchived
    ? (existing?.spend_snapshot ?? 0)
    : (insights?.spend ?? existing?.spend_snapshot ?? 0);
  const conversations = isArchived
    ? (existing?.conversations_snapshot ?? 0)
    : (insights?.conversations ?? existing?.conversations_snapshot ?? 0);
  const currency = existing?.currency ?? insights?.currency ?? 'USD';

  const signupsNum = parseInt(groupSignups) || 0;
  const ctrNum = parseFloat(manychatCtr) || 0;
  const costPerSignup = computeCostPerSignup(spend, signupsNum);
  const costPerConv = computeCostPerConversation(spend, conversations);
  const prevCps = prevReport ? computeCostPerSignup(prevReport.spend_snapshot || 0, prevReport.group_signups || 0) : 0;

  const symbol = currency === 'CRC' ? '₡' : '$';
  const fmt = (n: number, dec = 2) => `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

  const handleSave = async () => {
    if (!selectedLaunchId) {
      toast.error('Selecciona o crea un lanzamiento primero');
      return;
    }
    if (isArchived) {
      toast.error('Este lanzamiento está archivado');
      return;
    }
    const campaignName = campaigns.find((c) => c.id === campaignId)?.name || existing?.campaign_name || selectedLaunch?.campaign_name || null;
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        launch_id: selectedLaunchId,
        report_date: dateStr,
        campaign_id: campaignId || null,
        campaign_name: campaignName,
        spend_snapshot: spend,
        conversations_snapshot: conversations,
        currency,
        group_signups: signupsNum,
        manychat_ctr: ctrNum,
      });
      if (applyToLaunch && selectedLaunch && campaignId && campaignId !== selectedLaunch.campaign_id) {
        await updateLaunch.mutateAsync({
          id: selectedLaunch.id,
          client_id: clientId,
          campaign_id: campaignId,
          campaign_name: campaignName,
        });
      }
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

  // New launch dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCampaignId, setNewCampaignId] = useState<string>('');
  const [archiveCurrent, setArchiveCurrent] = useState(true);

  const openNewLaunchDialog = (defaultArchive: boolean) => {
    const nextNumber = launches.length + 1;
    setNewName(`Lanzamiento ${nextNumber}`);
    setNewCampaignId('');
    setArchiveCurrent(defaultArchive);
    setNewOpen(true);
  };

  const handleCreateLaunch = async () => {
    if (!newName.trim()) {
      toast.error('Dale un nombre al lanzamiento');
      return;
    }
    try {
      if (archiveCurrent && selectedLaunch && selectedLaunch.status === 'active') {
        await archiveLaunch.mutateAsync({ id: selectedLaunch.id, client_id: clientId });
      }
      const campaignName = campaigns.find((c) => c.id === newCampaignId)?.name || null;
      const created = await createLaunch.mutateAsync({
        client_id: clientId,
        name: newName.trim(),
        campaign_id: newCampaignId || null,
        campaign_name: campaignName,
      });
      setSelectedLaunchId(created.id);
      setNewOpen(false);
      toast.success('Nuevo lanzamiento creado');
    } catch (e: any) {
      toast.error('No se pudo crear', { description: e?.message });
    }
  };

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
        {/* Launch selector + actions */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Lanzamiento</Label>
            <Select value={selectedLaunchId || ''} onValueChange={setSelectedLaunchId}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder={launches.length === 0 ? 'Crea tu primer lanzamiento' : 'Selecciona lanzamiento'} />
              </SelectTrigger>
              <SelectContent>
                {launches.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="flex items-center gap-2">
                      {l.status === 'archived' && <Archive className="h-3 w-3 text-muted-foreground" />}
                      <span>{l.name}</span>
                      {l.status === 'archived' && <span className="text-xs text-muted-foreground">(archivado)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedLaunch && !isArchived && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => openNewLaunchDialog(true)}
            >
              <Archive className="h-4 w-4" />
              Archivar y nuevo
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => openNewLaunchDialog(false)}
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>

        {isArchived && (
          <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Lanzamiento archivado: solo lectura. Selecciona o crea un lanzamiento activo para registrar nuevos datos.
          </div>
        )}

        {/* Connection + campaign info */}
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
            <Label className="text-xs text-muted-foreground">
              Campaña {existing?.campaign_id && existing.campaign_id !== selectedLaunch?.campaign_id ? '(override para este día)' : 'del día'}
            </Label>
            <Select
              value={campaignId}
              onValueChange={setCampaignId}
              disabled={isArchived || campaignsLoading || campaigns.length === 0}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder={campaignsLoading ? 'Cargando…' : 'Selecciona campaña'} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {campaignId && selectedLaunch && campaignId !== selectedLaunch.campaign_id && !isArchived && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                <input
                  type="checkbox"
                  checked={applyToLaunch}
                  onChange={(e) => setApplyToLaunch(e.target.checked)}
                />
                Guardar como campaña por defecto del lanzamiento
              </label>
            )}
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
              disabled={isArchived}
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
              disabled={isArchived}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={upsert.isPending || isArchived || !selectedLaunchId} className="gap-2">
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

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo lanzamiento</DialogTitle>
            <DialogDescription>
              Crea un nuevo lanzamiento desde cero. Podrás seguir consultando los anteriores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Campaña de Meta</Label>
              <Select value={newCampaignId} onValueChange={setNewCampaignId} disabled={campaignsLoading || campaigns.length === 0}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={campaignsLoading ? 'Cargando…' : 'Selecciona campaña'} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLaunch && selectedLaunch.status === 'active' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={archiveCurrent}
                  onChange={(e) => setArchiveCurrent(e.target.checked)}
                />
                Archivar lanzamiento actual ({selectedLaunch.name})
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLaunch} disabled={createLaunch.isPending || archiveLaunch.isPending}>
              Crear lanzamiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LaunchReportWidget;
