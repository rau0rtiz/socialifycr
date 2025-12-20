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
        <Card className="hover:shadow-md transition-shadow cursor-pointer group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{data.label}</p>
                <p className="text-2xl font-bold text-foreground">{data.value}</p>
              </div>
              
              <div 
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  isPositive 
                    ? "bg-emerald-500/10 text-emerald-600" 
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositive ? '+' : ''}{data.change}%
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-4 h-8 flex items-end gap-0.5">
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
