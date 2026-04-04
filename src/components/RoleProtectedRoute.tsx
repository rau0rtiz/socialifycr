import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/use-user-role';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requireAgency?: boolean;
  requireManage?: boolean;
}

export const RoleProtectedRoute = ({ 
  children, 
  requireAgency = false,
  requireManage = false,
}: RoleProtectedRouteProps) => {
  const { isAgency, canManage, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Verificando permisos...</div>
      </div>
    );
  }

  if (requireManage && !canManage) {
    return <Navigate to="/" replace />;
  }

  if (requireAgency && !isAgency) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
