import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Image, LayoutGrid, Sparkles, Loader2, Copy, Plus, Trash2, 
  Video, FileText, ExternalLink, Upload, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VideoIdea } from '@/hooks/use-video-ideas';

interface CarouselSlide {
  id: string;
  content: string;
  imageUrl?: string;
}

interface DevelopIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: VideoIdea | null;
  tags: { id: string; name: string; color: string | null }[];
  models: { id: string; name: string; photo_url: string | null }[];
  onSave: (id: string, updates: Partial<VideoIdea & {
    content_type: string;
    script: string;
    reference_video_url: string;
    post_image_url: string;
    post_description: string;
    carousel_slides: CarouselSlide[];
    generated_copy: string;
  }>) => Promise<boolean>;
  clientId: string;
}

const contentTypeConfig = {
  reel: { 
    label: 'Reel / Video', 
    icon: Play, 
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    description: 'Video corto con script y referencia'
  },
  post: { 
    label: 'Post / Imagen', 
    icon: Image, 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    description: 'Imagen con descripción'
  },
  carousel: { 
    label: 'Carrusel', 
    icon: LayoutGrid, 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'Múltiples slides de contenido'
  },
};

export const DevelopIdeaModal = ({
  isOpen,
  onClose,
  idea,
  tags,
  models,
  onSave,
  clientId,
}: DevelopIdeaModalProps) => {
  const { toast } = useToast();
  
  // Content type
  const [contentType, setContentType] = useState<'reel' | 'post' | 'carousel'>('reel');
  
  // Common fields
  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState('');
  const [modelId, setModelId] = useState('');
  
  // Reel fields
  const [script, setScript] = useState('');
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');
  
  // Post fields
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postDescription, setPostDescription] = useState('');
  
  // Carousel fields
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([
    { id: crypto.randomUUID(), content: '' }
  ]);
  
  // Copy generation
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image upload state
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);

  // Initialize from idea
  useEffect(() => {
    if (idea) {
      setTitle(idea.title || '');
      setTagId(idea.tag_id || '');
      setModelId(idea.model_id || '');
      setReferenceVideoUrl(idea.url || '');
      
      // Load extended fields from idea if they exist
      const extendedIdea = idea as any;
      if (extendedIdea.content_type) {
        setContentType(extendedIdea.content_type);
      }
      if (extendedIdea.script) {
        setScript(extendedIdea.script);
      }
      if (extendedIdea.reference_video_url) {
        setReferenceVideoUrl(extendedIdea.reference_video_url);
      }
      if (extendedIdea.post_image_url) {
        setPostImageUrl(extendedIdea.post_image_url);
      }
      if (extendedIdea.post_description) {
        setPostDescription(extendedIdea.post_description);
      }
      if (extendedIdea.carousel_slides && Array.isArray(extendedIdea.carousel_slides)) {
        setCarouselSlides(extendedIdea.carousel_slides.length > 0 
          ? extendedIdea.carousel_slides 
          : [{ id: crypto.randomUUID(), content: '' }]
        );
      }
      if (extendedIdea.generated_copy) {
        setGeneratedCopy(extendedIdea.generated_copy);
      }
    }
  }, [idea]);

  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          clientId,
          contentType,
          title,
          description: contentType === 'post' ? postDescription : idea?.description,
          script: contentType === 'reel' ? script : undefined,
          platform: idea?.platform || 'instagram',
        }
      });

      if (error) throw error;

      if (data?.copy) {
        setGeneratedCopy(data.copy);
        toast({
          title: 'Copy generado',
          description: 'El copy se generó correctamente usando IA',
        });
      }
    } catch (err) {
      console.error('Error generating copy:', err);
      toast({
        title: 'Error',
        description: 'No se pudo generar el copy',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleAddSlide = () => {
    setCarouselSlides(prev => [
      ...prev,
      { id: crypto.randomUUID(), content: '' }
    ]);
  };

  const handleRemoveSlide = (slideId: string) => {
    if (carouselSlides.length <= 1) return;
    setCarouselSlides(prev => prev.filter(s => s.id !== slideId));
  };

  const handleUpdateSlide = (slideId: string, updates: Partial<CarouselSlide>) => {
    setCarouselSlides(prev => prev.map(s => 
      s.id === slideId ? { ...s, ...updates } : s
    ));
  };

  // Image upload handler
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${clientId}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Solo se permiten archivos de imagen',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPostImage(true);
    const url = await uploadImage(file, 'posts');
    if (url) {
      setPostImageUrl(url);
      toast({
        title: 'Imagen subida',
        description: 'La imagen se subió correctamente',
      });
    }
    setIsUploadingPostImage(false);
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Solo se permiten archivos de imagen',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingSlideId(slideId);
    const url = await uploadImage(file, 'carousel');
    if (url) {
      handleUpdateSlide(slideId, { imageUrl: url });
      toast({
        title: 'Imagen subida',
        description: 'La imagen del slide se subió correctamente',
      });
    }
    setUploadingSlideId(null);
  };

  const handleSave = async () => {
    if (!idea) return;
    
    setIsSaving(true);
    
    const updates: any = {
      title,
      tag_id: tagId || null,
      model_id: modelId || null,
      content_type: contentType,
      generated_copy: generatedCopy || null,
    };

    if (contentType === 'reel') {
      updates.script = script || null;
      updates.reference_video_url = referenceVideoUrl || null;
    } else if (contentType === 'post') {
      updates.post_image_url = postImageUrl || null;
      updates.post_description = postDescription || null;
    } else if (contentType === 'carousel') {
      updates.carousel_slides = carouselSlides;
    }

    const success = await onSave(idea.id, updates);
    
    setIsSaving(false);
    
    if (success) {
      toast({
        title: 'Idea guardada',
        description: 'Los cambios se guardaron correctamente',
      });
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedCopy);
    toast({
      title: 'Copiado',
      description: 'El copy se copió al portapapeles',
    });
  };

  if (!idea) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Desarrollar Idea de Contenido
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Content Type Selection */}
            <div className="space-y-3">
              <Label>Tipo de Contenido</Label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(contentTypeConfig) as [keyof typeof contentTypeConfig, typeof contentTypeConfig.reel][]).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setContentType(key)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        contentType === key 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Título de la idea..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Etiqueta</Label>
                  <Select value={tagId || "none"} onValueChange={(val) => setTagId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin etiqueta</SelectItem>
                      {tags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: tag.color || undefined }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={modelId || "none"} onValueChange={(val) => setModelId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin modelo</SelectItem>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Content Type Specific Fields */}
            <Tabs value={contentType} className="w-full">
              {/* Reel Content */}
              <TabsContent value="reel" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Script / Guión
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Escribe el guión del video aquí...&#10;&#10;Ejemplo:&#10;[HOOK] ¿Sabías que...?&#10;[DESARROLLO] Aquí va el contenido principal...&#10;[CTA] ¡Sígueme para más!"
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video de Referencia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="https://instagram.com/reel/... o https://tiktok.com/..."
                      value={referenceVideoUrl}
                      onChange={(e) => setReferenceVideoUrl(e.target.value)}
                    />
                    {referenceVideoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(referenceVideoUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver video de referencia
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Post Content */}
              <TabsContent value="post" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Imagen del Post
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL de la imagen..."
                        value={postImageUrl}
                        onChange={(e) => setPostImageUrl(e.target.value)}
                        className="flex-1"
                      />
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePostImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isUploadingPostImage}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isUploadingPostImage}
                          className="pointer-events-none"
                        >
                          {isUploadingPostImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {postImageUrl && (
                      <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={postImageUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => setPostImageUrl('')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Descripción del Contenido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="¿De qué trata este post? Describe el mensaje o concepto..."
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Carousel Content */}
              <TabsContent value="carousel" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Slides del Carrusel
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={handleAddSlide}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Slide
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {carouselSlides.map((slide, index) => (
                      <div key={slide.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Slide {index + 1}
                          </Badge>
                          {carouselSlides.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleRemoveSlide(slide.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <Textarea
                          placeholder={`Contenido del slide ${index + 1}...`}
                          value={slide.content}
                          onChange={(e) => handleUpdateSlide(slide.id, { content: e.target.value })}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="URL de imagen (opcional)"
                            value={slide.imageUrl || ''}
                            onChange={(e) => handleUpdateSlide(slide.id, { imageUrl: e.target.value })}
                            className="flex-1"
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSlideImageUpload(e, slide.id)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={uploadingSlideId === slide.id}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={uploadingSlideId === slide.id}
                              className="pointer-events-none"
                            >
                              {uploadingSlideId === slide.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {slide.imageUrl && (
                          <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted">
                            <img 
                              src={slide.imageUrl} 
                              alt={`Slide ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-5 w-5"
                              onClick={() => handleUpdateSlide(slide.id, { imageUrl: '' })}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Copy Generation Section */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Generar Copy con IA
                  </CardTitle>
                  <Button 
                    size="sm" 
                    onClick={handleGenerateCopy}
                    disabled={isGeneratingCopy}
                  >
                    {isGeneratingCopy ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : generatedCopy ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerar
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Usa el contexto del cliente y Perplexity AI para generar un copy relevante
                </p>
              </CardHeader>
              <CardContent>
                {generatedCopy ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={generatedCopy}
                        onChange={(e) => setGeneratedCopy(e.target.value)}
                        rows={8}
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleCopyToClipboard}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Puedes editar el copy generado antes de guardar
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Haz clic en "Generar Copy" para crear un copy usando IA
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Idea'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
