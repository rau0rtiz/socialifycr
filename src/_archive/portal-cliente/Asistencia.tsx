import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AttendanceTracker } from '@/components/ventas/AttendanceTracker';
import { useBrand } from '@/contexts/BrandContext';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const Asistencia = () => {
  const { selectedClient } = useBrand();

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">
                Selecciona un cliente para ver la asistencia
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AttendanceTracker clientId={selectedClient.id} />
    </DashboardLayout>
  );
};

export default Asistencia;
