import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // No initial loading screen — render nothing while auth resolves to avoid flash.
  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
