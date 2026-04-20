import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContentPost } from '@/data/mockData';
import { Instagram, Wifi, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PodiumSkeleton, PodiumPost, EmptyPodiumSlot, displayOrder } from './TopPostsSection';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PeriodFilter = 'this_month' | 'last_30_days' | 'last_3_months' | 'all_time' | 'custom';

interface InstagramTopPostsProps {
  content: ContentPost[];
  isLoading: boolean;
  isLiveData: boolean;
  isConnected: boolean;
  onPostClick?: (post: ContentPost) => void;
}

const getDateFilter = (period: PeriodFilter): Date | null => {
  const now = new Date();
  switch (period) {
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'last_30_days':
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
    case 'last_3_months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return threeMonthsAgo;
    case 'all_time':
    case 'custom':
      return null;
  }
};

export const InstagramTopPosts = ({
  content,
  isLoading,
  isLiveData,
  isConnected,
  onPostClick,
}: InstagramTopPostsProps) => {
  const [period, setPeriod] = useState<PeriodFilter>('last_3_months');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Get top 5 Instagram posts sorted by engagement
  const topPosts = useMemo(() => {
    // IMPORTANT: Filter to only Instagram posts
    let filtered = content.filter(post => post.network === 'instagram');
    
    // Apply date filter
    if (period === 'custom') {
      // If custom is selected but no range yet, show all posts
      if (customRange?.from) {
        const from = new Date(customRange.from);
        from.setHours(0, 0, 0, 0);
        const to = customRange.to ? new Date(customRange.to) : new Date();
        to.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(post => {
          const date = new Date(post.date);
          return date >= from && date <= to;
        });
      }
      // If no range selected yet, show all posts (no filtering)
    } else if (period !== 'all_time') {
      const dateFilter = getDateFilter(period);
      if (dateFilter) {
        filtered = filtered.filter(post => new Date(post.date) >= dateFilter);
      }
    }
    // 'all_time' shows everything - no filtering needed
    
    return filtered
      .sort((a, b) => {
        const engagementA = (a.likes || 0) + (a.comments || 0) + (a.views || 0);
        const engagementB = (b.likes || 0) + (b.comments || 0) + (b.views || 0);
        return engagementB - engagementA;
      })
      .slice(0, 5);
  }, [content, period, customRange]);

  // Don't render if not connected
  if (!isConnected && !isLoading && content.length === 0) {
    return null;
  }

  const getEmptyMessage = () => {
    if (period === 'custom' && customRange?.from) return 'No hay posts en el rango seleccionado';
    if (period === 'custom') return 'Selecciona un rango de fechas';
    if (period === 'this_month') return 'No hay posts este mes';
    if (period === 'last_30_days') return 'No hay posts en los últimos 30 días';
    if (period === 'last_3_months') return 'No hay posts en los últimos 3 meses';
    return 'No hay posts';
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value as PeriodFilter);
    if (value !== 'custom') {
      setCustomRange(undefined);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <Instagram className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-base font-medium">Top Posts Instagram</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filter */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Este mes</SelectItem>
                <SelectItem value="last_30_days">30 días</SelectItem>
                <SelectItem value="last_3_months">3 meses</SelectItem>
                <SelectItem value="all_time">Todo</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Custom Date Range Picker */}
            {period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {customRange?.from ? (
                      customRange.to ? (
                        <>
                          {format(customRange.from, 'dd/MM', { locale: es })} - {format(customRange.to, 'dd/MM', { locale: es })}
                        </>
                      ) : (
                        format(customRange.from, 'dd/MM/yy', { locale: es })
                      )
                    ) : (
                      'Rango'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customRange?.from}
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    locale={es}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
            
            {isLiveData && !isLoading && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600"
              >
                <Wifi className="h-2.5 w-2.5" />
                En vivo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <PodiumSkeleton />
        ) : topPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {getEmptyMessage()}
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 pt-2 pb-2">
            {displayOrder.map((rank) => {
              const post = topPosts[rank - 1];
              if (post) {
                return <PodiumPost key={post.id} post={post} rank={rank} onClick={onPostClick} />;
              }
              return <EmptyPodiumSlot key={`empty-${rank}`} rank={rank} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
