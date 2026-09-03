import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // No initial loading screen — render nothing while auth resolves to avoid flash.
  if (loading) return null;

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const target = next && next !== '/' ? `/auth?next=${encodeURIComponent(next)}` : '/auth';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
