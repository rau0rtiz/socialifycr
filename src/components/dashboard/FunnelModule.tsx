import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, Trash2, Filter, CalendarIcon, Settings2, ShoppingBag, DollarSign } from 'lucide-react';
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
  subValue?: string; // For showing amounts like "$5,000"
}

interface NonAttributedSales {
  quantity: number;
  totalAmount: number;
  currency: string;
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
  { from: '340 75% 55%', to: '340 75% 65%' },      // Pink
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Determine campaign type category from objective
type CampaignCategory = 'sales' | 'traffic' | 'messaging' | 'leads' | 'engagement' | 'awareness' | 'other';

const getCampaignCategory = (objective: string): CampaignCategory => {
  const objectiveMap: Record<string, CampaignCategory> = {
    OUTCOME_SALES: 'sales',
    CONVERSIONS: 'sales',
    OUTCOME_TRAFFIC: 'traffic',
    LINK_CLICKS: 'traffic',
    MESSAGES: 'messaging',
    OUTCOME_ENGAGEMENT: 'engagement',
    POST_ENGAGEMENT: 'engagement',
    OUTCOME_AWARENESS: 'awareness',
    REACH: 'awareness',
    BRAND_AWARENESS: 'awareness',
    OUTCOME_LEADS: 'leads',
    LEAD_GENERATION: 'leads',
  };
  return objectiveMap[objective] || 'other';
};

export const FunnelModule = ({ clientId, hasAdAccount }: FunnelModuleProps) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [manualSteps, setManualSteps] = useState<FunnelStep[]>([]);
  const [newStepName, setNewStepName] = useState('');
  const [newStepValue, setNewStepValue] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Non-attributed sales state
  const [nonAttributedSales, setNonAttributedSales] = useState<NonAttributedSales | null>(null);
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [salesQuantity, setSalesQuantity] = useState('');
  const [salesTotalAmount, setSalesTotalAmount] = useState('');
  const [salesCurrency, setSalesCurrency] = useState('CRC');
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DatePresetKey>('last_30d');
  const [customRange, setCustomRange] = useState<DateRange>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Step visibility state - will be dynamic based on campaign type
  const [enabledSteps, setEnabledSteps] = useState<Record<string, boolean>>({
    impressions: true,
    reach: true,
    clicks: true,
    landingPageViews: true,
    results: true,
  });

  const { data, isLoading, refetch, isFetching } = useCampaigns(
    clientId, 
    hasAdAccount, 
    datePreset,
    datePreset === 'custom' ? customRange : undefined
  );

  const campaigns = data?.campaigns || [];
  const currency = data?.currency || 'USD';

  // Determine the primary campaign category from selected campaign(s)
  const campaignCategory = useMemo((): CampaignCategory => {
    let filteredCampaigns = campaigns;
    if (selectedCampaignId !== 'all') {
      filteredCampaigns = campaigns.filter(c => c.id === selectedCampaignId);
    }
    if (filteredCampaigns.length === 0) return 'other';
    
    // Get the most common category or use the first one
    const categories = filteredCampaigns.map(c => getCampaignCategory(c.objective));
    const categoryCount: Record<string, number> = {};
    categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // Return the most frequent category
    return Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] as CampaignCategory || 'other';
  }, [campaigns, selectedCampaignId]);

  // Is this a sales/purchase campaign?
  const isSalesCampaign = campaignCategory === 'sales';

  // Calculate funnel steps from campaign data - DYNAMIC based on campaign type
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
        landingPageViews: acc.landingPageViews + (campaign.landingPageViews || 0),
        spend: acc.spend + campaign.spend,
      }),
      { impressions: 0, reach: 0, clicks: 0, results: 0, landingPageViews: 0, spend: 0 }
    );

    // Get result type from campaigns
    const resultType = filteredCampaigns.find(c => c.resultType)?.resultType || 'Conversiones';

    // Base steps that apply to all campaign types
    const steps: FunnelStep[] = [
      { id: 'impressions', name: 'Impresiones', value: totals.impressions, isManual: false, enabled: enabledSteps.impressions },
      { id: 'reach', name: 'Alcance', value: totals.reach, isManual: false, enabled: enabledSteps.reach },
    ];

    // Add campaign-type specific steps
    switch (campaignCategory) {
      case 'sales':
        steps.push(
          { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, enabled: enabledSteps.clicks },
          { id: 'landingPageViews', name: 'Vistas a Página', value: totals.landingPageViews, isManual: false, enabled: enabledSteps.landingPageViews },
          { id: 'results', name: resultType, value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
        break;
      
      case 'traffic':
        steps.push(
          { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, enabled: enabledSteps.clicks },
          { id: 'landingPageViews', name: 'Vistas a Página', value: totals.landingPageViews, isManual: false, enabled: enabledSteps.landingPageViews },
          { id: 'results', name: resultType || 'Clics en enlace', value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
        break;
      
      case 'messaging':
        steps.push(
          { id: 'results', name: resultType || 'Conversaciones', value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
        break;
      
      case 'leads':
        steps.push(
          { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, enabled: enabledSteps.clicks },
          { id: 'results', name: resultType || 'Leads', value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
        break;
      
      case 'engagement':
        steps.push(
          { id: 'results', name: resultType || 'Interacciones', value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
        break;
      
      case 'awareness':
        // For awareness, reach is the main metric - already included
        break;
      
      default:
        steps.push(
          { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, enabled: enabledSteps.clicks },
          { id: 'results', name: resultType, value: totals.results, isManual: false, enabled: enabledSteps.results }
        );
    }

    return steps;
  }, [campaigns, selectedCampaignId, enabledSteps, campaignCategory]);

  // Add non-attributed sales as final step for sales campaigns
  const stepsWithNonAttributed = useMemo(() => {
    if (!isSalesCampaign || !nonAttributedSales) return autoSteps;
    
    // Find the meta-attributed purchases
    const metaResults = autoSteps.find(s => s.id === 'results')?.value || 0;
    const totalSales = metaResults + nonAttributedSales.quantity;
    
    // Replace results step with total and add non-attributed detail
    const stepsWithTotal = autoSteps.map(step => {
      if (step.id === 'results') {
        return {
          ...step,
          name: 'Compras (Meta)',
          value: step.value,
        };
      }
      return step;
    });
    
    // Add non-attributed sales step
    stepsWithTotal.push({
      id: 'nonAttributed',
      name: 'Ventas no atribuidas',
      value: nonAttributedSales.quantity,
      isManual: true,
      enabled: true,
      subValue: formatCurrency(nonAttributedSales.totalAmount, nonAttributedSales.currency),
    });
    
    // Add total sales step
    stepsWithTotal.push({
      id: 'totalSales',
      name: 'Total Ventas Tienda',
      value: totalSales,
      isManual: true,
      enabled: true,
      subValue: formatCurrency(nonAttributedSales.totalAmount, nonAttributedSales.currency),
    });
    
    return stepsWithTotal;
  }, [autoSteps, nonAttributedSales, isSalesCampaign]);

  // Combine auto and manual steps, filter by enabled, sort by value
  const visibleSteps = useMemo(() => {
    const enabledAutoSteps = stepsWithNonAttributed.filter(s => s.enabled);
    const enabledManualSteps = manualSteps.filter(s => s.enabled);
    return [...enabledAutoSteps, ...enabledManualSteps].sort((a, b) => b.value - a.value);
  }, [stepsWithNonAttributed, manualSteps]);

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

  const handleAddNonAttributedSales = () => {
    const qty = parseInt(salesQuantity) || 0;
    const amount = parseFloat(salesTotalAmount) || 0;
    
    if (qty > 0 && amount > 0) {
      setNonAttributedSales({
        quantity: qty,
        totalAmount: amount,
        currency: salesCurrency,
      });
    }
    
    setShowSalesDialog(false);
    setSalesQuantity('');
    setSalesTotalAmount('');
  };

  const handleRemoveNonAttributedSales = () => {
    setNonAttributedSales(null);
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
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Embudo de Conversión
                </CardTitle>
                {campaignCategory !== 'other' && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {campaignCategory === 'sales' ? 'Compras' : 
                     campaignCategory === 'traffic' ? 'Tráfico' :
                     campaignCategory === 'messaging' ? 'Mensajes' :
                     campaignCategory === 'leads' ? 'Leads' :
                     campaignCategory === 'engagement' ? 'Interacción' :
                     campaignCategory === 'awareness' ? 'Alcance' : campaignCategory}
                  </Badge>
                )}
              </div>
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
                {autoSteps.filter(s => !['nonAttributed', 'totalSales'].includes(s.id)).map(step => (
                  <label key={step.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={enabledSteps[step.id] ?? true} 
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
                const conversionRate = getConversionRate(index);
                const colorSet = funnelColors[index % funnelColors.length];
                
                // Visual mode: create a smooth funnel shape regardless of values
                const totalSteps = visibleSteps.length;
                const displayWidth = 100 - (index * (70 / Math.max(totalSteps - 1, 1)));
                
                const isSpecialStep = ['nonAttributed', 'totalSales'].includes(step.id);
                
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
                        "relative flex flex-col items-center justify-center px-4 py-4 transition-all duration-500 cursor-pointer",
                        "hover:brightness-110 hover:shadow-lg",
                        (step.isManual || isSpecialStep) && "border-2 border-dashed",
                        step.id === 'totalSales' && "border-primary/50",
                        step.id === 'nonAttributed' && "border-orange-500/50"
                      )}
                      style={{
                        width: `${displayWidth}%`,
                        clipPath: index === visibleSteps.length - 1 
                          ? 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)'
                          : 'polygon(2% 0, 98% 0, 95% 100%, 5% 100%)',
                        borderRadius: index === 0 ? '8px 8px 0 0' : index === visibleSteps.length - 1 ? '0 0 8px 8px' : '0',
                        background: step.id === 'totalSales'
                          ? 'linear-gradient(to right, hsl(142 70% 45%), hsl(142 70% 55%))'
                          : step.id === 'nonAttributed'
                          ? 'linear-gradient(to right, hsl(38 92% 50%), hsl(38 92% 60%))'
                          : step.isManual 
                          ? 'hsl(var(--muted))' 
                          : `linear-gradient(to right, hsl(${colorSet.from}), hsl(${colorSet.to}))`,
                      }}
                    >
                      {/* Centered content */}
                      <div className="flex items-center gap-2 z-10">
                        {step.id === 'totalSales' && <ShoppingBag className="h-4 w-4 text-white" />}
                        {step.id === 'nonAttributed' && <DollarSign className="h-4 w-4 text-white" />}
                        <span className={cn(
                          "font-semibold text-sm",
                          (step.isManual && !isSpecialStep) ? "text-foreground" : "text-white"
                        )}>
                          {step.name}
                        </span>
                        {step.isManual && !isSpecialStep && (
                          <Badge variant="outline" className="text-[9px] bg-background/80">Manual</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 z-10 mt-0.5">
                        <span className={cn(
                          "font-bold text-lg tabular-nums",
                          (step.isManual && !isSpecialStep) ? "text-foreground" : "text-white"
                        )}>
                          {formatNumber(step.value)}
                        </span>
                        {step.subValue && (
                          <span className="text-white/80 text-sm">
                            ({step.subValue})
                          </span>
                        )}
                        {step.isManual && !isSpecialStep && (
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
                        {isSpecialStep && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveNonAttributedSales();
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-white" />
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

          {/* Action buttons section */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {/* Add non-attributed sales button - only for sales campaigns */}
            {isSalesCampaign && !nonAttributedSales && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSalesDialog(true)}
                className="w-full border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Agregar ventas no atribuidas por Meta
              </Button>
            )}
            
            {/* Add manual step section */}
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

      {/* Non-attributed sales dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-orange-500" />
              Ventas no atribuidas por Meta
            </DialogTitle>
            <DialogDescription>
              Agrega las ventas de tu tienda en línea que Meta no pudo rastrear. Esto te dará una visión más completa de tu ROI real.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="salesQuantity">Cantidad de ventas adicionales</Label>
              <Input
                id="salesQuantity"
                type="number"
                placeholder="Ej: 15"
                value={salesQuantity}
                onChange={(e) => setSalesQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ventas que ocurrieron pero no fueron atribuidas por el pixel de Meta
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="salesTotalAmount">Monto TOTAL de ventas en tienda</Label>
              <div className="flex gap-2">
                <Select value={salesCurrency} onValueChange={setSalesCurrency}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="salesTotalAmount"
                  type="number"
                  placeholder="Ej: 500000"
                  value={salesTotalAmount}
                  onChange={(e) => setSalesTotalAmount(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El monto maestro total de ventas reportado por tu plataforma de e-commerce
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddNonAttributedSales} disabled={!salesQuantity || !salesTotalAmount}>
              Agregar al embudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
