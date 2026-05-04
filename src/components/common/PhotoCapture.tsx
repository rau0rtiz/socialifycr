import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoCaptureProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  /** Storage bucket folder prefix, e.g. `tissue/products/abc` */
  folder: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  );
}

export const PhotoCapture = ({ value, onChange, folder, className, size = 'md' }: PhotoCaptureProps) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const dim = size === 'sm' ? 'h-20 w-20' : size === 'lg' ? 'h-40 w-40' : 'h-28 w-28';

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagen muy grande (máx 10MB)');
      return;
    }
    setUploading(true);
    try {
      const blob = await compressImage(file).catch(() => file as any);
      const ext = 'jpg';
      const path = `${folder.replace(/\/$/, '')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('content-images').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('content-images').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Foto cargada');
    } catch (e: any) {
      console.error('PhotoCapture error', e);
      toast.error(e.message || 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(dim, 'rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden relative shrink-0')}>
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={uploading} onClick={() => cameraRef.current?.click()}>
          <Camera className="h-3.5 w-3.5" /> Cámara
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Galería
        </Button>
      </div>
    </div>
  );
};
