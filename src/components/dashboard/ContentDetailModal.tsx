import { useState, useEffect } from 'react';
import { ContentPost } from '@/data/mockData';
import { ContentTag, ContentModel, ContentMetadata } from '@/hooks/use-content-metadata';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MultiTagSelector } from './MultiTagSelector';
import { MultiModelSelector } from './MultiModelSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, Heart, MessageCircle, Share2, Bookmark, Clock, 
  ExternalLink, Calendar, Play, Film, LayoutGrid, ImageIcon,
  Save, Link2, X
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
  onUpdateMetadataMultiple: (postId: string, updates: { tag_ids?: string[]; model_ids?: string[] }) => Promise<void>;
  onCapture48hMetrics: (postId: string, metrics: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    saves?: number;
  }) => Promise<void>;
  // Crosspost linking props
  allContent?: ContentPost[];
  linkedPostIds?: string[];
  onLinkPost?: (linkedPostId: string) => Promise<boolean>;
  onUnlinkPost?: (linkId: string) => Promise<boolean>;
  crosspostLinks?: Array<{ id: string; primary_post_id: string; linked_post_id: string }>;
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
  onUpdateMetadataMultiple,
  onCapture48hMetrics,
  allContent,
  linkedPostIds,
  onLinkPost,
  onUnlinkPost,
  crosspostLinks,
}: ContentDetailModalProps) => {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedLinkPostId, setSelectedLinkPostId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state with metadata when it changes
  useEffect(() => {
    if (metadata) {
      // Use multi arrays if available, fallback to single values
      setSelectedTagIds(metadata.tag_ids?.length ? metadata.tag_ids : (metadata.tag_id ? [metadata.tag_id] : []));
      setSelectedModelIds(metadata.model_ids?.length ? metadata.model_ids : (metadata.model_id ? [metadata.model_id] : []));
    } else {
      setSelectedTagIds([]);
      setSelectedModelIds([]);
    }
    setHasUnsavedChanges(false);
  }, [metadata, post?.id]);

  if (!post) return null;

  const typeInfo = typeConfig[post.type] || typeConfig.image;
  const TypeIcon = typeInfo.icon;

  const postDate = post.date ? parseISO(post.date) : new Date();
  const hoursSincePost = differenceInHours(new Date(), postDate);
  const canCapture48h = hoursSincePost >= 48 && !metadata?.first_48h_captured_at;
  const has48hMetrics = !!metadata?.first_48h_captured_at;

  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    setHasUnsavedChanges(true);
  };

  const handleModelsChange = (modelIds: string[]) => {
    setSelectedModelIds(modelIds);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateMetadataMultiple(post.id, { 
      tag_ids: selectedTagIds, 
      model_ids: selectedModelIds 
    });
    setHasUnsavedChanges(false);
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
            <div className="aspect-square rounded-lg bg-muted overflow-hidden relative group">
              {post.thumbnailUrl || post.thumbnail ? (
                <>
                  <img 
                    src={post.thumbnailUrl || post.thumbnail} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  {(post.type === 'video' || post.type === 'reel') && post.permalink && (
                    <a 
                      href={post.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-black ml-1" />
                      </div>
                    </a>
                  )}
                </>
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

            {/* Tag & Model Selection */}
            <div className="space-y-4">
              <MultiTagSelector
                tags={tags}
                selectedTagIds={selectedTagIds}
                onSelect={handleTagsChange}
                onCreate={onCreateTag}
                disabled={isSaving}
              />

              <MultiModelSelector
                models={models}
                selectedModelIds={selectedModelIds}
                onSelect={handleModelsChange}
                onCreate={onCreateModel}
                disabled={isSaving}
              />

              {/* Save button */}
              <Button 
                onClick={handleSave} 
                disabled={!hasUnsavedChanges || isSaving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar cambios' : 'Guardado'}
              </Button>
            </div>

            {/* Crosspost Linking */}
            {allContent && onLinkPost && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Vincular Crosspost
                  </p>
                  
                  {/* Linked posts */}
                  {linkedPostIds && linkedPostIds.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Posts vinculados:</p>
                      {linkedPostIds.map(linkedId => {
                        const linkedPost = allContent.find(p => p.id === linkedId);
                        if (!linkedPost) return null;
                        
                        // Find the link to get its ID for unlinking
                        const link = crosspostLinks?.find(
                          l => (l.primary_post_id === post.id && l.linked_post_id === linkedId) ||
                               (l.linked_post_id === post.id && l.primary_post_id === linkedId)
                        );
                        
                        return (
                          <div key={linkedId} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={linkedPost.thumbnailUrl || linkedPost.thumbnail} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{linkedPost.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{linkedPost.network}</p>
                            </div>
                            {link && onUnlinkPost && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => onUnlinkPost(link.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add new link */}
                  <div className="flex gap-2">
                    <Select value={selectedLinkPostId} onValueChange={setSelectedLinkPostId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar post..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allContent
                          .filter(p => 
                            p.id !== post.id && 
                            p.network !== post.network &&
                            !linkedPostIds?.includes(p.id)
                          )
                          .slice(0, 20)
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span className="capitalize text-xs text-muted-foreground">{p.network}</span>
                                <span className="truncate max-w-[150px]">{p.title}</span>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm"
                      disabled={!selectedLinkPostId}
                      onClick={async () => {
                        if (selectedLinkPostId) {
                          await onLinkPost(selectedLinkPostId);
                          setSelectedLinkPostId('');
                        }
                      }}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
