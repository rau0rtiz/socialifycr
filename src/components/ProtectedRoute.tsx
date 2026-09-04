import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Internal-only gate: requires an authenticated session AND an agency system role.
 * The client portal was discontinued (see docs/PORTAL-CLIENTE-ARCHIVADO.md), so any
 * non-internal account is signed out and sent back to the login with a notice.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, signOut } = useAuth();
  const { isAgency, loading: roleLoading } = useUserRole();
  const location = useLocation();

  const notInternal = !!user && !loading && !roleLoading && !isAgency;

  useEffect(() => {
    if (notInternal) void signOut();
  }, [notInternal, signOut]);

  // No initial loading screen — render nothing while auth resolves to avoid flash.
  if (loading) return null;

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const target = next && next !== '/' ? `/auth?next=${encodeURIComponent(next)}` : '/auth';
    return <Navigate to={target} replace />;
  }

  if (roleLoading) return null;

  if (!isAgency) return <Navigate to="/auth?blocked=1" replace />;

  return <>{children}</>;
};
