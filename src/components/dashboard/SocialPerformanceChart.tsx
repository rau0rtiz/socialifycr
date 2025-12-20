import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Link2Off, Radio } from 'lucide-react';

interface SocialPerformanceChartProps {
  data: SocialMetric[];
  isLoading?: boolean;
  isLiveData?: boolean;
}

export const SocialPerformanceChart = ({ data, isLoading, isLiveData }: SocialPerformanceChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base font-medium">Rendimiento por Red Social</CardTitle>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <div className="h-[200px] md:h-[280px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base font-medium">Rendimiento por Red Social</CardTitle>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <div className="h-[200px] md:h-[280px] flex flex-col items-center justify-center text-muted-foreground">
            <Link2Off className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">Sin redes conectadas</p>
            <p className="text-xs mt-1">Conecta una red social para ver métricas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base font-medium">Rendimiento por Red Social</CardTitle>
          {isLiveData && (
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              En vivo
            </Badge>
          )}
        </div>
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
        <div className={`grid gap-2 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border ${
          data.length === 1 ? 'grid-cols-1' : 
          data.length === 2 ? 'grid-cols-2' : 
          data.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        }`}>
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
