import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/contexts/BrandContext';
import { SplashScreen } from '@/components/SplashScreen';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SPLASH_KEY = 'splash-shown-session';

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { clientsLoading, selectedClient, clientBrands } = useBrand();
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem(SPLASH_KEY) === 'true');

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, 'true');
    setSplashDone(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading clients, show minimal loader
  if (!splashDone && clientsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show splash once per session
  if (!splashDone && selectedClient) {
    const clientBrand = clientBrands[selectedClient.id];
    return (
      <SplashScreen
        client={selectedClient}
        clientLogo={clientBrand?.logoUrl}
        onComplete={handleSplashComplete}
      />
    );
  }

  return <>{children}</>;
};
