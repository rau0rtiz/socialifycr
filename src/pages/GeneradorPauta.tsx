import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import GeneradorPauta from '@/components/generador-pauta/GeneradorPauta';

const GeneradorPautaPage = () => (
  <DashboardLayout>
    <div className="h-full w-full overflow-hidden">
      <GeneradorPauta />
    </div>
  </DashboardLayout>
);

export default GeneradorPautaPage;
