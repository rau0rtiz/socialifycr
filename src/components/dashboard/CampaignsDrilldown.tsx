import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  ChevronRight,
  ChevronLeft,
  Radio,
  Target,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  Image as ImageIcon,
  RefreshCw,
  CalendarIcon,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCampaigns,
  useAdSets,
  useAds,
  CampaignInsights,
  AdSetInsights,
  AdInsights,
  DatePresetKey,
  DateRange,
} from '@/hooks/use-ads-data';
import { useCampaignGoals, GoalType, useSetDefaultCampaignGoal, useSetCampaignGoal, GOAL_OPTIONS, getGoalLabel } from '@/hooks/use-campaign-goals';
import { CampaignGoalSelector } from './CampaignGoalSelector';
import { useBrand } from '@/contexts/BrandContext';
import { toast } from 'sonner';

interface CampaignsDrilldownProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

type ViewLevel = 'campaigns' | 'adsets' | 'ads';

const statusConfig: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: 'Activa', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  PAUSED: { label: 'Pausada', class: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  DELETED: { label: 'Eliminada', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  ARCHIVED: { label: 'Archivada', class: 'bg-muted text-muted-foreground border-border' },
};

const formatCurrency = (value: number, currency: string = 'USD') => {
  // Map currency codes to locale for proper formatting
  const localeMap: Record<string, string> = {
    USD: 'en-US',
    CRC: 'es-CR',
    MXN: 'es-MX',
    EUR: 'es-ES',
  };
  const locale = localeMap[currency] || 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (num: number | undefined | null) => {
  if (num == null) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Convert result type to "Costo por X" label
const getCostPerResultLabel = (resultType: string): string => {
  const labelMap: Record<string, string> = {
    'Conversaciones': 'Costo por conversación',
    'Mensajes': 'Costo por mensaje',
    'Conexiones': 'Costo por conexión',
    'Leads': 'Costo por lead',
    'Compras': 'Costo por compra',
    'Registros': 'Costo por registro',
    'Clics en enlace': 'Costo por clic',
    'Reproducciones': 'Costo por reproducción',
    'Interacciones': 'Costo por interacción',
    'Resultados': 'Costo por resultado',
  };
  return labelMap[resultType] || `Costo por ${resultType.toLowerCase()}`;
};

// Metric Card Component
const MetricCard = ({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) => (
  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
    <div className="p-2 bg-background rounded-md">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  </div>
);

// Campaign Row Component
const CampaignRow = ({ 
  campaign, 
  currency, 
  onClick,
  clientId,
  configuredGoal 
}: { 
  campaign: CampaignInsights; 
  currency: string; 
  onClick: () => void;
  clientId: string;
  configuredGoal?: GoalType | null;
}) => {
  const isPurchaseGoal = configuredGoal === 'purchases' || campaign.resultType === 'Compras';
  const goalLabel = configuredGoal ? getGoalLabel(configuredGoal) : null;
  
  return (
  <div
    className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{campaign.name}</h3>
          <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig[campaign.effectiveStatus]?.class)}>
            {statusConfig[campaign.effectiveStatus]?.label || campaign.effectiveStatus}
          </Badge>
          {goalLabel ? (
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
              <Target className="h-2.5 w-2.5" />
              {goalLabel}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] shrink-0 gap-1 border-amber-500/30 text-amber-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              Sin meta
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {campaign.dailyBudget
            ? `Presupuesto diario: ${formatCurrency(campaign.dailyBudget, currency)}`
            : campaign.lifetimeBudget
              ? `Presupuesto total: ${formatCurrency(campaign.lifetimeBudget, currency)}`
              : 'Sin presupuesto definido'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <CampaignGoalSelector 
          clientId={clientId}
          campaignId={campaign.id}
          currentGoal={configuredGoal}
        />
        <ChevronRight 
          className="h-5 w-5 text-muted-foreground shrink-0 cursor-pointer" 
          onClick={onClick}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 cursor-pointer" onClick={onClick}>
      <MetricCard icon={DollarSign} label="Gastado" value={formatCurrency(campaign.spend, currency)} />
      <MetricCard icon={Eye} label="Alcance" value={formatNumber(campaign.reach)} />
      <MetricCard icon={Target} label={campaign.resultType} value={formatNumber(campaign.results)} />
      <MetricCard icon={MousePointerClick} label="Clics" value={formatNumber(campaign.clicks)} />
      <MetricCard
        icon={TrendingUp}
        label={getCostPerResultLabel(campaign.resultType)}
        value={campaign.costPerResult > 0 ? formatCurrency(campaign.costPerResult, currency) : '-'}
      />
      {isPurchaseGoal && (
        <MetricCard icon={Eye} label="Landing Page Views" value={formatNumber(campaign.landingPageViews)} />
      )}
      {campaign.roas !== null && <MetricCard icon={TrendingUp} label="ROAS" value={`${campaign.roas.toFixed(2)}x`} />}
    </div>
  </div>
  );
};

// Mandatory Goal Assignment Dialog
const MandatoryGoalDialog = ({
  campaigns,
  clientId,
  goalsMap,
  onComplete,
}: {
  campaigns: CampaignInsights[];
  clientId: string;
  goalsMap: Record<string, { goal_type: string }>;
  onComplete: () => void;
}) => {
  const campaignsWithoutGoals = campaigns.filter(
    (c) => c.effectiveStatus === 'ACTIVE' && !goalsMap[c.id]
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | ''>('');
  const setGoalMutation = useSetCampaignGoal();
  
  const currentCampaign = campaignsWithoutGoals[currentIndex];
  
  if (!currentCampaign) return null;
  
  const handleAssign = async () => {
    if (!selectedGoal) return;
    try {
      await setGoalMutation.mutateAsync({
        clientId,
        campaignId: currentCampaign.id,
        goalType: selectedGoal as GoalType,
      });
      toast.success(`Meta asignada a "${currentCampaign.name}"`);
      setSelectedGoal('');
      if (currentIndex + 1 >= campaignsWithoutGoals.length) {
        onComplete();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch {
      toast.error('Error al asignar meta');
    }
  };
  
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Asignar meta de campaña
          </DialogTitle>
          <DialogDescription>
            La campaña <strong>"{currentCampaign.name}"</strong> no tiene una meta asignada. 
            Selecciona el objetivo principal para poder medir resultados correctamente.
            {campaignsWithoutGoals.length > 1 && (
              <span className="block mt-1 text-xs">
                Campaña {currentIndex + 1} de {campaignsWithoutGoals.length} sin meta
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <RadioGroup
          value={selectedGoal}
          onValueChange={(v) => setSelectedGoal(v as GoalType)}
          className="grid grid-cols-1 gap-2 mt-2"
        >
          {GOAL_OPTIONS.map((goal) => (
            <div
              key={goal.value}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                selectedGoal === goal.value && "border-primary bg-primary/5"
              )}
              onClick={() => setSelectedGoal(goal.value as GoalType)}
            >
              <RadioGroupItem value={goal.value} id={`goal-${goal.value}`} />
              <Label htmlFor={`goal-${goal.value}`} className="cursor-pointer flex-1 text-sm font-medium">
                {goal.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        <Button
          className="w-full mt-2"
          disabled={!selectedGoal || setGoalMutation.isPending}
          onClick={handleAssign}
        >
          {setGoalMutation.isPending ? 'Guardando...' : 'Asignar meta'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// AdSet Row Component
const AdSetRow = ({ adset, currency, onClick, isPurchaseGoal }: { adset: AdSetInsights; currency: string; onClick: () => void; isPurchaseGoal?: boolean }) => (
  <div
    className="p-4 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{adset.name}</h3>
          <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig[adset.effectiveStatus]?.class)}>
            {statusConfig[adset.effectiveStatus]?.label || adset.effectiveStatus}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {adset.dailyBudget
            ? `Presupuesto diario: ${formatCurrency(adset.dailyBudget, currency)}`
            : adset.lifetimeBudget
              ? `Presupuesto total: ${formatCurrency(adset.lifetimeBudget, currency)}`
              : 'Presupuesto a nivel de campaña'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
      <MetricCard icon={DollarSign} label="Gastado" value={formatCurrency(adset.spend, currency)} />
      <MetricCard icon={Eye} label="Alcance" value={formatNumber(adset.reach)} />
      <MetricCard icon={Target} label={adset.resultType} value={formatNumber(adset.results)} />
      <MetricCard icon={MousePointerClick} label="Clics" value={formatNumber(adset.clicks)} />
      <MetricCard
        icon={TrendingUp}
        label={getCostPerResultLabel(adset.resultType)}
        value={adset.costPerResult > 0 ? formatCurrency(adset.costPerResult, currency) : '-'}
      />
      {isPurchaseGoal && (
        <MetricCard icon={Eye} label="Landing Page Views" value={formatNumber(adset.landingPageViews)} />
      )}
    </div>
  </div>
);

// Ad Row Component
const AdRow = ({ ad, currency, isPurchaseGoal }: { ad: AdInsights; currency: string; isPurchaseGoal?: boolean }) => (
  <div className="p-4 border border-border rounded-lg">
    <div className="flex items-start gap-4 mb-3">
      {ad.thumbnailUrl ? (
        <img
          src={ad.thumbnailUrl}
          alt={ad.name}
          className="w-16 h-16 object-cover rounded-md border border-border"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{ad.name}</h3>
          <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig[ad.effectiveStatus]?.class)}>
            {statusConfig[ad.effectiveStatus]?.label || ad.effectiveStatus}
          </Badge>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
      <MetricCard icon={DollarSign} label="Gastado" value={formatCurrency(ad.spend, currency)} />
      <MetricCard icon={Eye} label="Alcance" value={formatNumber(ad.reach)} />
      <MetricCard icon={Target} label={ad.resultType} value={formatNumber(ad.results)} />
      <MetricCard icon={MousePointerClick} label="Clics" value={formatNumber(ad.clicks)} />
      <MetricCard
        icon={TrendingUp}
        label={getCostPerResultLabel(ad.resultType)}
        value={ad.costPerResult > 0 ? formatCurrency(ad.costPerResult, currency) : '-'}
      />
      {isPurchaseGoal && (
        <MetricCard icon={Eye} label="Landing Page Views" value={formatNumber(ad.landingPageViews)} />
      )}
    </div>
  </div>
);

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-4 border border-border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-16 w-full" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const datePresetLabels: Record<DatePresetKey, string> = {
  last_7d: 'Últimos 7 días',
  last_14d: 'Últimos 14 días',
  last_30d: 'Últimos 30 días',
  last_90d: 'Últimos 90 días',
  this_month: 'Este mes',
  last_month: 'Mes pasado',
  custom: 'Personalizado',
};

export const CampaignsDrilldown = ({ clientId, hasAdAccount }: CampaignsDrilldownProps) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignInsights | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSetInsights | null>(null);
  const [datePreset, setDatePreset] = useState<DatePresetKey>('last_30d');
  const [customRange, setCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(true);

  // Get selected client from context for default goal
  const { selectedClient, refetchClients } = useBrand();
  const defaultGoal = selectedClient?.default_campaign_goal as GoalType | undefined;
  
  // Fetch campaign goals for this client
  const { data: campaignGoalsData } = useCampaignGoals(clientId, defaultGoal);
  const setDefaultGoalMutation = useSetDefaultCampaignGoal();

  const {
    data: campaignsResult,
    isLoading: campaignsLoading,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useCampaigns(clientId, hasAdAccount, datePreset, customRange, campaignGoalsData);

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'MXN';

  // Detect active campaigns without assigned goals
  const activeCampaignsWithoutGoals = useMemo(() => {
    if (!campaigns.length || !campaignGoalsData) return [];
    return campaigns.filter(
      (c) => c.effectiveStatus === 'ACTIVE' && !campaignGoalsData.goals?.[c.id]
    );
  }, [campaigns, campaignGoalsData]);

  const {
    data: adsets,
    isLoading: adsetsLoading,
    error: adsetsError,
    refetch: refetchAdsets,
  } = useAdSets(clientId, selectedCampaign?.id || null, selectedCampaign?.objective || '', datePreset, customRange);

  const {
    data: ads,
    isLoading: adsLoading,
    error: adsError,
    refetch: refetchAds,
  } = useAds(clientId, selectedAdSet?.id || null, selectedCampaign?.objective || '', datePreset, customRange);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (viewLevel === 'campaigns') await refetchCampaigns();
      else if (viewLevel === 'adsets') await refetchAdsets();
      else await refetchAds();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDatePresetChange = (value: string) => {
    const preset = value as DatePresetKey;
    setDatePreset(preset);
    if (preset !== 'custom') {
      setCustomRange({ from: undefined, to: undefined });
    }
  };

  const getDateDisplayText = () => {
    if (datePreset === 'custom' && customRange.from && customRange.to) {
      return `${format(customRange.from, 'dd MMM', { locale: es })} - ${format(customRange.to, 'dd MMM', { locale: es })}`;
    }
    return datePresetLabels[datePreset];
  };

  const handleCampaignClick = (campaign: CampaignInsights) => {
    setSelectedCampaign(campaign);
    setViewLevel('adsets');
  };

  const handleAdSetClick = (adset: AdSetInsights) => {
    setSelectedAdSet(adset);
    setViewLevel('ads');
  };

  const handleBack = () => {
    if (viewLevel === 'ads') {
      setSelectedAdSet(null);
      setViewLevel('adsets');
    } else if (viewLevel === 'adsets') {
      setSelectedCampaign(null);
      setViewLevel('campaigns');
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Campañas'];
    if (selectedCampaign) parts.push(selectedCampaign.name);
    if (selectedAdSet) parts.push(selectedAdSet.name);
    return parts;
  };

  const isLoading = viewLevel === 'campaigns' ? campaignsLoading : viewLevel === 'adsets' ? adsetsLoading : adsLoading;

  const currentData = viewLevel === 'campaigns' ? campaigns : viewLevel === 'adsets' ? adsets : ads;

  const currentError = viewLevel === 'campaigns' ? campaignsError : viewLevel === 'adsets' ? adsetsError : adsError;

  const currentErrorMessage = currentError instanceof Error ? currentError.message : currentError ? String(currentError) : '';

  return (
    <>
    {showGoalDialog && !campaignsLoading && activeCampaignsWithoutGoals.length > 0 && clientId && (
      <MandatoryGoalDialog
        campaigns={campaigns}
        clientId={clientId}
        goalsMap={campaignGoalsData?.goals || {}}
        onComplete={() => setShowGoalDialog(false)}
      />
    )}
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {viewLevel !== 'campaigns' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm md:text-base font-medium">
                  {viewLevel === 'campaigns'
                    ? 'Campañas Activas'
                    : viewLevel === 'adsets'
                      ? 'Conjuntos de Anuncios'
                      : 'Anuncios'}
                </CardTitle>
                {hasAdAccount && !isLoading && !currentError && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    En vivo
                  </Badge>
                )}
              </div>
              {viewLevel !== 'campaigns' && (
                <p className="text-xs text-muted-foreground mt-0.5">{getBreadcrumb().join(' → ')}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {viewLevel === 'campaigns' && clientId && (
              <Select 
                value={defaultGoal || '_none'} 
                onValueChange={(value) => {
                  const goalValue = value === '_none' ? null : value as GoalType;
                  setDefaultGoalMutation.mutate({ clientId, goalType: goalValue }, {
                    onSuccess: () => refetchClients()
                  });
                }}
              >
                <SelectTrigger className="w-36 md:w-44 bg-background h-8 text-xs md:text-sm">
                  <Target className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Meta por defecto" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="_none">Sin meta por defecto</SelectItem>
                  {GOAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="w-36 md:w-44 bg-background h-8 text-xs md:text-sm">
                <SelectValue>{getDateDisplayText()}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {Object.entries(datePresetLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {datePreset === 'custom' && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs md:text-sm gap-1",
                      !customRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customRange.from && customRange.to
                      ? `${format(customRange.from, 'dd/MM/yy')} - ${format(customRange.to, 'dd/MM/yy')}`
                      : 'Seleccionar fechas'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange.from ? { from: customRange.from, to: customRange.to } : undefined}
                    onSelect={(range) => {
                      setCustomRange({ from: range?.from, to: range?.to });
                      if (range?.from && range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            )}
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {!hasAdAccount ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay cuenta de anuncios conectada</p>
            <p className="text-sm mt-1">Conecta una cuenta de Meta Ads para ver tus campañas</p>
          </div>
        ) : currentError ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No se pudieron cargar los datos de Meta Ads.</p>
            <p className="text-sm mt-1">Vuelve a conectar la cuenta publicitaria del cliente.</p>
            {currentErrorMessage && <p className="text-xs mt-2">{currentErrorMessage}</p>}
            <Button asChild variant="outline" className="mt-4">
              <Link to="/clientes">Ir a Conexiones</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : (viewLevel === 'campaigns' ? campaigns.length === 0 : !currentData || (currentData as any[]).length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            {viewLevel === 'campaigns' && 'No hay campañas activas'}
            {viewLevel === 'adsets' && 'No hay conjuntos de anuncios en esta campaña'}
            {viewLevel === 'ads' && 'No hay anuncios en este conjunto'}
          </div>
        ) : (
          <div className="space-y-4">
            {viewLevel === 'campaigns' && (campaigns || []).map((campaign) => (
              <CampaignRow 
                key={campaign.id} 
                campaign={campaign} 
                currency={currency} 
                onClick={() => handleCampaignClick(campaign)}
                clientId={clientId!}
                configuredGoal={campaignGoalsData?.goals?.[campaign.id]?.goal_type as GoalType | undefined}
              />
            ))}
            {viewLevel === 'adsets' && (adsets || []).map((adset) => {
              const campaignGoal = selectedCampaign ? (campaignGoalsData?.goals?.[selectedCampaign.id]?.goal_type as GoalType | undefined) : undefined;
              const isPurchase = campaignGoal === 'purchases' || selectedCampaign?.resultType === 'Compras';
              return <AdSetRow key={adset.id} adset={adset} currency={currency} onClick={() => handleAdSetClick(adset)} isPurchaseGoal={isPurchase} />;
            })}
            {viewLevel === 'ads' && (ads || []).map((ad) => {
              const campaignGoal = selectedCampaign ? (campaignGoalsData?.goals?.[selectedCampaign.id]?.goal_type as GoalType | undefined) : undefined;
              const isPurchase = campaignGoal === 'purchases' || selectedCampaign?.resultType === 'Compras';
              return <AdRow key={ad.id} ad={ad} currency={currency} isPurchaseGoal={isPurchase} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};
