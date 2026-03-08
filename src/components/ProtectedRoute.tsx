import { useState, useEffect, useRef } from 'react';
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
  const { clientsLoading, selectedClient } = useBrand();
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem(SPLASH_KEY) === 'true');
  const hasUser = useRef(false);

  // Track if user just logged in (transition from no user to user)
  useEffect(() => {
    if (user && !hasUser.current) {
      hasUser.current = true;
    }
  }, [user]);

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

  // Show splash once per session while clients are loading or haven't shown splash yet
  if (!splashDone && !clientsLoading && selectedClient) {
    return (
      <SplashScreen
        onComplete={() => {
          sessionStorage.setItem(SPLASH_KEY, 'true');
          setSplashDone(true);
        }}
      />
    );
  }

  // Still loading clients, show minimal loader
  if (!splashDone && clientsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
