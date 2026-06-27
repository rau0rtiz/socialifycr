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
  const { systemRole, canManage, loading } = useUserRole();

  if (loading) return null;

  const isSellerOnly =
    !canManage && (systemRole === 'setter' || systemRole === 'closer');

  return (
    <Suspense fallback={null}>
      {isSellerOnly ? <SellerCrm /> : <Dashboard />}
    </Suspense>
  );
};
