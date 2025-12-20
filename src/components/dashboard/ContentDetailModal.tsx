import { useState, useEffect } from 'react';
import { ContentPost } from '@/data/mockData';
import { ContentTag, ContentModel, ContentMetadata } from '@/hooks/use-content-metadata';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TagSelector } from './TagSelector';
import { ModelSelector } from './ModelSelector';
import { 
  Eye, Heart, MessageCircle, Share2, Bookmark, Clock, 
  ExternalLink, Calendar, Play, Film, LayoutGrid, ImageIcon,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInHours, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContentDetailModalProps {
  post: ContentPost | null;
  isOpen: boolean;
  onClose: () => void;
  tags: ContentTag[];
  models: ContentModel[];
  metadata: ContentMetadata | undefined;
  onCreateTag: (name: string, color: string) => Promise<ContentTag | null>;
  onCreateModel: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  onUpdateMetadata: (postId: string, updates: Partial<Pick<ContentMetadata, 'tag_id' | 'model_id'>>) => Promise<void>;
  onCapture48hMetrics: (postId: string, metrics: {
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

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const ContentDetailModal = ({
  post,
  isOpen,
  onClose,
  tags,
  models,
  metadata,
  onCreateTag,
  onCreateModel,
  onUpdateMetadata,
  onCapture48hMetrics,
}: ContentDetailModalProps) => {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Sync state with metadata when it changes
  useEffect(() => {
    if (metadata) {
      setSelectedTagId(metadata.tag_id);
      setSelectedModelId(metadata.model_id);
    } else {
      setSelectedTagId(null);
      setSelectedModelId(null);
    }
  }, [metadata, post?.id]);

  if (!post) return null;

  const typeInfo = typeConfig[post.type] || typeConfig.image;
  const TypeIcon = typeInfo.icon;

  const postDate = post.date ? parseISO(post.date) : new Date();
  const hoursSincePost = differenceInHours(new Date(), postDate);
  const canCapture48h = hoursSincePost >= 48 && !metadata?.first_48h_captured_at;
  const has48hMetrics = !!metadata?.first_48h_captured_at;

  const handleTagChange = async (tagId: string | null) => {
    setSelectedTagId(tagId);
    setIsSaving(true);
    await onUpdateMetadata(post.id, { tag_id: tagId });
    setIsSaving(false);
  };

  const handleModelChange = async (modelId: string | null) => {
    setSelectedModelId(modelId);
    setIsSaving(true);
    await onUpdateMetadata(post.id, { model_id: modelId });
    setIsSaving(false);
  };

  const handleCapture48hMetrics = async () => {
    setIsCapturing(true);
    await onCapture48hMetrics(post.id, {
      views: post.views,
      likes: post.likes,
      shares: (post as any).shares,
      comments: (post as any).comments,
      saves: (post as any).saves,
    });
    setIsCapturing(false);
  };

  // Get full caption from post (title is truncated version)
  const fullCaption = (post as any).caption || post.title;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs px-2 py-0.5 gap-1", typeInfo.class)}
            >
              <TypeIcon className="h-3 w-3" />
              {typeInfo.label}
            </Badge>
            <DialogTitle className="text-base font-medium">
              Detalle del Contenido
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left: Preview */}
          <div className="space-y-4">
            {/* Media Preview */}
            <div className="aspect-square rounded-lg bg-muted overflow-hidden">
              {post.thumbnailUrl || post.thumbnail ? (
                post.type === 'video' || post.type === 'reel' ? (
                  <video 
                    src={post.mediaUrl || post.thumbnailUrl || post.thumbnail}
                    poster={post.thumbnailUrl || post.thumbnail}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img 
                    src={post.thumbnailUrl || post.thumbnail} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TypeIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Permalink */}
            {post.permalink && (
              <Button variant="outline" className="w-full" asChild>
                <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver en {post.network}
                </a>
              </Button>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(postDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </span>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Descripción</p>
              <p className="text-sm whitespace-pre-wrap">{fullCaption}</p>
            </div>

            <Separator />

            {/* Current Metrics */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Métricas Actuales</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vistas</p>
                    <p className="text-sm font-medium">{formatNumber(post.views)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Me gusta</p>
                    <p className="text-sm font-medium">{formatNumber(post.likes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Comentarios</p>
                    <p className="text-sm font-medium">{formatNumber((post as any).comments)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Guardados</p>
                    <p className="text-sm font-medium">{formatNumber((post as any).saves)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* First 48h Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Métricas 48h</p>
                {canCapture48h && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCapture48hMetrics}
                    disabled={isCapturing}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isCapturing ? 'Guardando...' : 'Capturar ahora'}
                  </Button>
                )}
              </div>
              
              {has48hMetrics ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <Eye className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vistas 48h</p>
                      <p className="text-sm font-medium">{formatNumber(metadata?.first_48h_views)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <Heart className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Likes 48h</p>
                      <p className="text-sm font-medium">{formatNumber(metadata?.first_48h_likes)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Comentarios 48h</p>
                      <p className="text-sm font-medium">{formatNumber(metadata?.first_48h_comments)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <Bookmark className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Guardados 48h</p>
                      <p className="text-sm font-medium">{formatNumber(metadata?.first_48h_saves)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/30 text-center">
                  {hoursSincePost < 48 
                    ? `Disponible en ${Math.ceil(48 - hoursSincePost)} horas`
                    : 'No se han capturado métricas de las primeras 48h'
                  }
                </div>
              )}
            </div>

            <Separator />

            {/* Tag & Model Selection */}
            <div className="space-y-4">
              <TagSelector
                tags={tags}
                selectedTagId={selectedTagId}
                onSelect={handleTagChange}
                onCreate={onCreateTag}
                disabled={isSaving}
              />

              <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onSelect={handleModelChange}
                onCreate={onCreateModel}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
