import { Client } from '@/pages/Clientes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';
import { PlatformConnections } from './PlatformConnections';
import { TeamMembers } from './TeamMembers';
import { AIContextEditor } from './AIContextEditor';


interface ClientDetailPanelProps {
  client: Client;
  onClose: () => void;
  onUpdate: () => void;
}

export const ClientDetailPanel = ({ client, onClose, onUpdate }: ClientDetailPanelProps) => {
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-primary-foreground font-bold"
              style={{ backgroundColor: `hsl(${client.accent_color})` }}
            >
              {client.name.charAt(0)}
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{client.name}</CardTitle>
            {client.industry && (
              <p className="text-sm text-muted-foreground">{client.industry}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Brand Colors */}
        <div>
          <h4 className="text-sm font-medium mb-2">Colores de Marca</h4>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: `hsl(${client.primary_color})` }}
              />
              <span className="text-xs text-muted-foreground">Primario</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: `hsl(${client.accent_color})` }}
              />
              <span className="text-xs text-muted-foreground">Acento</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* AI Context Editor */}
        <AIContextEditor 
          clientId={client.id} 
          initialContext={client.ai_context}
          onUpdate={onUpdate}
        />

        <Separator />

        {/* Platform Connections */}
        <PlatformConnections clientId={client.id} />

        <Separator />

        {/* Team Members */}
        <TeamMembers clientId={client.id} clientName={client.name} />

      </CardContent>
    </Card>
  );
};
