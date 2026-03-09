import { useState } from 'react';
import { useStories, Story } from '@/hooks/use-stories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Eye, 
  Users, 
  MessageCircle, 
  Archive, 
  Zap, 
  Play,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StoriesSectionProps {
  clientId: string;
}

export const StoriesSection = ({ clientId }: StoriesSectionProps) => {
  const { activeStories, archivedStories, isLoading, refetch } = useStories(clientId);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  const StoryCard = ({ story }: { story: Story }) => {
    const isVideo = story.mediaType === 'VIDEO';
    const timeAgo = formatDistanceToNow(parseISO(story.timestamp), { 
      addSuffix: true, 
      locale: es 
    });

    return (
      <div
        onClick={() => handleStoryClick(story)}
        className={cn(
          "relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group",
          "bg-muted border-2 transition-all hover:scale-[1.02]",
          story.isActive 
            ? "border-primary/50 ring-2 ring-primary/20" 
            : "border-border hover:border-muted-foreground/30"
        )}
      >
        {/* Thumbnail */}
        {story.thumbnailUrl || story.mediaUrl ? (
          <img
            src={story.thumbnailUrl || story.mediaUrl}
            alt="Story"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            {isVideo ? (
              <Play className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Active badge */}
        {story.isActive && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="text-[9px] gap-1 animate-pulse">
              <Zap className="h-2.5 w-2.5" />
              Activa
            </Badge>
          </div>
        )}

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[9px]">
              <Play className="h-2.5 w-2.5 mr-0.5" />
              Video
            </Badge>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
          <div className="flex items-center gap-1 text-white/80 text-[10px]">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
          <div className="flex items-center gap-2 text-white text-xs">
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {story.impressions?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {story.reach?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const StoryGrid = ({ stories, emptyMessage }: { stories: Story[]; emptyMessage: string }) => {
    if (stories.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500" />
            Historias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500" />
              Historias
              {activeStories.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 border-pink-500/20">
                  {activeStories.length} activas
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-[300px] grid-cols-2 mb-4">
              <TabsTrigger value="active" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Activas ({activeStories.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs gap-1">
                <Archive className="h-3 w-3" />
                Archivadas ({archivedStories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <StoryGrid 
                stories={activeStories} 
                emptyMessage="No hay historias activas en este momento" 
              />
            </TabsContent>

            <TabsContent value="archived">
              <ScrollArea className="max-h-[400px]">
                <StoryGrid 
                  stories={archivedStories} 
                  emptyMessage="No hay historias archivadas todavía. Se capturarán automáticamente cada 6 horas." 
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Story Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              Historia
              {selectedStory?.isActive && (
                <Badge className="bg-pink-500 text-white text-[9px]">Activa</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedStory && (
            <div className="space-y-4">
              {/* Media preview */}
              <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
                {selectedStory.mediaType === 'VIDEO' && selectedStory.mediaUrl ? (
                  <video
                    src={selectedStory.mediaUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : selectedStory.mediaUrl || selectedStory.thumbnailUrl ? (
                  <img
                    src={selectedStory.mediaUrl || selectedStory.thumbnailUrl}
                    alt="Story"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{selectedStory.impressions?.toLocaleString() || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Impresiones</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{selectedStory.reach?.toLocaleString() || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Alcance</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <MessageCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{selectedStory.replies?.toLocaleString() || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Respuestas</div>
                </div>
              </div>

              {/* Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Publicada: {format(parseISO(selectedStory.timestamp), "d MMM yyyy, HH:mm", { locale: es })}
                </div>
                {selectedStory.capturedAt && (
                  <div className="flex items-center gap-1">
                    <Archive className="h-3 w-3" />
                    Capturada: {format(parseISO(selectedStory.capturedAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </div>
                )}
              </div>

              {/* Link to Instagram */}
              {selectedStory.permalink && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={selectedStory.permalink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Ver en Instagram
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
