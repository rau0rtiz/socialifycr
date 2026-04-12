import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useProfile, ProfileDialog } from './ProfileDialog';

export const AvatarPrompt = () => {
  const { data: profile, isLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !profile) return;
    if (profile.avatar_url) {
      setOpen(false);
      return;
    }

    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [profile, isLoading]);

  // Re-open prompt if profile dialog closes and still no avatar
  useEffect(() => {
    if (!profileOpen && profile && !profile.avatar_url) {
      setOpen(true);
    }
  }, [profileOpen, profile]);

  const handleAddPhoto = () => {
    setOpen(false);
    setProfileOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs text-center [&>button[class*='close']]:hidden [&>button:last-of-type]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle>¡Agrega tu foto de perfil!</DialogTitle>
            <DialogDescription>
              Tu equipo te reconocerá más fácil con una foto. Es necesario agregar una para continuar.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleAddPhoto} className="w-full">
            Agregar foto
          </Button>
        </DialogContent>
      </Dialog>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
