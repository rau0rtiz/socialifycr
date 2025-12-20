import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert as AlertType } from '@/data/mockData';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  data: AlertType[];
}

const alertConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; class: string }> = {
  warning: { icon: AlertTriangle, class: 'border-l-amber-500 bg-amber-500/5' },
  success: { icon: CheckCircle, class: 'border-l-emerald-500 bg-emerald-500/5' },
  info: { icon: Info, class: 'border-l-blue-500 bg-blue-500/5' },
};

const iconColors: Record<string, string> = {
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-blue-500',
};

export const AlertsPanel = ({ data }: AlertsPanelProps) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm md:text-base font-medium">Alertas e Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 px-3 md:px-6">
        {data.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          
          return (
            <div
              key={alert.id}
              className={cn(
                "border-l-4 rounded-r-lg p-2 md:p-3 transition-colors hover:opacity-80 cursor-pointer",
                config.class
              )}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <Icon className={cn("h-4 w-4 md:h-5 md:w-5 flex-shrink-0 mt-0.5", iconColors[alert.type])} />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">{alert.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
