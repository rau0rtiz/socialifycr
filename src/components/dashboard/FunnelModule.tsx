import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Trash2, GripVertical, Filter } from 'lucide-react';
import { useCampaigns, CampaignInsights } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FunnelStep {
  id: string;
  name: string;
  value: number;
  isManual: boolean;
  color?: string;
}

interface FunnelModuleProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

const defaultColors = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
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

  const { data, isLoading, refetch, isFetching } = useCampaigns(clientId, hasAdAccount);

  const campaigns = data?.campaigns || [];
  const currency = data?.currency || 'USD';

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

    // Get result type from first campaign with results
    const resultType = filteredCampaigns.find(c => c.resultType)?.resultType || 'Conversiones';

    return [
      { id: 'impressions', name: 'Impresiones', value: totals.impressions, isManual: false, color: defaultColors[0] },
      { id: 'reach', name: 'Alcance', value: totals.reach, isManual: false, color: defaultColors[1] },
      { id: 'clicks', name: 'Clics', value: totals.clicks, isManual: false, color: defaultColors[2] },
      { id: 'results', name: resultType, value: totals.results, isManual: false, color: defaultColors[3] },
    ];
  }, [campaigns, selectedCampaignId]);

  // Combine auto and manual steps
  const allSteps = useMemo(() => {
    const combined = [...autoSteps, ...manualSteps];
    // Sort by value descending for proper funnel visualization
    return combined.sort((a, b) => b.value - a.value);
  }, [autoSteps, manualSteps]);

  const maxValue = allSteps.length > 0 ? Math.max(...allSteps.map(s => s.value)) : 1;

  const handleAddManualStep = () => {
    if (!newStepName.trim() || !newStepValue) return;
    
    const newStep: FunnelStep = {
      id: `manual-${Date.now()}`,
      name: newStepName.trim(),
      value: parseInt(newStepValue) || 0,
      isManual: true,
      color: defaultColors[(autoSteps.length + manualSteps.length) % defaultColors.length],
    };
    
    setManualSteps(prev => [...prev, newStep]);
    setNewStepName('');
    setNewStepValue('');
    setIsAddingStep(false);
  };

  const handleRemoveManualStep = (stepId: string) => {
    setManualSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const handleRefresh = () => {
    refetch();
  };

  // Calculate conversion rates between steps
  const getConversionRate = (currentIndex: number): string | null => {
    if (currentIndex === 0) return null;
    const prevValue = allSteps[currentIndex - 1]?.value || 0;
    const currentValue = allSteps[currentIndex]?.value || 0;
    if (prevValue === 0) return '0%';
    return `${((currentValue / prevValue) * 100).toFixed(1)}%`;
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Embudo de Conversión
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Seleccionar campaña" />
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 flex-1" />
              </div>
            ))}
          </div>
        ) : allSteps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay datos de campañas disponibles</p>
          </div>
        ) : (
          <div className="space-y-1">
            {allSteps.map((step, index) => {
              const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
              const conversionRate = getConversionRate(index);
              
              return (
                <div key={step.id} className="group relative">
                  {/* Conversion rate arrow */}
                  {conversionRate && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        ↓ {conversionRate}
                      </Badge>
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "relative flex items-center justify-between px-4 py-3 rounded-md transition-all duration-500 cursor-pointer hover:opacity-90",
                      step.isManual && "border border-dashed border-border"
                    )}
                    style={{
                      width: `${Math.max(widthPercent, 30)}%`,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      background: step.isManual 
                        ? `hsl(var(--muted))` 
                        : step.color,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {step.isManual && (
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                      )}
                      <span className={cn(
                        "font-medium text-sm",
                        step.isManual ? "text-foreground" : "text-primary-foreground"
                      )}>
                        {step.name}
                      </span>
                      {step.isManual && (
                        <Badge variant="outline" className="text-[10px]">Manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold text-sm",
                        step.isManual ? "text-foreground" : "text-primary-foreground"
                      )}>
                        {formatNumber(step.value)}
                      </span>
                      {step.isManual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveManualStep(step.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add manual step section */}
        <div className="mt-6 pt-4 border-t border-border">
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
