import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentPost } from '@/data/mockData';
import { ContentTag, ContentModel, ContentMetadata } from '@/hooks/use-content-metadata';
import { ContentDetailModal } from './ContentDetailModal';
import { Calendar, Clock, Eye, Heart, Play, Film, LayoutGrid, ImageIcon, RefreshCw, Wifi, Maximize2, Instagram, Youtube, Facebook, Search, X, Link2, Check, Unlink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CrosspostLink } from '@/hooks/use-crosspost-links';
import { toast } from 'sonner';

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
  // Crosspost link props
  crosspostLinks?: CrosspostLink[];
  onAddCrosspostLink?: (primaryPostId: string, linkedPostId: string) => Promise<boolean>;
  onRemoveCrosspostLink?: (linkId: string) => Promise<boolean>;
  getLinkedPosts?: (postId: string) => string[];
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
  <div className="group relative rounded-lg border border-border bg-muted/30 overflow-hidden">
    <Skeleton className="w-full aspect-[4/5]" />
    <div className="p-2 space-y-1.5">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
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
  onUpdateMetadataMultiple,
  onCapture48hMetrics,
  crosspostLinks = [],
  onAddCrosspostLink,
  onRemoveCrosspostLink,
  getLinkedPosts,
}: ContentGridProps) => {
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [dialogPlatforms, setDialogPlatforms] = useState<string[]>(['all']);
  const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>(
    dateRange ? { from: dateRange.from, to: dateRange.to } : undefined
  );
  
  // Crosspost linking state
  const [linkingMode, setLinkingMode] = useState(false);
  const [selectedForLinking, setSelectedForLinking] = useState<string[]>([]);

  // Platform config for dialog
  const platformConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
    instagram: { icon: Instagram, label: 'Instagram' },
    youtube: { icon: Youtube, label: 'YouTube' },
    facebook: { icon: Facebook, label: 'Facebook' },
    tiktok: { icon: Play, label: 'TikTok' },
  };

  // All data sorted by date
  const allSortedData = useMemo(() => 
    [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data]
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

  // Dialog filtered data - group linked posts together
  const dialogFilteredData = useMemo(() => {
    const filtered = allSortedData.filter((post) => {
      // Search filter
      const searchMatch = !dialogSearch || 
        (post.caption?.toLowerCase().includes(dialogSearch.toLowerCase()) || 
         post.title?.toLowerCase().includes(dialogSearch.toLowerCase()));
      
      // Platform filter
      const platformMatch = dialogPlatforms.includes('all') || 
        dialogPlatforms.includes(post.network?.toLowerCase() || '');
      
      return searchMatch && platformMatch;
    });
    return filtered;
  }, [allSortedData, dialogSearch, dialogPlatforms]);

  // Build crosspost groups for display
  const crosspostGroups = useMemo(() => {
    const groups: Map<string, Set<string>> = new Map();
    const postToGroup: Map<string, string> = new Map();
    
    crosspostLinks.forEach(link => {
      const existingGroupA = postToGroup.get(link.primary_post_id);
      const existingGroupB = postToGroup.get(link.linked_post_id);
      
      if (existingGroupA && existingGroupB && existingGroupA !== existingGroupB) {
        // Merge groups
        const groupA = groups.get(existingGroupA)!;
        const groupB = groups.get(existingGroupB)!;
        groupB.forEach(id => {
          groupA.add(id);
          postToGroup.set(id, existingGroupA);
        });
        groups.delete(existingGroupB);
      } else if (existingGroupA) {
        groups.get(existingGroupA)!.add(link.linked_post_id);
        postToGroup.set(link.linked_post_id, existingGroupA);
      } else if (existingGroupB) {
        groups.get(existingGroupB)!.add(link.primary_post_id);
        postToGroup.set(link.primary_post_id, existingGroupB);
      } else {
        const groupId = link.primary_post_id;
        groups.set(groupId, new Set([link.primary_post_id, link.linked_post_id]));
        postToGroup.set(link.primary_post_id, groupId);
        postToGroup.set(link.linked_post_id, groupId);
      }
    });
    
    return { groups, postToGroup };
  }, [crosspostLinks]);

  // Organize data for display - grouped vs ungrouped
  const organizedData = useMemo(() => {
    const { groups, postToGroup } = crosspostGroups;
    const processedGroupIds = new Set<string>();
    const result: { type: 'single' | 'group'; posts: ContentPost[]; groupId?: string }[] = [];
    
    dialogFilteredData.forEach(post => {
      const groupId = postToGroup.get(post.id);
      
      if (groupId && !processedGroupIds.has(groupId)) {
        const groupPostIds = groups.get(groupId);
        if (groupPostIds) {
          const groupPosts = dialogFilteredData.filter(p => groupPostIds.has(p.id));
          if (groupPosts.length > 1) {
            result.push({ type: 'group', posts: groupPosts, groupId });
            processedGroupIds.add(groupId);
            return;
          }
        }
      }
      
      if (!groupId || !processedGroupIds.has(groupId)) {
        if (!postToGroup.has(post.id) || !processedGroupIds.has(postToGroup.get(post.id)!)) {
          result.push({ type: 'single', posts: [post] });
        }
      }
    });
    
    return result;
  }, [dialogFilteredData, crosspostGroups]);

  // Get unique platforms from data
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(data.map(p => p.network?.toLowerCase()).filter(Boolean));
    return Array.from(platforms) as string[];
  }, [data]);

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
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={() => setShowAllDialog(true)}
              >
                Ver todo
                <Maximize2 className="h-3 w-3" />
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

      {/* Ver Todo Dialog */}
      <Dialog open={showAllDialog} onOpenChange={(open) => {
        setShowAllDialog(open);
        if (!open) {
          setLinkingMode(false);
          setSelectedForLinking([]);
        }
      }}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-6xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Todo el Contenido</DialogTitle>
              {onAddCrosspostLink && (
                <Button
                  variant={linkingMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    if (linkingMode && selectedForLinking.length >= 2) {
                      // Apply links
                      const [first, ...rest] = selectedForLinking;
                      Promise.all(rest.map(postId => onAddCrosspostLink(first, postId)))
                        .then(() => {
                          setLinkingMode(false);
                          setSelectedForLinking([]);
                        });
                    } else {
                      setLinkingMode(!linkingMode);
                      setSelectedForLinking([]);
                    }
                  }}
                >
                  {linkingMode ? (
                    selectedForLinking.length >= 2 ? (
                      <>
                        <Check className="h-4 w-4" />
                        Vincular ({selectedForLinking.length})
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        Cancelar
                      </>
                    )
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Vincular posts
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {linkingMode && (
              <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">
                  Selecciona 2 o más posts de diferentes plataformas para vincularlos como el mismo contenido.
                  {selectedForLinking.length > 0 && (
                    <span className="font-medium"> ({selectedForLinking.length} seleccionados)</span>
                  )}
                </p>
              </div>
            )}
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contenido..."
                  value={dialogSearch}
                  onChange={(e) => setDialogSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {dialogSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setDialogSearch('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Platform Filter */}
              <ToggleGroup 
                type="multiple" 
                value={dialogPlatforms}
                onValueChange={(value) => {
                  if (value.length === 0) {
                    setDialogPlatforms(['all']);
                  } else if (value.includes('all') && !dialogPlatforms.includes('all')) {
                    setDialogPlatforms(['all']);
                  } else {
                    setDialogPlatforms(value.filter(v => v !== 'all'));
                  }
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="all" aria-label="Todas" className="text-xs h-9 px-3">
                  Todas
                </ToggleGroupItem>
                {availablePlatforms.map((platform) => {
                  const config = platformConfig[platform];
                  if (!config) return null;
                  const PlatformIcon = config.icon;
                  return (
                    <ToggleGroupItem key={platform} value={platform} aria-label={config.label} className="text-xs h-9 px-3 gap-1.5">
                      <PlatformIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{config.label}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          </DialogHeader>
          
          {/* Content Grid */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {organizedData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontró contenido
                </div>
              ) : (
                <>
                  {/* Render grouped posts first */}
                  {organizedData.filter(item => item.type === 'group').map((item, index) => {
                    const linkForGroup = crosspostLinks.find(l => 
                      item.posts.some(p => p.id === l.primary_post_id || p.id === l.linked_post_id)
                    );
                    
                    return (
                      <div key={item.groupId || `group-${index}`} className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Contenido vinculado</span>
                          {onRemoveCrosspostLink && linkForGroup && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                const linksToRemove = crosspostLinks.filter(l =>
                                  item.posts.some(p => p.id === l.primary_post_id) &&
                                  item.posts.some(p => p.id === l.linked_post_id)
                                );
                                Promise.all(linksToRemove.map(l => onRemoveCrosspostLink(l.id)));
                              }}
                            >
                              <Unlink className="h-3 w-3 mr-1" />
                              Desvincular
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                          {item.posts.map((post) => (
                            <ContentCard
                              key={post.id}
                              post={post}
                              typeConfig={typeConfig}
                              statusConfig={statusConfig}
                              platformConfig={platformConfig}
                              metadata={metadata}
                              tags={tags}
                              truncateText={truncateText}
                              formatNumber={formatNumber}
                              onClick={() => !linkingMode && handlePostClick(post)}
                              linkingMode={linkingMode}
                              isSelected={selectedForLinking.includes(post.id)}
                              onSelect={() => {
                                if (linkingMode) {
                                  setSelectedForLinking(prev => 
                                    prev.includes(post.id) 
                                      ? prev.filter(id => id !== post.id)
                                      : [...prev, post.id]
                                  );
                                }
                              }}
                              isLinked={true}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Render ungrouped posts */}
                  {organizedData.filter(item => item.type === 'single').length > 0 && (
                    <div>
                      {organizedData.filter(item => item.type === 'group').length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-muted-foreground">Contenido sin vincular</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {organizedData.filter(item => item.type === 'single').map((item) => {
                          const post = item.posts[0];
                          return (
                            <ContentCard
                              key={post.id}
                              post={post}
                              typeConfig={typeConfig}
                              statusConfig={statusConfig}
                              platformConfig={platformConfig}
                              metadata={metadata}
                              tags={tags}
                              truncateText={truncateText}
                              formatNumber={formatNumber}
                              onClick={() => !linkingMode && handlePostClick(post)}
                              linkingMode={linkingMode}
                              isSelected={selectedForLinking.includes(post.id)}
                              onSelect={() => {
                                if (linkingMode) {
                                  setSelectedForLinking(prev => 
                                    prev.includes(post.id) 
                                      ? prev.filter(id => id !== post.id)
                                      : [...prev, post.id]
                                  );
                                }
                              }}
                              isLinked={false}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          
          {/* Footer */}
          <div className="px-6 py-3 border-t bg-muted/30 text-center text-xs text-muted-foreground">
            Mostrando {dialogFilteredData.length} de {data.length} publicaciones
            {crosspostLinks.length > 0 && (
              <span className="ml-2">• {crosspostLinks.length} vínculos</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Extracted ContentCard component for reuse
interface ContentCardProps {
  post: ContentPost;
  typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; class: string }>;
  statusConfig: Record<string, { label: string; class: string }>;
  platformConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }>;
  metadata: Record<string, ContentMetadata>;
  tags: ContentTag[];
  truncateText: (text: string, maxLength: number) => { text: string; isTruncated: boolean };
  formatNumber: (num: number) => string;
  onClick: () => void;
  linkingMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isLinked: boolean;
}

const ContentCard = ({
  post,
  typeConfig,
  statusConfig,
  platformConfig,
  metadata,
  tags,
  truncateText,
  formatNumber,
  onClick,
  linkingMode,
  isSelected,
  onSelect,
  isLinked,
}: ContentCardProps) => {
  const typeInfo = typeConfig[post.type] || typeConfig.image;
  const TypeIcon = typeInfo.icon;
  const postMetadata = metadata[post.id];
  const postTag = postMetadata?.tag || tags.find(t => t.id === postMetadata?.tag_id);
  const caption = post.caption || post.title;
  const { text: truncatedCaption, isTruncated } = truncateText(caption, 80);
  const PlatformIcon = platformConfig[post.network?.toLowerCase() || '']?.icon;
  
  return (
    <div 
      onClick={linkingMode ? onSelect : onClick}
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-all cursor-pointer",
        linkingMode && isSelected && "ring-2 ring-primary border-primary bg-primary/5",
        linkingMode && !isSelected && "hover:border-primary/50",
        !linkingMode && "hover:shadow-lg hover:border-primary/30",
        isLinked && "border-primary/30"
      )}
    >
      {linkingMode && (
        <div className={cn(
          "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10",
          isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
      
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-md bg-muted overflow-hidden">
          {post.thumbnailUrl || post.thumbnail ? (
            <img 
              src={post.thumbnailUrl || post.thumbnail} 
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TypeIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {/* Type & Platform badges */}
          <div className="absolute top-1 left-1 flex gap-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] px-1 py-0 gap-0.5 backdrop-blur-sm",
                typeInfo.class
              )}
            >
              <TypeIcon className="h-2 w-2" />
            </Badge>
            {PlatformIcon && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 backdrop-blur-sm bg-background/50">
                <PlatformIcon className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        </div>
        
        {/* Content info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Tags */}
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
          <p className="text-xs text-foreground leading-tight line-clamp-2 mb-1.5">
            {truncatedCaption}
            {isTruncated && (
              <span className="text-primary ml-1 font-medium">ver más</span>
            )}
          </p>
          
          {/* Metrics */}
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
              {format(new Date(post.date), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
