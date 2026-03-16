import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Play, Film, LayoutGrid, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentPost, NetworkType } from '@/data/mockData';
import { PublicationGoalsSection } from './PublicationGoalsSection';

const typeConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  border: string;
}> = {
  reel: { label: 'Reel', icon: Play, color: 'bg-violet-500', border: 'border-violet-500' },
  video: { label: 'Video', icon: Film, color: 'bg-blue-500', border: 'border-blue-500' },
  carousel: { label: 'Carrusel', icon: LayoutGrid, color: 'bg-amber-500', border: 'border-amber-500' },
  image: { label: 'Post', icon: ImageIcon, color: 'bg-emerald-500', border: 'border-emerald-500' },
  story: { label: 'Historia', icon: Clock, color: 'bg-pink-500', border: 'border-pink-500' },
};

const platformColors: Record<NetworkType, string> = {
  instagram: 'ring-pink-500',
  youtube: 'ring-red-500',
  facebook: 'ring-blue-600',
  tiktok: 'ring-foreground',
  linkedin: 'ring-sky-600',
};

const platformIcons: Record<NetworkType, string> = {
  instagram: '📷',
  youtube: '▶️',
  facebook: '👤',
  tiktok: '🎵',
  linkedin: '💼',
};

interface ContentCalendarProps {
  content: ContentPost[];
  isLoading: boolean;
  availablePlatforms: NetworkType[];
  onPostClick: (post: ContentPost) => void;
  clientId?: string;
}

export const ContentCalendar = ({ 
  content, 
  isLoading, 
  availablePlatforms,
  onPostClick 
}: ContentCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<string>('__all__');
  const [selectedType, setSelectedType] = useState<string>('__all__');

  // Filter content by platform and type
  const filteredContent = useMemo(() => {
    return content.filter(post => {
      if (selectedPlatform !== '__all__' && post.network !== selectedPlatform) return false;
      if (selectedType !== '__all__' && post.type !== selectedType) return false;
      return true;
    });
  }, [content, selectedPlatform, selectedType]);

  // Group content by date
  const contentByDate = useMemo(() => {
    const grouped = new Map<string, ContentPost[]>();
    filteredContent.forEach(post => {
      if (!post.date) return;
      const dateKey = format(parseISO(post.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(post);
    });
    return grouped;
  }, [filteredContent]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Get unique content types from content
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    content.forEach(post => {
      if (post.type) types.add(post.type);
    });
    return Array.from(types);
  }, [content]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Calendario de Contenido</CardTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter */}
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {availablePlatforms.map(platform => (
                  <SelectItem key={platform} value={platform}>
                    {platformIcons[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {typeConfig[type]?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
              Hoy
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayContent = contentByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-[100px] p-1 rounded-lg border transition-colors",
                  isCurrentMonth ? "bg-card border-border" : "bg-muted/30 border-transparent",
                  isDayToday && "border-primary bg-primary/5"
                )}
              >
                {/* Day number */}
                <div className={cn(
                  "text-xs font-medium mb-1 px-1",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                  isDayToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>

                {/* Content thumbnails */}
                <div className="space-y-1">
                  {dayContent.slice(0, 3).map(post => {
                    const config = typeConfig[post.type || 'image'] || typeConfig.image;
                    return (
                      <button
                        key={post.id}
                        onClick={() => onPostClick(post)}
                        className={cn(
                          "w-full flex items-center gap-1.5 p-0.5 rounded transition-colors group",
                          "border-l-[3px]",
                          config.border
                        )}
                      >
                        {post.thumbnail ? (
                          <img 
                            src={post.thumbnail} 
                            alt="" 
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-white",
                            config.color
                          )}>
                            {(() => {
                              const Icon = config.icon;
                              return <Icon className="h-3.5 w-3.5" />;
                            })()}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {dayContent.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayContent.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend - content types */}
        <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 justify-center">
          {Object.entries(typeConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn("w-3 h-3 rounded-sm", config.color)} />
                <Icon className="h-3 w-3" />
                <span>{config.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
