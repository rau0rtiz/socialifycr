import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateSheet } from '@/hooks/use-production-sheets';

interface Props {
  sheetId: string;
  clientId: string;
  currentUrl: string | null;
  className?: string;
  /** compact = small overlay button used inside list cards */
  variant?: 'compact' | 'full';
}

const MAX_MB = 8;

export function SheetThumbnailUploader({
  sheetId, clientId, currentUrl, className, variant = 'full',
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const update = useUpdateSheet();

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se admiten imágenes');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen supera ${MAX_MB}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${clientId}/production-sheets/${sheetId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('content-images').getPublicUrl(path);
      await update.mutateAsync({ id: sheetId, thumbnail_url: pub.publicUrl } as any);
      toast.success('Portada actualizada');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;
    if (!confirm('¿Quitar la portada de esta hoja?')) return;
    await update.mutateAsync({ id: sheetId, thumbnail_url: null } as any);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className={className} onClick={stop}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />

      {variant === 'compact' ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="p-1.5 rounded-md bg-black/50 backdrop-blur text-white hover:bg-black/70 transition"
            title="Tomar foto"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="p-1.5 rounded-md bg-black/50 backdrop-blur text-white hover:bg-black/70 transition"
            title="Subir imagen"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-md bg-black/50 backdrop-blur text-white hover:bg-destructive transition"
              title="Quitar portada"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noeval-line bg-white text-noeval-ink text-xs hover:bg-noeval-cream transition"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noeval-line bg-white text-noeval-ink text-xs hover:bg-noeval-cream transition"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Subir imagen
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noeval-line bg-white text-destructive text-xs hover:bg-destructive/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
