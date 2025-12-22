import { Client } from '@/pages/Clientes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformConnections } from './PlatformConnections';
import { TeamMembers } from './TeamMembers';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Palette, Users, Link2, Calendar } from 'lucide-react';

interface ClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ClientDetailDialog = ({ 
  client, 
  open, 
  onOpenChange, 
  onUpdate 
}: ClientDetailDialogProps) => {
  const navigate = useNavigate();

  if (!client) return null;

  const handleViewDashboard = () => {
    onOpenChange(false);
    navigate(`/?preview=${client.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header with gradient background */}
        <div 
          className="relative p-6 pb-16"
          style={{ 
            background: `linear-gradient(135deg, hsl(${client.primary_color}) 0%, hsl(${client.accent_color}) 100%)` 
          }}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {client.logo_url ? (
                  <div className="h-16 w-16 rounded-xl bg-background/90 backdrop-blur-sm p-2 shadow-lg">
                    <img
                      src={client.logo_url}
                      alt={client.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-background/90 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-lg">
                    {client.name.charAt(0)}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-2xl font-bold text-white drop-shadow-sm">
                    {client.name}
                  </DialogTitle>
                  {client.industry && (
                    <Badge variant="secondary" className="mt-1 bg-background/20 text-white border-0 backdrop-blur-sm">
                      {client.industry}
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleViewDashboard}
                className="bg-background/20 hover:bg-background/30 text-white border-0 backdrop-blur-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Dashboard
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Content area with tabs */}
        <div className="px-6 pb-6 -mt-10 relative z-10">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Palette className="h-4 w-4" />
                <span className="text-xs font-medium">Colores</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="h-8 w-8 rounded-lg border shadow-sm"
                  style={{ backgroundColor: `hsl(${client.primary_color})` }}
                  title="Primario"
                />
                <div
                  className="h-8 w-8 rounded-lg border shadow-sm"
                  style={{ backgroundColor: `hsl(${client.accent_color})` }}
                  title="Acento"
                />
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Creado</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(client.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Link2 className="h-4 w-4" />
                <span className="text-xs font-medium">ID</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground truncate" title={client.id}>
                {client.id.slice(0, 8)}...
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="connections" className="gap-2">
                <Link2 className="h-4 w-4" />
                Conexiones
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                Equipo
              </TabsTrigger>
            </TabsList>
            
            <div className="bg-muted/30 rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <TabsContent value="connections" className="mt-0">
                <PlatformConnections clientId={client.id} />
              </TabsContent>
              
              <TabsContent value="team" className="mt-0">
                <TeamMembers clientId={client.id} clientName={client.name} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};