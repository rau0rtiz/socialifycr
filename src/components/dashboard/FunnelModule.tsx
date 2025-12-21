import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Plus, Trash2, Filter, CalendarIcon, Settings2 } from 'lucide-react';
import { useCampaigns, DatePresetKey, DateRange } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FunnelStep {
  id: string;
  name: string;
  value: number;
  isManual: boolean;
  enabled: boolean;
}

interface FunnelModuleProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

const datePresetLabels: Record<DatePresetKey, string> = {
  last_7d: 'Últimos 7 días',
  last_14d: 'Últimos 14 días',
  last_30d: 'Últimos 30 días',
  last_90d: 'Últimos 90 días',
  this_month: 'Este mes',
  last_month: 'Mes pasado',
  custom: 'Personalizado',
};

// HSL colors for funnel steps - using actual color values for gradients
const funnelColors = [
  { from: '222 47% 11%', to: '222 47% 20%' },      // Primary dark blue
  { from: '210 80% 50%', to: '210 80% 60%' },      // Blue
  { from: '173 80% 40%', to: '173 80% 50%' },      // Teal
  { from: '142 70% 45%', to: '142 70% 55%' },      // Green
  { from: '38 92% 50%', to: '38 92% 60%' },        // Orange
  { from: '280 65% 60%', to: '280 65% 70%' },      // Purple
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export const FunnelModule = ({ clientId, hasAdAccount }: FunnelModuleProps) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [manualSteps, setManualSteps] = useState<FunnelStep[]>([]);
  const [newStepName, setNewStepName] = useState('');
  const [newStepValue, setNewStepValue] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DatePresetKey>('last_30d');
  const [customRange, setCustomRange] = useState<DateRange>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Step visibility state
  const [enabledSteps, setEnabledSteps] = useState<Record<string, boolean>>({
    impressions: true,
    reach: true,
    clicks: true,
    results: true,
  });

  const { data, isLoading, refetch, isFetching } = useCampaigns(
    clientId, 
    hasAdAccount, 
    datePreset,
    datePreset === 'custom' ? customRange : undefined
  );

  const campaigns = data?.campaigns || [];

  // Calculate funnel steps from campaign data
  const autoSteps = useMemo((): FunnelStep[] => {
    let filteredCampaigns = campaigns;
    
    if (selectedCampaignId !== 'all') {
      filteredCampaigns = campaigns.filter(c => c.id === selectedCampaignId);
    }

    if (filteredCampaigns.length === 0) return [];

    const totals = filteredCampaigns.reduce(
      (acc, campaign) => ({
        impressions: acc.impressions + campaign.impressions,
        reach: acc.reach + campaign.reach,
        clicks: acc.clicks + campaign.clicks,
        results: acc.results + campaign.results,
      }),
      { impressions: 0, reach: 0, clicks: 0, results: 0 }
    );

    const resultType = filteredCampaigns.find(c => c.resultType)?.resultType || 'Conversiones';

    return [
      { id: 'impressions', name: 'Impresiones', value: totals.impressions, isManual: false, enabled: enabledSteps.impressions },
      { id: 'reach', name: 'Alcance', value: totals.reach, isManual: false, enabled: enabledSteps.reach },
      { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, enabled: enabledSteps.clicks },
      { id: 'results', name: resultType, value: totals.results, isManual: false, enabled: enabledSteps.results },
    ];
  }, [campaigns, selectedCampaignId, enabledSteps]);

  // Combine auto and manual steps, filter by enabled, sort by value
  const visibleSteps = useMemo(() => {
    const enabledAutoSteps = autoSteps.filter(s => s.enabled);
    const enabledManualSteps = manualSteps.filter(s => s.enabled);
    return [...enabledAutoSteps, ...enabledManualSteps].sort((a, b) => b.value - a.value);
  }, [autoSteps, manualSteps]);

  const maxValue = visibleSteps.length > 0 ? Math.max(...visibleSteps.map(s => s.value)) : 1;

  const handleAddManualStep = () => {
    if (!newStepName.trim() || !newStepValue) return;
    
    const newStep: FunnelStep = {
      id: `manual-${Date.now()}`,
      name: newStepName.trim(),
      value: parseInt(newStepValue) || 0,
      isManual: true,
      enabled: true,
    };
    
    setManualSteps(prev => [...prev, newStep]);
    setNewStepName('');
    setNewStepValue('');
    setIsAddingStep(false);
  };

  const handleRemoveManualStep = (stepId: string) => {
    setManualSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const toggleStep = (stepId: string, isManual: boolean) => {
    if (isManual) {
      setManualSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, enabled: !s.enabled } : s
      ));
    } else {
      setEnabledSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
    }
  };

  const handleDatePresetChange = (value: string) => {
    const preset = value as DatePresetKey;
    setDatePreset(preset);
    if (preset !== 'custom') {
      setCustomRange({});
    }
  };

  const handleCustomRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setCustomRange(range);
      if (range.from && range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  const getConversionRate = (currentIndex: number): string | null => {
    if (currentIndex === 0) return null;
    const prevValue = visibleSteps[currentIndex - 1]?.value || 0;
    const currentValue = visibleSteps[currentIndex]?.value || 0;
    if (prevValue === 0) return '0%';
    return `${((currentValue / prevValue) * 100).toFixed(1)}%`;
  };

  const getOverallConversion = (): string => {
    if (visibleSteps.length < 2) return '—';
    const first = visibleSteps[0]?.value || 0;
    const last = visibleSteps[visibleSteps.length - 1]?.value || 0;
    if (first === 0) return '0%';
    return `${((last / first) * 100).toFixed(2)}%`;
  };

  if (!hasAdAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Embudo de Conversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Conecta una cuenta de Meta Ads para visualizar el embudo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Embudo de Conversión
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Range Selector */}
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(datePresetLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Date Range Picker */}
              {datePreset === 'custom' && (
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      {customRange.from && customRange.to ? (
                        `${format(customRange.from, 'dd/MM', { locale: es })} - ${format(customRange.to, 'dd/MM', { locale: es })}`
                      ) : (
                        'Seleccionar fechas'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={customRange.from && customRange.to ? { from: customRange.from, to: customRange.to } : undefined}
                      onSelect={handleCustomRangeSelect}
                      numberOfMonths={2}
                      locale={es}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Campaign Selector */}
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Campaña" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las campañas</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Settings Toggle */}
              <Button 
                variant={showSettings ? "secondary" : "outline"}
                size="sm" 
                onClick={() => setShowSettings(!showSettings)}
                className="h-8"
              >
                <Settings2 className="h-4 w-4" />
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Step Selection Panel */}
          {showSettings && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground font-medium self-center">Pasos visibles:</span>
              {autoSteps.map(step => (
                <label key={step.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={enabledSteps[step.id]} 
                    onCheckedChange={() => toggleStep(step.id, false)}
                  />
                  <span className="text-xs">{step.name}</span>
                </label>
              ))}
              {manualSteps.map(step => (
                <label key={step.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={step.enabled} 
                    onCheckedChange={() => toggleStep(step.id, true)}
                  />
                  <span className="text-xs">{step.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1">Manual</Badge>
                </label>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-8">
            {[100, 80, 60, 40].map((w, i) => (
              <Skeleton key={i} className="h-14" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : visibleSteps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay datos disponibles. Selecciona al menos un paso.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0 py-4">
            {visibleSteps.map((step, index) => {
              const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
              const minWidth = 25;
              const displayWidth = Math.max(widthPercent, minWidth);
              const conversionRate = getConversionRate(index);
              const colorSet = funnelColors[index % funnelColors.length];
              
              return (
                <div key={step.id} className="w-full flex flex-col items-center group">
                  {/* Conversion rate connector */}
                  {conversionRate && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-3 w-px bg-border" />
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-2 py-0 font-mono bg-muted"
                      >
                        {conversionRate}
                      </Badge>
                      <div className="h-3 w-px bg-border" />
                    </div>
                  )}
                  
                  {/* Funnel step - trapezoid shape */}
                  <div
                    className={cn(
                      "relative flex items-center justify-between px-4 py-4 transition-all duration-500 cursor-pointer",
                      "hover:brightness-110 hover:shadow-lg",
                      step.isManual && "border-2 border-dashed border-primary/30"
                    )}
                    style={{
                      width: `${displayWidth}%`,
                      clipPath: index === visibleSteps.length - 1 
                        ? 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)'
                        : 'polygon(2% 0, 98% 0, 95% 100%, 5% 100%)',
                      borderRadius: index === 0 ? '8px 8px 0 0' : index === visibleSteps.length - 1 ? '0 0 8px 8px' : '0',
                      background: step.isManual 
                        ? 'hsl(var(--muted))' 
                        : `linear-gradient(to right, hsl(${colorSet.from}), hsl(${colorSet.to}))`,
                    }}
                  >
                    <div className="flex items-center gap-2 z-10">
                      <span className={cn(
                        "font-semibold text-sm",
                        step.isManual ? "text-foreground" : "text-white"
                      )}>
                        {step.name}
                      </span>
                      {step.isManual && (
                        <Badge variant="outline" className="text-[9px] bg-background/80">Manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 z-10">
                      <span className={cn(
                        "font-bold text-lg tabular-nums",
                        step.isManual ? "text-foreground" : "text-white"
                      )}>
                        {formatNumber(step.value)}
                      </span>
                      {step.isManual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveManualStep(step.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Overall conversion summary */}
            {visibleSteps.length >= 2 && (
              <div className="mt-4 pt-4 border-t border-border w-full text-center">
                <span className="text-xs text-muted-foreground">Conversión total: </span>
                <span className="text-sm font-bold text-primary">{getOverallConversion()}</span>
              </div>
            )}
          </div>
        )}

        {/* Add manual step section */}
        <div className="mt-4 pt-4 border-t border-border">
          {isAddingStep ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Nombre del paso"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                className="flex-1 h-9"
              />
              <Input
                placeholder="Valor"
                type="number"
                value={newStepValue}
                onChange={(e) => setNewStepValue(e.target.value)}
                className="w-full sm:w-32 h-9"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddManualStep} className="h-9">
                  Agregar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setIsAddingStep(false);
                    setNewStepName('');
                    setNewStepValue('');
                  }}
                  className="h-9"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingStep(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar paso manual
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
