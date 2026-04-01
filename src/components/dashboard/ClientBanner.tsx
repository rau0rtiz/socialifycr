import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientBannerProps {
  clientId: string;
  bannerUrl: string | null;
  canEdit: boolean;
  onBannerUpdate: (url: string | null) => void;
}

export const ClientBanner = ({ clientId, bannerUrl, canEdit, onBannerUpdate }: ClientBannerProps) => {
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/banner-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ banner_url: urlWithCacheBust })
        .eq('id', clientId);

      if (updateError) throw updateError;

      onBannerUpdate(urlWithCacheBust);
      toast.success('Banner actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir banner');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ banner_url: null })
        .eq('id', clientId);

      if (error) throw error;

      onBannerUpdate(null);
      toast.success('Banner eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar banner');
    } finally {
      setUploading(false);
    }
  };

  if (!bannerUrl && !canEdit) return null;

  return (
    <div
      className={cn(
        'relative w-full rounded-xl overflow-hidden mb-4 md:mb-6 group',
        bannerUrl ? 'h-36 md:h-48' : 'h-24 md:h-32 border-2 border-dashed border-muted-foreground/20 bg-muted/30',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt="Client banner"
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay for edit controls */}
      {canEdit && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200',
            bannerUrl
              ? 'bg-black/40 opacity-0 group-hover:opacity-100'
              : 'opacity-100',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shadow-lg"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1.5" />
            )}
            {bannerUrl ? 'Cambiar banner' : 'Agregar banner'}
          </Button>

          {bannerUrl && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="shadow-lg"
            >
              <X className="h-4 w-4 mr-1.5" />
              Quitar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
