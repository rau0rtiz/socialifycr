import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Megaphone, Loader2 } from 'lucide-react';

const EmailsLogContent = lazy(() => import('@/components/comunicaciones/EmailsLogContent'));
const AgencyLeadsContent = lazy(() => import('@/components/comunicaciones/AgencyLeadsContent'));

const Loader = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const Comunicaciones = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Comunicaciones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión de correos y leads del funnel
          </p>
        </div>

        <Tabs defaultValue="emails">
          <TabsList>
            <TabsTrigger value="emails" className="gap-1.5">
              <Mail className="h-4 w-4" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <Megaphone className="h-4 w-4" />
              Funnels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails">
            <Suspense fallback={<Loader />}>
              <EmailsLogContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="leads">
            <Suspense fallback={<Loader />}>
              <AgencyLeadsContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Comunicaciones;
