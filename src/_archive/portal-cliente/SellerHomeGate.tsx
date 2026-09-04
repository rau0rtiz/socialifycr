import { lazy, Suspense } from 'react';
import { useUserRole } from '@/hooks/use-user-role';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const SellerCrm = lazy(() => import('@/pages/SellerCrm'));

/**
 * Decides what shows at "/" based on the user's role.
 * Setters/closers (without manager privileges) land directly in their CRM.
 * Everyone else gets the regular dashboard.
 */
export const SellerHomeGate = () => {
  const { systemRole, canManage, isAgency, clientAccess, loading } = useUserRole();

  if (loading) return null;

  const sellerSystemRole = systemRole === 'setter' || systemRole === 'closer';
  // Some users are only "closer"/"setter" at the client_team_members level (no system role).
  // Treat them as sellers too, as long as they aren't agency/managers.
  const sellerClientRole =
    !isAgency &&
    !canManage &&
    clientAccess.length > 0 &&
    clientAccess.every((a) => (a.role as string) === 'closer' || (a.role as string) === 'setter');

  const isSellerOnly = !canManage && (sellerSystemRole || sellerClientRole);

  return (
    <Suspense fallback={null}>
      {isSellerOnly ? <SellerCrm /> : <Dashboard />}
    </Suspense>
  );
};
