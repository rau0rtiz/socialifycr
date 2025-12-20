import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ReachChartProps {
  data: DailyMetric[];
  accentColor?: string;
}

export const ReachChart = ({ data, accentColor }: ReachChartProps) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      dateFormatted: format(parseISO(item.date), 'dd MMM', { locale: es }),
    }));
  }, [data]);

  const primaryColor = accentColor ? `hsl(${accentColor})` : 'hsl(var(--primary))';
  const secondaryColor = 'hsl(var(--muted-foreground))';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base font-medium">Alcance e Impresiones</CardTitle>
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
