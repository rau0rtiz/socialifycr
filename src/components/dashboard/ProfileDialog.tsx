import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Simple square crop via canvas with zoom+pan
function cropToSquare(
  img: HTMLImageElement,
  zoom: number,
  panX: number, // pixels offset of image relative to container center
  panY: number
): Promise<Blob> {
  const size = 400;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';

  const { naturalWidth: nw, naturalHeight: nh } = img;
  // The visible crop square in natural-image coordinates
  const minDim = Math.min(nw, nh);
  const cropSize = minDim / zoom;

  // Center of crop in natural coords, shifted by pan
  // panX/panY are in "preview pixels" — convert to natural coords
  const previewSize = 192; // w-48 = 192px container
  const scale = (minDim * zoom) / previewSize; // natural px per preview px
  
  let cx = nw / 2 - panX * scale - cropSize / 2;
  let cy = nh / 2 - panY * scale - cropSize / 2;

  // Clamp to image bounds
  cx = Math.max(0, Math.min(nw - cropSize, cx));
  cy = Math.max(0, Math.min(nh - cropSize, cy));

  ctx.drawImage(img, cx, cy, cropSize, cropSize, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create image'))),
      'image/jpeg',
      0.9
    );
  });
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    // Direct pixel offset — user drags, image follows
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPanX(dragRef.current.startPanX + dx);
    setPanY(dragRef.current.startPanY + dy);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !user) return;
    setUploading(true);
    try {
      const blob = await cropToSquare(imgRef.current, zoom, panX, panY);
      const filePath = `avatars/${user.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(filePath);
      setAvatarUrl(publicUrl + '?t=' + Date.now());
      setCropSrc(null);
      toast.success('Foto actualizada');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl || null,
          phone: phone || null,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        toast.info('Se envió un correo de confirmación al nuevo email');
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || '?';

  // Compute CSS transform for the preview image inside the crop area
  const getPreviewStyle = (): React.CSSProperties => {
    if (!imgRef.current) return {};
    const { naturalWidth, naturalHeight } = imgRef.current;
    const isLandscape = naturalWidth >= naturalHeight;
    // Scale so the shorter side fills the container, then apply zoom
    const baseScale = isLandscape
      ? (naturalHeight > 0 ? 1 : 1)
      : (naturalWidth > 0 ? 1 : 1);
    return {
      transform: `scale(${zoom}) translate(${-panX * 30}%, ${-panY * 30}%)`,
      transformOrigin: 'center center',
      objectFit: 'cover' as const,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>Actualiza tu información personal</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cropSrc ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Arrastra para ajustar</p>
              {/* Square crop preview with circular mask */}
              <div className="flex justify-center">
                <div
                  className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary cursor-grab active:cursor-grabbing select-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{ touchAction: 'none' }}
                >
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt="Vista previa"
                    className="w-full h-full pointer-events-none"
                    draggable={false}
                    style={getPreviewStyle()}
                    onLoad={() => {
                      // Force re-render once image loads
                      setZoom(z => z);
                    }}
                  />
                </div>
              </div>
              {/* Zoom slider */}
              <div className="flex items-center gap-2 px-4">
                <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={1}
                  max={3}
                  step={0.05}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCropSrc(null)} disabled={uploading}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleCropConfirm} disabled={uploading}>
                  <Check className="h-4 w-4 mr-1" /> {uploading ? 'Subiendo...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
            </div>
          )}

          <div>
            <Label>Nombre completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <Label>Correo electrónico</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+506 8888-8888" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
