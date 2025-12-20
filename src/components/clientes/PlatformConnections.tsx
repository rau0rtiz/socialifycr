import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Instagram, Youtube, Linkedin, Twitter, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface PlatformConnection {
  id: string;
  platform: 'meta' | 'tiktok' | 'linkedin' | 'twitter' | 'google';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  platform_page_name: string | null;
  connected_by: string | null;
  created_at: string;
}

interface PlatformConnectionsProps {
  clientId: string;
}

const platformConfig = {
  meta: {
    name: 'Meta (Facebook/Instagram)',
    icon: Facebook,
    color: 'bg-blue-500',
  },
  tiktok: {
    name: 'TikTok',
    icon: Youtube,
    color: 'bg-black',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700',
  },
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'bg-slate-800',
  },
  google: {
    name: 'Google',
    icon: Youtube,
    color: 'bg-red-500',
  },
};

const statusConfig = {
  active: { label: 'Activo', icon: CheckCircle2, variant: 'default' as const },
  expired: { label: 'Expirado', icon: XCircle, variant: 'destructive' as const },
  revoked: { label: 'Revocado', icon: XCircle, variant: 'destructive' as const },
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const },
};

export const PlatformConnections = ({ clientId }: PlatformConnectionsProps) => {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
  }, [clientId]);

  const fetchConnections = async () => {
    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching connections:', error);
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  };

  const handleConnect = (platform: string) => {
    toast({
      title: 'Conexión OAuth',
      description: `Para conectar ${platform}, necesitas configurar las credenciales de desarrollador en Meta/TikTok/LinkedIn primero. Ve a la configuración de la plataforma.`,
    });
  };

  const connectedPlatforms = connections.map(c => c.platform);
  const availablePlatforms = Object.keys(platformConfig).filter(
    p => !connectedPlatforms.includes(p as any)
  ) as Array<keyof typeof platformConfig>;

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Conexiones de Plataformas</h4>
      
      <div className="space-y-2">
        {connections.map((connection) => {
          const config = platformConfig[connection.platform];
          const status = statusConfig[connection.status];
          const StatusIcon = status.icon;
          const PlatformIcon = config.icon;

          return (
            <div
              key={connection.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${config.color}`}>
                  <PlatformIcon className="h-3 w-3 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{config.name}</p>
                  {connection.platform_page_name && (
                    <p className="text-xs text-muted-foreground">
                      {connection.platform_page_name}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          );
        })}

        {availablePlatforms.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Conectar nueva plataforma:</p>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((platform) => {
                const config = platformConfig[platform];
                const PlatformIcon = config.icon;
                return (
                  <Button
                    key={platform}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleConnect(config.name)}
                  >
                    <PlatformIcon className="h-3 w-3" />
                    {config.name.split(' ')[0]}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {connections.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay plataformas conectadas
          </p>
        )}
      </div>
    </div>
  );
};
