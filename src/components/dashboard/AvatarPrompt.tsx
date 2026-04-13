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

const DISMISSED_KEY = 'avatar_prompt_dismissed_at';

export const AvatarPrompt = () => {
  const { data: profile, isLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !profile) return;
    // Already has avatar — never show
    if (profile.avatar_url) return;

    // Check if dismissed today already
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed).toDateString();
      const today = new Date().toDateString();
      if (dismissedDate === today) return;
    }

    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [profile, isLoading]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    setOpen(false);
  };

  const handleAddPhoto = () => {
    setOpen(false);
    setProfileOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle>¡Agrega tu foto de perfil!</DialogTitle>
            <DialogDescription>
              Tu equipo te reconocerá más fácil con una foto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={handleAddPhoto} className="w-full">
              Agregar foto
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
              Ahora no
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
