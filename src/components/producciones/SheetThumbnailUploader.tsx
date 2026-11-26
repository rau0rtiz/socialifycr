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

const MAX_MB = 15;

/** Center-crops any image to 9:16 (max 1080x1920) and returns a JPEG. */
async function cropTo916(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('No se pudo leer la imagen'));
      i.src = url;
    });
    const W = img.naturalWidth, H = img.naturalHeight;
    const target = 9 / 16;
    let sw = W, sh = H;
    if (W / H > target) sw = Math.round(H * target); else sh = Math.round(W / target);
    const sx = Math.round((W - sw) / 2), sy = Math.round((H - sh) / 2);
    const outW = Math.min(1080, sw), outH = Math.round(outW * 16 / 9);
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo recortar la imagen'))), 'image/jpeg', 0.88),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
      const cropped = await cropTo916(file);
      const path = `${clientId}/production-sheets/${sheetId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, cropped, { upsert: true, contentType: 'image/jpeg' });
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
