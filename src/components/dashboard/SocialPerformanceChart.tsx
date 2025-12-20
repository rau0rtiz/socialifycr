import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { SocialMetric } from '@/data/mockData';

interface SocialPerformanceChartProps {
  data: SocialMetric[];
}

export const SocialPerformanceChart = ({ data }: SocialPerformanceChartProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base font-medium">Rendimiento por Red Social</CardTitle>
      </CardHeader>
      <CardContent className="px-2 md:px-6">
        <div className="h-[200px] md:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis 
                dataKey="network" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                width={35}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'followers') return [`${(value / 1000).toFixed(1)}K`, 'Seguidores'];
                  return [value, name];
                }}
              />
              <Bar dataKey="followers" name="Seguidores" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with engagement */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border">
          {data.map((item) => (
            <div key={item.network} className="text-center">
              <div className="flex items-center justify-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                <div 
                  className="w-2 h-2 md:w-3 md:h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs md:text-sm font-medium text-foreground">{item.network}</span>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Eng: {item.engagement}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
