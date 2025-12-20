import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { DailyMetric } from '@/data/mockData';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Radio, TrendingUp } from 'lucide-react';

interface ReachChartProps {
  data: DailyMetric[];
  accentColor?: string;
  isLoading?: boolean;
  isLiveData?: boolean;
  source?: 'instagram' | 'facebook' | 'mock';
}

export const ReachChart = ({ data, accentColor, isLoading, isLiveData, source }: ReachChartProps) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      dateFormatted: format(parseISO(item.date), 'dd MMM', { locale: es }),
    }));
  }, [data]);

  const primaryColor = accentColor ? `hsl(${accentColor})` : 'hsl(var(--primary))';
  const secondaryColor = 'hsl(var(--muted-foreground))';

  // Calculate totals for display
  const totals = useMemo(() => {
    const totalReach = data.reduce((sum, d) => sum + d.reach, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    return { reach: totalReach, impressions: totalImpressions };
  }, [data]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base font-medium">Alcance e Impresiones</CardTitle>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <div className="h-[200px] md:h-[280px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm md:text-base font-medium">Alcance e Impresiones</CardTitle>
            {isLiveData && (
              <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {source === 'instagram' ? 'Instagram' : 'Facebook'}
              </Badge>
            )}
          </div>
          {data.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" style={{ color: primaryColor }} />
                <span>{formatNumber(totals.reach)}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-6">
        <div className="h-[200px] md:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                className="text-muted-foreground"
                width={35}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatNumber(value), '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="reach" 
                name="Alcance"
                stroke={primaryColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="impressions" 
                name="Impresiones"
                stroke={secondaryColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
