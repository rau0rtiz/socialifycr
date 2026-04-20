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

  const clientBrand = selectedClient ? clientBrands[selectedClient.id] : null;
  const showSplash = !splashDone && (clientsLoading || !!selectedClient);

  return (
    <>
      {/* Render the app underneath so it loads in parallel with the splash */}
      {children}

      {showSplash && (
        <SplashScreen
          client={selectedClient}
          clientLogo={clientBrand?.logoUrl}
          onComplete={handleSplashComplete}
        />
      )}
    </>
  );
};
