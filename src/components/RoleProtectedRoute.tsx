import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/use-user-role';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requireAgency?: boolean;
}

export const RoleProtectedRoute = ({ 
  children, 
  requireAgency = true 
}: RoleProtectedRouteProps) => {
  const { isAgency, loading } = useUserRole();

  // Show loading state while checking role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Verificando permisos...</div>
      </div>
    );
  }

  // Redirect to dashboard if user doesn't have required role
  if (requireAgency && !isAgency) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
