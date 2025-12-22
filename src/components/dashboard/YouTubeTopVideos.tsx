import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { YouTubeVideo } from '@/hooks/use-youtube-videos';
import { Youtube, Eye, ThumbsUp, Wifi, Play, CalendarIcon, Film, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface YouTubeTopVideosProps {
  videos: YouTubeVideo[];
  isLoading: boolean;
  isConnected: boolean;
}

type PeriodFilter = 'this_month' | 'last_30_days' | 'all_time' | 'custom';
type VideoTypeFilter = 'all' | 'videos' | 'shorts';

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const getDateFilter = (period: PeriodFilter): Date | null => {
  const now = new Date();
  switch (period) {
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'last_30_days':
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
    case 'all_time':
    case 'custom':
      return null;
  }
};

// Parse ISO 8601 duration to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// Shorts are typically under 60 seconds
const isShort = (video: YouTubeVideo): boolean => {
  const durationSeconds = parseDuration(video.duration);
  return durationSeconds > 0 && durationSeconds <= 60;
};

// Podium heights for 5 positions (left to right: 4, 2, 1, 3, 5)
const podiumConfig = {
  1: {
    height: 'h-32',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/30',
  },
  2: {
    height: 'h-28',
    bgColor: 'bg-slate-400',
    borderColor: 'border-slate-400/30',
  },
  3: {
    height: 'h-24',
    bgColor: 'bg-amber-700',
    borderColor: 'border-amber-700/30',
  },
  4: {
    height: 'h-20',
    bgColor: 'bg-slate-500',
    borderColor: 'border-slate-500/30',
  },
  5: {
    height: 'h-16',
    bgColor: 'bg-slate-600',
    borderColor: 'border-slate-600/30',
  },
};

const displayOrder = [4, 2, 1, 3, 5] as const;

const PodiumSkeleton = () => (
  <div className="flex items-end justify-center gap-2">
    {displayOrder.map((rank) => (
      <div key={rank} className="flex flex-col items-center flex-1">
        <Skeleton className="w-full aspect-video rounded-lg mb-2" />
        <Skeleton className={cn("w-full rounded-t-lg", podiumConfig[rank].height)} />
      </div>
    ))}
  </div>
);

const VideoPodiumPost = ({ 
  video, 
  rank,
}: { 
  video: YouTubeVideo; 
  rank: 1 | 2 | 3 | 4 | 5; 
}) => {
  const config = podiumConfig[rank];
  const engagement = video.viewCount + video.likeCount;
  const videoIsShort = isShort(video);

  const openVideo = () => {
    window.open(`https://youtube.com/watch?v=${video.id}`, '_blank');
  };

  return (
    <div 
      className="flex flex-col items-center cursor-pointer group flex-1 min-w-0"
      onClick={openVideo}
    >
      {/* Rank number at top */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2 shadow-md",
        config.bgColor
      )}>
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted mb-2 group-hover:ring-2 ring-red-500/50 transition-all">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-8 w-8 text-white fill-white" />
        </div>
        <div className="absolute top-1 left-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] px-1 py-0 gap-0.5 backdrop-blur-sm",
              videoIsShort 
                ? "bg-pink-500/10 text-pink-600 border-pink-500/20" 
                : "bg-red-500/10 text-red-600 border-red-500/20"
            )}
          >
            {videoIsShort ? <Smartphone className="h-2.5 w-2.5" /> : <Film className="h-2.5 w-2.5" />}
          </Badge>
        </div>
      </div>

      {/* Podium stand */}
      <div 
        className={cn(
          "w-full rounded-t-lg border-x border-t flex flex-col items-center justify-center",
          config.height,
          config.borderColor,
          "bg-gradient-to-t from-muted/50 to-transparent"
        )}
      >
        <p className="text-sm font-bold text-foreground">{formatNumber(engagement)}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="h-2 w-2" />
            {formatNumber(video.viewCount)}
          </span>
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="h-2 w-2" />
            {formatNumber(video.likeCount)}
          </span>
        </div>
      </div>
    </div>
  );
};

const EmptyVideoPodiumSlot = ({ rank }: { rank: 1 | 2 | 3 | 4 | 5 }) => {
  const config = podiumConfig[rank];
  
  return (
    <div className="flex flex-col items-center flex-1 min-w-0 opacity-40">
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2",
        config.bgColor
      )}>
        {rank}
      </div>
      <div className="w-full aspect-video rounded-lg bg-muted/50 mb-2 flex items-center justify-center border border-dashed border-muted-foreground/30">
        <span className="text-xs text-muted-foreground">-</span>
      </div>
      <div 
        className={cn(
          "w-full rounded-t-lg border-x border-t flex items-center justify-center",
          config.height,
          config.borderColor,
          "bg-gradient-to-t from-muted/30 to-transparent"
        )}
      >
        <span className="text-xs text-muted-foreground">-</span>
      </div>
    </div>
  );
};

export const YouTubeTopVideos = ({
  videos,
  isLoading,
  isConnected,
}: YouTubeTopVideosProps) => {
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [videoType, setVideoType] = useState<VideoTypeFilter>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Get top 5 videos sorted by views
  const topVideos = useMemo(() => {
    let filtered = [...videos];
    
    // Apply date filter
    if (period === 'custom' && customRange?.from) {
      const from = customRange.from;
      const to = customRange.to || new Date();
      filtered = filtered.filter(video => {
        const date = new Date(video.publishedAt);
        return date >= from && date <= to;
      });
    } else {
      const dateFilter = getDateFilter(period);
      if (dateFilter) {
        filtered = filtered.filter(video => new Date(video.publishedAt) >= dateFilter);
      }
    }
    
    // Apply video type filter
    if (videoType === 'shorts') {
      filtered = filtered.filter(video => isShort(video));
    } else if (videoType === 'videos') {
      filtered = filtered.filter(video => !isShort(video));
    }
    
    return filtered
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);
  }, [videos, period, videoType, customRange]);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  const getEmptyMessage = () => {
    const typeLabel = videoType === 'shorts' ? 'shorts' : videoType === 'videos' ? 'videos' : 'contenido';
    if (period === 'custom') return `No hay ${typeLabel} en el rango seleccionado`;
    if (period === 'this_month') return `No hay ${typeLabel} este mes`;
    if (period === 'last_30_days') return `No hay ${typeLabel} en los últimos 30 días`;
    return `No hay ${typeLabel}`;
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
            <div className="p-1.5 rounded-md bg-red-500">
              <Youtube className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-base font-medium">Top Videos YouTube</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Video Type Filter */}
            <Select value={videoType} onValueChange={(v) => setVideoType(v as VideoTypeFilter)}>
              <SelectTrigger className="h-7 text-xs w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="shorts">Shorts</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Period Filter */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Este mes</SelectItem>
                <SelectItem value="last_30_days">30 días</SelectItem>
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
            
            {!isLoading && (
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
        ) : topVideos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {getEmptyMessage()}
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 pt-2 pb-2">
            {displayOrder.map((rank) => {
              const video = topVideos[rank - 1];
              if (video) {
                return <VideoPodiumPost key={video.id} video={video} rank={rank} />;
              }
              return <EmptyVideoPodiumSlot key={`empty-${rank}`} rank={rank} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
