import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProfileDialog, useProfile } from '@/components/dashboard/ProfileDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle } from 'lucide-react';

const ActualizarFoto = () => {
  const { data: profile, isLoading } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && profile) {
      if (!profile.avatar_url) {
        const timer = setTimeout(() => setProfileOpen(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, isLoading]);

  const hasAvatar = !!profile?.avatar_url;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {hasAvatar ? (
              <>
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">¡Ya tienes foto de perfil!</h2>
                <p className="text-muted-foreground">
                  Si deseas cambiarla, haz click en el botón de abajo.
                </p>
                <Button onClick={() => setProfileOpen(true)} variant="outline">
                  Cambiar foto
                </Button>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Actualiza tu foto de perfil</h2>
                <p className="text-muted-foreground">
                  Tu equipo te reconocerá más fácil con una foto.
                </p>
                <Button onClick={() => setProfileOpen(true)} className="w-full">
                  Agregar foto
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </DashboardLayout>
  );
};

export default ActualizarFoto;
