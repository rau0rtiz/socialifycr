import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { ContentTag, ContentModel, ContentMetadata } from '@/hooks/use-content-metadata';
import { ContentDetailModal } from './ContentDetailModal';
import { Calendar, Clock, Eye, Heart, Play, Film, LayoutGrid, ImageIcon, RefreshCw, Wifi, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';

interface ContentGridProps {
  data: ContentPost[];
  isLoading?: boolean;
  isLiveData?: boolean;
  onRefresh?: () => void;
  dateRange?: { from: Date; to: Date } | null;
  onDateRangeChange?: (range: { from: Date; to: Date } | null) => void;
  // Metadata props
  tags?: ContentTag[];
  models?: ContentModel[];
  metadata?: Record<string, ContentMetadata>;
  onCreateTag?: (name: string, color: string) => Promise<ContentTag | null>;
  onCreateModel?: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  onUpdateMetadata?: (postId: string, updates: Partial<Pick<ContentMetadata, 'tag_id' | 'model_id'>>) => Promise<void>;
  onUpdateMetadataMultiple?: (postId: string, updates: { tag_ids?: string[]; model_ids?: string[] }) => Promise<void>;
  onCapture48hMetrics?: (postId: string, metrics: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    saves?: number;
  }) => Promise<void>;
}

const typeConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  class: string;
}> = {
  reel: { label: 'Reel', icon: Play, class: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  video: { label: 'Video', icon: Film, class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  carousel: { label: 'Carrusel', icon: LayoutGrid, class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  image: { label: 'Post', icon: ImageIcon, class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  story: { label: 'Historia', icon: Clock, class: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-600' },
  scheduled: { label: 'Programado', class: 'bg-violet-500/10 text-violet-600' },
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const ContentSkeleton = () => (
  <div className="group relative rounded-lg border border-border bg-muted/30 p-3">
    <div className="flex gap-3">
      <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  </div>
);

const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }
  return { text: text.slice(0, maxLength) + '...', isTruncated: true };
};

export const ContentGrid = ({ 
  data, 
  isLoading, 
  isLiveData, 
  onRefresh,
  dateRange,
  onDateRangeChange,
  tags = [],
  models = [],
  metadata = {},
  onCreateTag,
  onCreateModel,
  onUpdateMetadata,
  onCapture48hMetrics,
}: ContentGridProps) => {
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>(
    dateRange ? { from: dateRange.from, to: dateRange.to } : undefined
  );

  // Filter by date range using internal state, sort by date (most recent first) and limit to 6 posts (2x3 grid)
  const filteredData = [...data]
    .filter((post) => {
      if (!internalDateRange?.from || !internalDateRange?.to) return true;
      const postDate = new Date(post.date);
      // Normalize dates for proper comparison
      const fromDate = new Date(internalDateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(internalDateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return postDate >= fromDate && postDate <= toDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const handleDateSelect = (range: DateRange | undefined) => {
    setInternalDateRange(range);
    if (range?.from && range?.to && onDateRangeChange) {
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  const clearDateRange = () => {
    setInternalDateRange(undefined);
    onDateRangeChange?.(null);
  };

  const formatDateRange = () => {
    if (!internalDateRange?.from) return 'Filtrar por fecha';
    if (!internalDateRange.to) return format(internalDateRange.from, 'dd MMM yyyy', { locale: es });
    return `${format(internalDateRange.from, 'dd MMM', { locale: es })} - ${format(internalDateRange.to, 'dd MMM yyyy', { locale: es })}`;
  };

  const handlePostClick = (post: ContentPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm md:text-base font-medium">Contenido</CardTitle>
              {isLiveData && (
                <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Wifi className="h-2.5 w-2.5" />
                  En vivo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Date Range Picker */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5",
                      internalDateRange?.from && "text-primary"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span className="hidden sm:inline">{formatDateRange()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={internalDateRange?.from}
                    selected={internalDateRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                    locale={es}
                    className="pointer-events-auto"
                  />
                  {internalDateRange?.from && (
                    <div className="p-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={clearDateRange}
                      >
                        Limpiar filtro
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Ver todo button */}
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                <Link to="/contenido">
                  Ver todo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>

              {onRefresh && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {/* 2x3 Grid with horizontal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <ContentSkeleton key={i} />)
            ) : filteredData.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                No hay contenido en el rango seleccionado
              </div>
            ) : (
              filteredData.map((post) => {
                const typeInfo = typeConfig[post.type] || typeConfig.image;
                const TypeIcon = typeInfo.icon;
                const postMetadata = metadata[post.id];
                const postTag = postMetadata?.tag || tags.find(t => t.id === postMetadata?.tag_id);
                
                // Get caption for display
                const caption = post.caption || post.title;
                const { text: truncatedCaption, isTruncated } = truncateText(caption, 60);
                
                return (
                  <div 
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="group relative rounded-lg border border-border bg-muted/30 p-3 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail - Left side */}
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-md bg-muted overflow-hidden">
                        {post.thumbnailUrl || post.thumbnail ? (
                          <img 
                            src={post.thumbnailUrl || post.thumbnail} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <TypeIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {/* Type badge on thumbnail */}
                        <div className="absolute top-1 left-1">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] px-1 py-0 gap-0.5 backdrop-blur-sm",
                              typeInfo.class
                            )}
                          >
                            <TypeIcon className="h-2 w-2" />
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Content info - Right side */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Top: Tags */}
                        <div className="flex items-center gap-1 flex-wrap mb-1">
                          {postTag && (
                            <Badge 
                              variant="outline" 
                              className="text-[9px] px-1.5 py-0"
                              style={{
                                backgroundColor: `${postTag.color}20`,
                                color: postTag.color,
                                borderColor: `${postTag.color}40`
                              }}
                            >
                              {postTag.name}
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[9px] px-1 py-0", statusConfig[post.status].class)}
                          >
                            {statusConfig[post.status].label}
                          </Badge>
                        </div>

                        {/* Caption */}
                        <p className="text-xs text-foreground leading-tight line-clamp-2 mb-1">
                          {truncatedCaption}
                          {isTruncated && (
                            <span className="text-primary ml-1 font-medium">ver más</span>
                          )}
                        </p>
                        
                        {/* Metrics Row */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {post.views !== undefined && post.views !== null && (
                            <div className="flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" />
                              <span>{formatNumber(post.views)}</span>
                            </div>
                          )}
                          
                          {post.likes !== undefined && post.likes !== null ? (
                            <div className="flex items-center gap-0.5">
                              <Heart className="h-2.5 w-2.5" />
                              <span>{formatNumber(post.likes)}</span>
                            </div>
                          ) : post.engagement > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Heart className="h-2.5 w-2.5" />
                              <span>{formatNumber(post.engagement)}</span>
                            </div>
                          )}

                          <span className="text-muted-foreground/60 ml-auto">
                            {format(new Date(post.date), 'dd MMM', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <ContentDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        tags={tags}
        models={models}
        metadata={selectedPost ? metadata[selectedPost.id] : undefined}
        onCreateTag={onCreateTag || (async () => null)}
        onCreateModel={onCreateModel || (async () => null)}
        onUpdateMetadata={onUpdateMetadata || (async () => {})}
        onUpdateMetadataMultiple={onUpdateMetadataMultiple || (async () => {})}
        onCapture48hMetrics={onCapture48hMetrics || (async () => {})}
      />
    </>
  );
};
