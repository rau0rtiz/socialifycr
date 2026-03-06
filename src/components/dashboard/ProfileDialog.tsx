import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedBlob(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const size = 400; // output 400x400
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';

  // Convert crop values to natural image pixels
  let sx: number, sy: number, sw: number, sh: number;
  if (crop.unit === '%') {
    sx = (crop.x / 100) * image.naturalWidth;
    sy = (crop.y / 100) * image.naturalHeight;
    sw = (crop.width / 100) * image.naturalWidth;
    sh = (crop.height / 100) * image.naturalHeight;
  } else {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    sx = (crop.x || 0) * scaleX;
    sy = (crop.y || 0) * scaleY;
    sw = (crop.width || 0) * scaleX;
    sh = (crop.height || 0) * scaleY;
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.9);
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || user?.email || '');
      setPhone((profile as any).phone || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
    imgRef.current = e.currentTarget;
  }, []);

  const handleCropConfirm = async () => {
    if (!imgRef.current || !crop || !user) return;
    setUploadingAvatar(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, crop);
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
      toast.success('Imagen recortada y subida');
    } catch (err) {
      console.error('Profile image upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploadingAvatar(false);
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
        } as any)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>Actualiza tu información personal</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop UI */}
          {cropSrc ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Ajusta el recorte cuadrado</p>
              <div className="flex justify-center max-h-[300px] overflow-hidden rounded-lg border">
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    src={cropSrc}
                    onLoad={onImageLoad}
                    alt="Recortar"
                    className="max-h-[300px]"
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCropSrc(null)} disabled={uploadingAvatar}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleCropConfirm} disabled={uploadingAvatar}>
                  <Check className="h-4 w-4 mr-1" /> {uploadingAvatar ? 'Subiendo...' : 'Confirmar'}
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
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
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