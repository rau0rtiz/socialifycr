import { lazy, Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Mail, Megaphone, FileText, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const EmailsLogContent = lazy(() => import('@/components/comunicaciones/EmailsLogContent'));
const AgencyLeadsContent = lazy(() => import('@/components/comunicaciones/AgencyLeadsContent'));
const EmailTemplatesContent = lazy(() => import('@/components/comunicaciones/EmailTemplatesContent'));

const Loader = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const Comunicaciones = () => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] }),
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] }),
      queryClient.invalidateQueries({ queryKey: ['funnel-lead-counts'] }),
      queryClient.invalidateQueries({ queryKey: ['funnels'] }),
      queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
    ]);
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Comunicaciones
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestión de correos y leads del funnel
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>

        <Tabs defaultValue="emails">
          <TabsList>
            <TabsTrigger value="emails" className="gap-1.5">
              <Mail className="h-4 w-4" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="plantillas" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Plantillas
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

          <TabsContent value="plantillas">
            <Suspense fallback={<Loader />}>
              <EmailTemplatesContent />
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
