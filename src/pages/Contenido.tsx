import { useState, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { useContentData } from '@/hooks/use-content-data';
import { useContentMetadata } from '@/hooks/use-content-metadata';
import { useCrosspostLinks } from '@/hooks/use-crosspost-links';
import { useVideoIdeas } from '@/hooks/use-video-ideas';
import { useMetaConnection } from '@/hooks/use-meta-api';
import { useUserRole } from '@/hooks/use-user-role';
import { ContentDetailModal } from '@/components/dashboard/ContentDetailModal';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { VideoIdeasSection } from '@/components/dashboard/VideoIdeasSection';
import { CompetitorsPanel } from '@/components/dashboard/CompetitorsPanel';
import { ContentPost, NetworkType } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  ArrowLeft, Calendar as CalendarIcon, Eye, Heart, Play, Film, 
  LayoutGrid, ImageIcon, Clock, Search, RefreshCw, Wifi, X, Filter,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { DateRange } from 'react-day-picker';

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

const platformConfig: Record<NetworkType, { 
  label: string; 
  class: string;
  icon: string;
}> = {
  instagram: { 
    label: 'Instagram', 
    class: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-600 border-pink-500/30',
    icon: '📷'
  },
  youtube: { 
    label: 'YouTube', 
    class: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: '▶️'
  },
  facebook: { 
    label: 'Facebook', 
    class: 'bg-blue-600/10 text-blue-600 border-blue-600/20',
    icon: '👤'
  },
  tiktok: { 
    label: 'TikTok', 
    class: 'bg-slate-900/10 text-slate-700 border-slate-500/20 dark:bg-slate-100/10 dark:text-slate-300',
    icon: '🎵'
  },
  linkedin: { 
    label: 'LinkedIn', 
    class: 'bg-sky-600/10 text-sky-600 border-sky-600/20',
    icon: '💼'
  },
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

// Unique storage key per client
const getStorageKey = (clientId: string) => `contenido-platforms-${clientId}`;

const Contenido = () => {
  const { selectedClient, clientBrands } = useBrand();
  const clientId = selectedClient?.id || null;
  
  const {
    content,
    isLoading: contentLoading,
    isLiveData: contentIsLive,
    availablePlatforms,
    refetch: refetchContent,
  } = useContentData(clientId, 500); // Fetch up to 500 posts for full content view

  const {
    tags,
    models,
    metadata,
    createTag,
    createModel,
    updateMetadata,
    updateMetadataMultiple,
    capture48hMetrics,
  } = useContentMetadata(clientId);

  // Crosspost links
  const {
    links: crosspostLinks,
    addLink,
    removeLink,
    getLinkedPosts,
  } = useCrosspostLinks(clientId);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('__all__');
  const [selectedTagId, setSelectedTagId] = useState<string>('__all__');
  const [selectedModelId, setSelectedModelId] = useState<string>('__all__');

  // Platform selection (multi-select with localStorage persistence)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Initialize selected platforms from localStorage or default to all available
  useEffect(() => {
    if (!clientId) return;
    
    const stored = localStorage.getItem(getStorageKey(clientId));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        // Filter to only include currently available platforms
        const validPlatforms = parsed.filter(p => availablePlatforms.includes(p as NetworkType));
        if (validPlatforms.length > 0) {
          setSelectedPlatforms(validPlatforms);
          return;
        }
      } catch {
        // Invalid stored value, use default
      }
    }
    // Default to all available platforms
    if (availablePlatforms.length > 0) {
      setSelectedPlatforms(availablePlatforms as string[]);
    }
  }, [clientId, availablePlatforms]);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (!clientId || selectedPlatforms.length === 0) return;
    localStorage.setItem(getStorageKey(clientId), JSON.stringify(selectedPlatforms));
  }, [clientId, selectedPlatforms]);

  // Modal state
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get unique platforms from content
  const uniquePlatforms = useMemo(() => {
    const platforms = new Set<NetworkType>();
    content.forEach(post => {
      platforms.add(post.network);
      if (post.platforms) {
        post.platforms.forEach(p => platforms.add(p));
      }
    });
    return Array.from(platforms);
  }, [content]);

  // Filter content (without platform filter - that's handled per column)
  const filteredContent = useMemo(() => {
    return [...content]
      .filter((post) => {
        // Date range filter - works with just 'from' or both 'from' and 'to'
        if (dateRange?.from) {
          const postDate = new Date(post.date);
          // Normalize from date to start of day
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          
          // If we have a 'to' date, use it; otherwise use 'from' as both boundaries (single day)
          const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
          toDate.setHours(23, 59, 59, 999);
          
          if (postDate < fromDate || postDate > toDate) return false;
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const caption = (post.caption || post.title || '').toLowerCase();
          if (!caption.includes(query)) return false;
        }
        
        // Type filter
        if (selectedType !== '__all__' && post.type !== selectedType) return false;
        
        // Tag filter
        if (selectedTagId !== '__all__') {
          const postMetadata = metadata[post.id];
          if (!postMetadata || postMetadata.tag_id !== selectedTagId) return false;
        }
        
        // Model filter
        if (selectedModelId !== '__all__') {
          const postMetadata = metadata[post.id];
          if (!postMetadata || postMetadata.model_id !== selectedModelId) return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [content, dateRange, searchQuery, selectedType, selectedTagId, selectedModelId, metadata]);

  // Build crosspost groups map
  const crosspostGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    
    crosspostLinks.forEach(link => {
      const existingGroupPrimary = groups.get(link.primary_post_id);
      const existingGroupLinked = groups.get(link.linked_post_id);
      
      if (existingGroupPrimary && existingGroupLinked) {
        // Merge groups
        existingGroupLinked.forEach(id => {
          existingGroupPrimary.add(id);
          groups.set(id, existingGroupPrimary);
        });
      } else if (existingGroupPrimary) {
        existingGroupPrimary.add(link.linked_post_id);
        groups.set(link.linked_post_id, existingGroupPrimary);
      } else if (existingGroupLinked) {
        existingGroupLinked.add(link.primary_post_id);
        groups.set(link.primary_post_id, existingGroupLinked);
      } else {
        const newGroup = new Set([link.primary_post_id, link.linked_post_id]);
        groups.set(link.primary_post_id, newGroup);
        groups.set(link.linked_post_id, newGroup);
      }
    });
    
    return groups;
  }, [crosspostLinks]);

  // Get deduplicated content (only show one post per crosspost group)
  const deduplicatedContent = useMemo(() => {
    const seenGroups = new Set<Set<string>>();
    const result: ContentPost[] = [];
    
    filteredContent.forEach(post => {
      const group = crosspostGroups.get(post.id);
      if (group) {
        if (!seenGroups.has(group)) {
          seenGroups.add(group);
          result.push(post);
        }
      } else {
        result.push(post);
      }
    });
    
    return result;
  }, [filteredContent, crosspostGroups]);

  // Get linked platforms for a post
  const getLinkedPlatforms = useCallback((postId: string): NetworkType[] => {
    const group = crosspostGroups.get(postId);
    if (!group) return [];
    
    const platforms = new Set<NetworkType>();
    group.forEach(linkedId => {
      const linkedPost = content.find(p => p.id === linkedId);
      if (linkedPost && linkedPost.id !== postId) {
        platforms.add(linkedPost.network);
      }
    });
    
    return Array.from(platforms);
  }, [crosspostGroups, content]);

  // Group content by platform (using deduplicated content)
  const contentByPlatform = useMemo(() => {
    const grouped: Record<NetworkType, ContentPost[]> = {
      instagram: [],
      youtube: [],
      facebook: [],
      tiktok: [],
      linkedin: [],
    };
    
    deduplicatedContent.forEach(post => {
      grouped[post.network].push(post);
    });
    
    return grouped;
  }, [deduplicatedContent]);

  const handlePostClick = (post: ContentPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handlePlatformToggle = (platforms: string[]) => {
    // Ensure at least one platform is selected
    if (platforms.length > 0) {
      setSelectedPlatforms(platforms);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
    setSelectedType('__all__');
    setSelectedTagId('__all__');
    setSelectedModelId('__all__');
  };

  const hasActiveFilters = searchQuery || dateRange?.from || selectedType !== '__all__' || selectedTagId !== '__all__' || selectedModelId !== '__all__';

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Filtrar por fecha';
    if (!dateRange.to) return format(dateRange.from, 'dd MMM yyyy', { locale: es });
    return `${format(dateRange.from, 'dd MMM', { locale: es })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: es })}`;
  };

  const clientBrand = selectedClient ? clientBrands[selectedClient.id] : null;
  const accentColor = clientBrand?.accentColor || selectedClient?.accent_color || '262 83% 58%';

  const brandStyle = {
    '--client-accent': `hsl(${accentColor})`,
  } as React.CSSProperties;

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Selecciona un cliente para ver su contenido</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout style={brandStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contenido</h1>
            <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
          </div>
          {contentIsLive && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Wifi className="h-2.5 w-2.5" />
              En vivo
            </Badge>
          )}
          {/* Platform badges */}
          <div className="flex gap-1">
            {availablePlatforms.map(platform => (
              <Badge 
                key={platform}
                variant="outline" 
                className={cn("text-[9px] px-1.5", platformConfig[platform]?.class)}
              >
                {platformConfig[platform]?.icon} {platformConfig[platform]?.label}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchContent()}
          disabled={contentLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", contentLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            {/* Date Range */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 justify-start text-left font-normal text-sm",
                    dateRange?.from && "text-primary"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                  className="pointer-events-auto"
                />
                {dateRange?.from && (
                  <div className="p-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setDateRange(undefined)}
                    >
                      Limpiar fecha
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Type filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Tipo de contenido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los tipos</SelectItem>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag filter */}
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las etiquetas</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model filter */}
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los modelos</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Platform selector */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Plataformas a mostrar:</p>
        <ToggleGroup 
          type="multiple" 
          value={selectedPlatforms}
          onValueChange={handlePlatformToggle}
          className="flex flex-wrap justify-start gap-2"
        >
          {uniquePlatforms.map(platform => (
            <ToggleGroupItem 
              key={platform} 
              value={platform}
              className={cn(
                "h-8 px-3 text-xs gap-1.5 border rounded-full",
                selectedPlatforms.includes(platform) && platformConfig[platform]?.class
              )}
            >
              <span>{platformConfig[platform]?.icon}</span>
              {platformConfig[platform]?.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredContent.length} {filteredContent.length === 1 ? 'publicación' : 'publicaciones'} en {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'plataforma' : 'plataformas'}
        </p>
      </div>

      {/* Content Columns by Platform */}
      {contentLoading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedPlatforms.length, 3)}, 1fr)` }}>
          {selectedPlatforms.slice(0, 3).map(platform => (
            <div key={platform} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={cn("text-xs px-2 py-1 gap-1", platformConfig[platform as NetworkType]?.class)}>
                  <span>{platformConfig[platform as NetworkType]?.icon}</span>
                  {platformConfig[platform as NetworkType]?.label}
                </Badge>
              </div>
              {Array.from({ length: 3 }).map((_, i) => <ContentSkeleton key={i} />)}
            </div>
          ))}
        </div>
      ) : selectedPlatforms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Selecciona al menos una plataforma para ver contenido
        </div>
      ) : (
        <div 
          className="grid gap-4"
          style={{ 
            gridTemplateColumns: `repeat(${Math.min(selectedPlatforms.length, 4)}, 1fr)` 
          }}
        >
          {selectedPlatforms.map(platform => {
            const platformPosts = contentByPlatform[platform as NetworkType] || [];
            const platformInfo = platformConfig[platform as NetworkType];
            
            return (
              <div key={platform} className="space-y-3">
                {/* Platform Header */}
                <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  <Badge variant="outline" className={cn("text-xs px-2 py-1 gap-1", platformInfo?.class)}>
                    <span>{platformInfo?.icon}</span>
                    {platformInfo?.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {platformPosts.length}
                  </span>
                </div>
                
                {/* Posts Column */}
                <div className="space-y-3">
                  {platformPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      Sin contenido
                    </div>
                  ) : (
                    platformPosts.map((post) => {
                      const typeInfo = typeConfig[post.type] || typeConfig.image;
                      const TypeIcon = typeInfo.icon;
                      const postMetadata = metadata[post.id];
                      const postTag = postMetadata?.tag || tags.find(t => t.id === postMetadata?.tag_id);
                      const caption = post.caption || post.title;
                      const linkedPlatforms = getLinkedPlatforms(post.id);
                      const isLinked = linkedPlatforms.length > 0;
                      
                      return (
                        <div 
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className={cn(
                            "group relative rounded-lg border bg-muted/30 p-2 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer",
                            isLinked ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-border"
                          )}
                        >
                          {/* Linked indicator */}
                          {isLinked && (
                            <div className="absolute -top-2 -right-2 z-10">
                              <div className="bg-violet-500 text-white rounded-full p-1 shadow-md">
                                <Link2 className="h-3 w-3" />
                              </div>
                            </div>
                          )}
                          
                          {/* Thumbnail */}
                          <div className="relative aspect-square w-full rounded-md bg-muted overflow-hidden mb-2">
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
                            {/* Video/Reel indicator */}
                            {(post.type === 'video' || post.type === 'reel') && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="h-6 w-6 text-white drop-shadow-md" />
                              </div>
                            )}
                            {/* Type badge */}
                            <div className="absolute top-1 left-1">
                              <Badge 
                                variant="outline" 
                                className={cn("text-[8px] px-1 py-0 gap-0.5 backdrop-blur-sm", typeInfo.class)}
                              >
                                <TypeIcon className="h-2 w-2" />
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Content info */}
                          <div className="space-y-1">
                            {/* Linked platforms badge */}
                            {isLinked && (
                              <Badge 
                                variant="outline" 
                                className="text-[8px] px-1.5 py-0.5 gap-1 bg-violet-500/10 text-violet-600 border-violet-500/30"
                              >
                                <Link2 className="h-2 w-2" />
                                Vinculado a {linkedPlatforms.map(p => platformConfig[p]?.icon).join(' ')}
                              </Badge>
                            )}
                            
                            {/* Tags row */}
                            {postTag && (
                              <Badge 
                                variant="outline" 
                                className="text-[8px] px-1.5 py-0"
                                style={{
                                  backgroundColor: `${postTag.color}20`,
                                  color: postTag.color,
                                  borderColor: `${postTag.color}40`
                                }}
                              >
                                {postTag.name}
                              </Badge>
                            )}

                            {/* Caption */}
                            <p className="text-[10px] text-foreground leading-tight line-clamp-2">
                              {caption}
                            </p>
                            
                            {/* Metrics */}
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                              {post.views !== undefined && post.views !== null && (
                                <div className="flex items-center gap-0.5">
                                  <Eye className="h-2 w-2" />
                                  <span>{formatNumber(post.views)}</span>
                                </div>
                              )}
                              
                              {post.likes !== undefined && post.likes !== null ? (
                                <div className="flex items-center gap-0.5">
                                  <Heart className="h-2 w-2" />
                                  <span>{formatNumber(post.likes)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <Heart className="h-2 w-2" />
                                  <span>{formatNumber(post.engagement)}</span>
                                </div>
                              )}
                              
                              <span className="ml-auto text-[8px]">
                                {format(new Date(post.date), 'dd/MM', { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedPost && (
        <ContentDetailModal
          isOpen={isModalOpen}
          post={selectedPost}
          onClose={handleCloseModal}
          tags={tags}
          models={models}
          metadata={metadata[selectedPost.id]}
          onCreateTag={createTag}
          onCreateModel={createModel}
          onUpdateMetadata={updateMetadata}
          onUpdateMetadataMultiple={updateMetadataMultiple}
          onCapture48hMetrics={capture48hMetrics}
          allContent={content}
          linkedPostIds={getLinkedPosts(selectedPost.id)}
          onLinkPost={(linkedPostId) => addLink(selectedPost.id, linkedPostId)}
          onUnlinkPost={removeLink}
          crosspostLinks={crosspostLinks}
        />
      )}
    </DashboardLayout>
  );
};

export default Contenido;
