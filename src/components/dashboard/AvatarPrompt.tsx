import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useProfile, ProfileDialog } from './ProfileDialog';

const DISMISSED_KEY = 'avatar-prompt-dismissed';

export const AvatarPrompt = () => {
  const { data: profile, isLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !profile) return;
    if (profile.avatar_url) return;

    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Small delay so it doesn't pop immediately on load
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [profile, isLoading]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
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
              Tu equipo te reconocerá más fácil con una foto. Solo toma un momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleAddPhoto} className="w-full">
              Agregar foto
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
              Ahora no
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
