import { useState } from 'react';
import { TrendingUp, TrendingDown, Settings2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';

export interface KPIItem {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline: number[];
}

interface KPISectionProps {
  kpis: KPIItem[];
  isLoading: boolean;
  isLiveData: boolean;
  accentColor?: string;
  platform: string;
  onPlatformChange: (platform: string) => void;
  selectedKPIs: string[];
  onSelectedKPIsChange: (kpis: string[]) => void;
  availablePlatforms: { id: string; name: string }[];
}

const KPICard = ({
  data,
  accentColor,
}: {
  data: KPIItem;
  accentColor?: string;
}) => {
  const isPositive = data.change >= 0;
  const maxValue = Math.max(...data.sparkline);
  const minValue = Math.min(...data.sparkline);
  const range = maxValue - minValue || 1;

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-6 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              {data.label}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {data.value}
            </p>
          </div>

          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? '+' : ''}
            {data.change}%
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">{data.changeLabel}</p>

        {/* Sparkline */}
        <div className="mt-auto h-10 flex items-end gap-0.5">
          {data.sparkline.map((value, index) => {
            const height = ((value - minValue) / range) * 100;
            return (
              <div
                key={index}
                className="flex-1 rounded-t transition-all"
                style={{
                  height: `${Math.max(height, 10)}%`,
                  backgroundColor: accentColor
                    ? `hsl(${accentColor})`
                    : 'hsl(var(--primary))',
                  opacity: 0.3 + (index / data.sparkline.length) * 0.7,
                }}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <Card className="h-full">
    <CardContent className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-32 mb-3" />
      <div className="mt-auto">
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  </Card>
);

export const KPISection = ({
  kpis,
  isLoading,
  isLiveData,
  accentColor,
  platform,
  onPlatformChange,
  selectedKPIs,
  onSelectedKPIsChange,
  availablePlatforms,
}: KPISectionProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const displayedKPIs = kpis.filter((kpi) => selectedKPIs.includes(kpi.id)).slice(0, 4);

  const toggleKPI = (kpiId: string) => {
    if (selectedKPIs.includes(kpiId)) {
      if (selectedKPIs.length > 1) {
        onSelectedKPIsChange(selectedKPIs.filter((id) => id !== kpiId));
      }
    } else {
      if (selectedKPIs.length < 4) {
        onSelectedKPIsChange([...selectedKPIs, kpiId]);
      } else {
        // Replace the last one
        onSelectedKPIsChange([...selectedKPIs.slice(0, 3), kpiId]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with platform selector and KPI configurator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            Métricas Principales
          </h2>
          {isLiveData && !isLoading && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Platform selector */}
          <Select value={platform} onValueChange={onPlatformChange}>
            <SelectTrigger className="w-32 md:w-40 bg-background text-xs md:text-sm">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availablePlatforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* KPI selector */}
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs md:text-sm">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-popover z-50" align="end">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Seleccionar KPIs</h4>
                  <p className="text-xs text-muted-foreground">
                    Elige hasta 4 métricas para mostrar
                  </p>
                </div>
                <div className="space-y-1">
                  {kpis.map((kpi) => {
                    const isSelected = selectedKPIs.includes(kpi.id);
                    return (
                      <button
                        key={kpi.id}
                        onClick={() => toggleKPI(kpi.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <span>{kpi.label}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 2x2 Grid of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} />)
          : displayedKPIs.map((kpi) => (
              <KPICard key={kpi.id} data={kpi} accentColor={accentColor} />
            ))}
        {!isLoading && displayedKPIs.length === 0 && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            <p>No hay métricas disponibles</p>
            <p className="text-sm mt-1">Conecta una plataforma para ver tus datos</p>
          </div>
        )}
      </div>
    </div>
  );
};
