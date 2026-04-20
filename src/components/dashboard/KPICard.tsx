import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { KPIData } from '@/data/mockData';

interface KPICardProps {
  data: KPIData;
  accentColor?: string;
}

export const KPICard = ({ data, accentColor }: KPICardProps) => {
  const isPositive = data.change >= 0;

  // Simple sparkline rendering
  const maxValue = Math.max(...data.sparkline);
  const minValue = Math.min(...data.sparkline);
  const range = maxValue - minValue || 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="cursor-pointer group border-t-[3px] border-t-primary/50">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 md:space-y-1 min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">{data.label}</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">{data.value}</p>
              </div>
              
              <div 
                className={cn(
                  "flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0",
                  isPositive 
                    ? "bg-emerald-500/10 text-emerald-600" 
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                )}
                {isPositive ? '+' : ''}{data.change}%
              </div>
            </div>

            {/* Sparkline - hidden on mobile for compactness */}
            <div className="mt-3 md:mt-4 h-6 md:h-8 hidden sm:flex items-end gap-0.5">
              {data.sparkline.map((value, index) => {
                const height = ((value - minValue) / range) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 rounded-t transition-all group-hover:opacity-80"
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
      </TooltipTrigger>
      <TooltipContent>
        <p>{data.changeLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
};
