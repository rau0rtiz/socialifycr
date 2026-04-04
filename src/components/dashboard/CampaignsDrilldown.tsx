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
  Users,
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
  datePreset?: DatePresetKey;
  customRange?: DateRange;
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
    'Landing Page Views': 'Costo por LPV',
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
  <div className="flex items-center gap-2 p-2 md:p-3 bg-muted/50 rounded-lg min-w-0 overflow-hidden">
    <div className="p-1.5 md:p-2 bg-background rounded-md shrink-0">
      <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0 overflow-hidden">
      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-xs md:text-sm font-semibold truncate">{value}</p>
      {subValue && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{subValue}</p>}
    </div>
  </div>
);

// Campaign Row Component
// Compact grid card for campaigns overview
const CampaignGridCard = ({
  campaign,
  currency,
  onClick,
  configuredGoal,
}: {
  campaign: CampaignInsights;
  currency: string;
  onClick: () => void;
  configuredGoal?: GoalType | null;
}) => {
  const goalLabel = configuredGoal ? getGoalLabel(configuredGoal) : null;

  return (
    <div
      className="p-3 border border-border rounded-lg hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-xs leading-tight line-clamp-2 flex-1">{campaign.name}</h3>
        <Badge variant="outline" className={cn('text-[9px] shrink-0 px-1.5 py-0', statusConfig[campaign.effectiveStatus]?.class)}>
          {statusConfig[campaign.effectiveStatus]?.label || campaign.effectiveStatus}
        </Badge>
      </div>
      {goalLabel && (
        <Badge variant="secondary" className="text-[9px] mb-2 gap-0.5">
          <Target className="h-2 w-2" />
          {goalLabel}
        </Badge>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <p className="text-[9px] text-muted-foreground">Gastado</p>
          <p className="text-xs font-semibold">{formatCurrency(campaign.spend, currency)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">{campaign.resultType}</p>
          <p className="text-xs font-semibold">{formatNumber(campaign.results)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Alcance</p>
          <p className="text-xs font-semibold">{formatNumber(campaign.reach)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Costo/Resultado</p>
          <p className="text-xs font-semibold">{campaign.costPerResult > 0 ? formatCurrency(campaign.costPerResult, currency) : '-'}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">LPV</p>
          <p className="text-xs font-semibold">{formatNumber(campaign.landingPageViews)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Costo/LPV</p>
          <p className="text-xs font-semibold">{campaign.landingPageViews > 0 ? formatCurrency(campaign.spend / campaign.landingPageViews, currency) : '-'}</p>
        </div>
      </div>
    </div>
  );
};

// Full detail row used inside the campaign detail dialog
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
  // LPV is now always shown for all campaigns
  const isFollowersGoal = configuredGoal === 'followers' || campaign.resultType === 'Seguidores';
  const goalLabel = configuredGoal ? getGoalLabel(configuredGoal) : null;
  
  return (
  <div className="p-4 border border-border rounded-lg">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-medium text-sm truncate">{campaign.name}</h3>
          <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig[campaign.effectiveStatus]?.class)}>
            {statusConfig[campaign.effectiveStatus]?.label || campaign.effectiveStatus}
          </Badge>
          {goalLabel && (
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
              <Target className="h-2.5 w-2.5" />
              {goalLabel}
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

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
      <MetricCard icon={DollarSign} label="Gastado" value={formatCurrency(campaign.spend, currency)} />
      <MetricCard icon={Eye} label="Alcance" value={formatNumber(campaign.reach)} />
      <MetricCard icon={Target} label={campaign.resultType} value={formatNumber(campaign.results)} />
      <MetricCard icon={MousePointerClick} label="Clics" value={formatNumber(campaign.clicks)} />
      <MetricCard
        icon={TrendingUp}
        label={getCostPerResultLabel(campaign.resultType)}
        value={campaign.costPerResult > 0 ? formatCurrency(campaign.costPerResult, currency) : '-'}
      />
      <MetricCard
        icon={Eye}
        label="LPV"
        value={formatNumber(campaign.landingPageViews)}
        subValue={campaign.landingPageViews > 0 ? `${formatCurrency(campaign.spend / campaign.landingPageViews, currency)}/LPV` : undefined}
      />
      {isFollowersGoal && (
        <MetricCard icon={Users} label="New IG Followers" value={formatNumber(campaign.results)} />
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

export const CampaignsDrilldown = ({ clientId, hasAdAccount, datePreset: externalPreset, customRange: externalCustomRange }: CampaignsDrilldownProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignInsights | null>(null);
  const [internalPreset, setInternalPreset] = useState<DatePresetKey>('last_30d');
  const [internalCustomRange, setInternalCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const datePreset = externalPreset ?? internalPreset;
  const customRange = externalCustomRange ?? internalCustomRange;
  const hasExternalPeriod = !!externalPreset;
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

  // Dialog-based drilldown state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogViewLevel, setDialogViewLevel] = useState<'detail' | 'adsets' | 'ads'>('detail');
  const [dialogSelectedAdSet, setDialogSelectedAdSet] = useState<AdSetInsights | null>(null);

  const {
    data: adsets,
    isLoading: adsetsLoading,
  } = useAdSets(clientId, selectedCampaign?.id || null, selectedCampaign?.objective || '', datePreset, customRange);

  const {
    data: ads,
    isLoading: adsLoading,
  } = useAds(clientId, dialogSelectedAdSet?.id || null, selectedCampaign?.objective || '', datePreset, customRange);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchCampaigns();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDatePresetChange = (value: string) => {
    const preset = value as DatePresetKey;
    setInternalPreset(preset);
    if (preset !== 'custom') {
      setInternalCustomRange({ from: undefined, to: undefined });
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
    setDialogViewLevel('detail');
    setDialogSelectedAdSet(null);
    setDialogOpen(true);
  };

  const handleDialogBack = () => {
    if (dialogViewLevel === 'ads') {
      setDialogSelectedAdSet(null);
      setDialogViewLevel('adsets');
    } else if (dialogViewLevel === 'adsets') {
      setDialogViewLevel('detail');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCampaign(null);
    setDialogSelectedAdSet(null);
    setDialogViewLevel('detail');
  };

  const campaignsError2 = campaignsError;
  const currentErrorMessage = campaignsError2 instanceof Error ? campaignsError2.message : campaignsError2 ? String(campaignsError2) : '';

  const campaignGoal = selectedCampaign ? (campaignGoalsData?.goals?.[selectedCampaign.id]?.goal_type as GoalType | undefined) : undefined;
  const isPurchaseCampaign = campaignGoal === 'purchases' || selectedCampaign?.resultType === 'Compras';

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
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm md:text-base font-medium">
                  Campañas Activas
                </CardTitle>
                {hasAdAccount && !campaignsLoading && !campaignsError2 && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    En vivo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            
            {!hasExternalPeriod && (
              <>
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
                          setInternalCustomRange({ from: range?.from, to: range?.to });
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
              </>
            )}
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing || campaignsLoading}
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
        ) : campaignsError2 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No se pudieron cargar los datos de Meta Ads.</p>
            <p className="text-sm mt-1">Vuelve a conectar la cuenta publicitaria del cliente.</p>
            {currentErrorMessage && <p className="text-xs mt-2">{currentErrorMessage}</p>}
            <Button asChild variant="outline" className="mt-4">
              <Link to="/clientes">Ir a Conexiones</Link>
            </Button>
          </div>
        ) : campaignsLoading ? (
          <LoadingSkeleton />
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay campañas activas
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {campaigns.map((campaign) => (
              <CampaignGridCard
                key={campaign.id}
                campaign={campaign}
                currency={currency}
                onClick={() => handleCampaignClick(campaign)}
                configuredGoal={campaignGoalsData?.goals?.[campaign.id]?.goal_type as GoalType | undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Campaign Detail Dialog */}
    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {dialogViewLevel !== 'detail' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDialogBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-sm">
                {dialogViewLevel === 'detail' && selectedCampaign?.name}
                {dialogViewLevel === 'adsets' && 'Conjuntos de anuncios'}
                {dialogViewLevel === 'ads' && dialogSelectedAdSet?.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {dialogViewLevel === 'detail' && 'Detalle de campaña'}
                {dialogViewLevel === 'adsets' && selectedCampaign?.name}
                {dialogViewLevel === 'ads' && `${selectedCampaign?.name} → ${dialogSelectedAdSet?.name}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Detail view: full metrics + navigate to adsets */}
        {dialogViewLevel === 'detail' && selectedCampaign && clientId && (
          <div className="space-y-4">
            <CampaignRow
              campaign={selectedCampaign}
              currency={currency}
              onClick={() => setDialogViewLevel('adsets')}
              clientId={clientId}
              configuredGoal={campaignGoal}
            />
            <Button variant="outline" className="w-full text-xs" onClick={() => setDialogViewLevel('adsets')}>
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Ver conjuntos de anuncios
            </Button>
          </div>
        )}

        {/* AdSets view */}
        {dialogViewLevel === 'adsets' && (
          <div className="space-y-3">
            {adsetsLoading ? (
              <LoadingSkeleton />
            ) : !adsets || adsets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Sin conjuntos de anuncios</div>
            ) : (
              adsets.map((adset) => (
                <AdSetRow
                  key={adset.id}
                  adset={adset}
                  currency={currency}
                  onClick={() => { setDialogSelectedAdSet(adset); setDialogViewLevel('ads'); }}
                  isPurchaseGoal={isPurchaseCampaign}
                />
              ))
            )}
          </div>
        )}

        {/* Ads view */}
        {dialogViewLevel === 'ads' && (
          <div className="space-y-3">
            {adsLoading ? (
              <LoadingSkeleton />
            ) : !ads || ads.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Sin anuncios</div>
            ) : (
              ads.map((ad) => (
                <AdRow key={ad.id} ad={ad} currency={currency} isPurchaseGoal={isPurchaseCampaign} />
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
