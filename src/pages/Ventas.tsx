import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
import { useBrand } from '@/contexts/BrandContext';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const Ventas = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const { isClient, clientAccess, loading: roleLoading } = useUserRole();

  if (clientsLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Selecciona un cliente</CardTitle>
              <CardDescription>
                Selecciona un cliente del menú superior para ver sus ventas.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-semibold text-foreground mb-4">
          Ventas
        </h1>
        <SalesTrackingSection clientId={selectedClient.id} campaigns={[]} />
      </div>
    </DashboardLayout>
  );
};

export default Ventas;
