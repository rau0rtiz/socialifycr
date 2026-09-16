import { MessageSquare } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InboxPanel } from '@/components/chats/InboxPanel';
import { SettingsPanel } from '@/components/chats/SettingsPanel';
import { ConnectionsPanel } from '@/components/chats/ConnectionsPanel';
import { LabPanel } from '@/components/chats/LabPanel';
import { MetricsPanel } from '@/components/chats/MetricsPanel';
import { useMsgSettings } from '@/hooks/use-messaging';

const AgencyChats = () => {
  const { data: settings } = useMsgSettings();

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 agency-neon">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Chats</h1>
              <p className="text-xs text-muted-foreground">Bandeja de mensajes y setter de IA · uso interno</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300">
              Bot en {settings?.bot_mode ?? 'borrador'}
            </Badge>
            <Badge variant="outline" className="border-border/50 bg-background/40 text-muted-foreground">
              Envíos automáticos apagados
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="bandeja" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="bandeja">Bandeja</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
            <TabsTrigger value="conexiones">Conexiones</TabsTrigger>
            <TabsTrigger value="laboratorio">Laboratorio</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          </TabsList>
          <TabsContent value="bandeja"><InboxPanel /></TabsContent>
          <TabsContent value="configuracion"><SettingsPanel /></TabsContent>
          <TabsContent value="conexiones"><ConnectionsPanel /></TabsContent>
          <TabsContent value="laboratorio"><LabPanel /></TabsContent>
          <TabsContent value="indicadores"><MetricsPanel /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AgencyChats;
