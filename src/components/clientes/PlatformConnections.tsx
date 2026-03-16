import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/use-audit-log';
import { Facebook, Instagram, Youtube, Linkedin, Twitter, Plus, CheckCircle2, XCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { MetaAccountSelector } from './MetaAccountSelector';
import { YouTubeChannelSelector } from './YouTubeChannelSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PlatformConnection {
  id: string;
  platform: 'meta' | 'tiktok' | 'linkedin' | 'twitter' | 'google' | 'youtube';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  platform_page_name: string | null;
  connected_by: string | null;
  created_at: string;
}

interface MetaAccountsData {
  pages: { id: string; name: string; access_token: string }[];
  instagramAccounts: { pageId: string; pageName: string; instagramId: string; pageAccessToken: string }[];
  adAccounts: { id: string; name: string }[];
  accessToken: string;
  tokenExpiresAt: string;
}

interface YouTubeAccountsData {
  accounts: { id: string; name: string; thumbnail?: string; subscriberCount?: string; videoCount?: string; isOwned?: boolean; type?: 'personal' | 'managed' | 'manual' }[];
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  clientId: string;
  message?: string;
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
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-500',
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
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [metaAccountsData, setMetaAccountsData] = useState<MetaAccountsData | null>(null);
  const [showYouTubeSelector, setShowYouTubeSelector] = useState(false);
  const [youtubeAccountsData, setYoutubeAccountsData] = useState<YouTubeAccountsData | null>(null);
  const [savingYouTube, setSavingYouTube] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connectionToDisconnect, setConnectionToDisconnect] = useState<PlatformConnection | null>(null);
  const [fbLoginStatus, setFbLoginStatus] = useState<'connected' | 'not_authorized' | 'unknown' | null>(null);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchConnections = useCallback(async () => {
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
  }, [clientId]);

  // Shared helper: given a short-lived token, fetch accounts from backend
  const fetchMetaAccountsFromToken = useCallback(async (shortLivedToken: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('No hay sesión activa. Por favor inicia sesión primero.');
    }

    const apiResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=fetch-accounts-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ shortLivedToken, clientId })
      }
    );

    const result = await apiResponse.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result.accounts as MetaAccountsData;
  }, [clientId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Check FB login status on mount
  useEffect(() => {
    if (typeof FB !== 'undefined') {
      FB.getLoginStatus((response) => {
        setFbLoginStatus(response.status);
        console.log('FB login status:', response.status);
      });
    }
  }, []);

  // Handle META_OAUTH_CODE: parent makes the authenticated API call
  const handleMetaOAuthCode = useCallback(async (code: string, oauthClientId: string, redirectUri: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('No hay sesión activa. Por favor inicia sesión primero.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=fetch-accounts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code, redirectUri, clientId: oauthClientId })
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMetaAccountsData(result.accounts);
      setShowAccountSelector(true);
    } catch (err) {
      console.error('Error fetching Meta accounts:', err);
      toast({
        title: 'Error de conexión',
        description: err instanceof Error ? err.message : 'Error al conectar con Meta',
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  }, [toast]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'META_OAUTH_CODE') {
        // Parent receives the code from the popup and makes the authenticated call
        handleMetaOAuthCode(event.data.code, event.data.clientId, event.data.redirectUri);
      } else if (event.data?.type === 'META_OAUTH_ACCOUNTS') {
        setMetaAccountsData(event.data.accounts);
        setShowAccountSelector(true);
        setConnecting(null);
      } else if (event.data?.type === 'META_OAUTH_SUCCESS') {
        toast({
          title: 'Conexión exitosa',
          description: `Conectado a Meta: ${event.data.connection?.pageName || 'Cuenta conectada'}`,
        });
        setConnecting(null);
        fetchConnections();
      } else if (event.data?.type === 'META_OAUTH_ERROR') {
        toast({
          title: 'Error de conexión',
          description: event.data.error || 'Error al conectar con Meta',
          variant: 'destructive',
        });
        setConnecting(null);
      } else if (event.data?.type === 'YOUTUBE_OAUTH_ACCOUNTS') {
        setYoutubeAccountsData({
          accounts: event.data.accounts,
          accessToken: event.data.accessToken,
          refreshToken: event.data.refreshToken,
          expiresIn: event.data.expiresIn,
          clientId: event.data.clientId,
        });
        setShowYouTubeSelector(true);
        setConnecting(null);
      } else if (event.data?.type === 'YOUTUBE_OAUTH_ERROR') {
        toast({
          title: 'Error de conexión',
          description: event.data.error || 'Error al conectar con YouTube',
          variant: 'destructive',
        });
        setConnecting(null);
      } else if (event.data?.type === 'TIKTOK_OAUTH_ACCOUNT') {
        // Auto-save TikTok connection (no selector needed — single account)
        handleSaveTikTokConnection(
          event.data.account,
          event.data.accessToken,
          event.data.refreshToken,
          event.data.expiresIn,
        );
        setConnecting(null);
      } else if (event.data?.type === 'TIKTOK_OAUTH_ERROR') {
        toast({
          title: 'Error de conexión',
          description: event.data.error || 'Error al conectar con TikTok',
          variant: 'destructive',
        });
        setConnecting(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast, fetchConnections, handleMetaOAuthCode]);

  const handleSaveMetaConnection = async (selectedAccounts: {
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    instagramId: string | null;
    adAccountId: string | null;
  }) => {
    if (!metaAccountsData) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=save-connection`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            clientId,
            // Long-lived USER token (required for Ads Manager / ad account endpoints)
            accessToken: metaAccountsData.accessToken,
            pageId: selectedAccounts.pageId,
            pageName: selectedAccounts.pageName,
            // Selected PAGE token (useful for page/IG endpoints)
            pageAccessToken: selectedAccounts.pageAccessToken,
            instagramId: selectedAccounts.instagramId,
            adAccountId: selectedAccounts.adAccountId,
            tokenExpiresAt: metaAccountsData.tokenExpiresAt,
          })
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await logAction({
        action: 'platform.connect',
        entityType: 'platform_connection',
        entityName: `Meta - ${selectedAccounts.pageName}`,
        details: { platform: 'meta', page_name: selectedAccounts.pageName },
      });

      toast({
        title: 'Conexión exitosa',
        description: `Conectado a: ${selectedAccounts.pageName}`,
      });
      
      setShowAccountSelector(false);
      setMetaAccountsData(null);
      fetchConnections();
    } catch (err) {
      console.error('Error saving connection:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al guardar la conexión',
        variant: 'destructive',
      });
    }
  };

  const handleConnectMeta = async () => {
    setConnecting('meta');

    if (typeof FB === 'undefined') {
      toast({
        title: 'Error',
        description: 'El SDK de Facebook no se ha cargado. Recarga la página e intenta de nuevo.',
        variant: 'destructive',
      });
      setConnecting(null);
      return;
    }

    const processToken = async (accessToken: string) => {
      try {
        const accounts = await fetchMetaAccountsFromToken(accessToken);
        setMetaAccountsData(accounts);
        setShowAccountSelector(true);
      } catch (err) {
        console.error('Error fetching Meta accounts:', err);
        toast({
          title: 'Error de conexión',
          description: err instanceof Error ? err.message : 'Error al conectar con Meta',
          variant: 'destructive',
        });
      } finally {
        setConnecting(null);
      }
    };

    if (fbLoginStatus === 'connected') {
      FB.getLoginStatus(async (statusResponse) => {
        if (statusResponse.status === 'connected' && statusResponse.authResponse) {
          console.log('FB already connected, using existing token');
          await processToken(statusResponse.authResponse.accessToken);
          return;
        }

        setFbLoginStatus(statusResponse.status);
        setConnecting(null);
        toast({
          title: 'Sesión de Facebook no disponible',
          description: 'Volvé a intentar para abrir el login de Meta.',
          variant: 'destructive',
        });
      });
      return;
    }

    const scopes = [
      'pages_read_engagement',
      'pages_show_list',
      'instagram_basic',
      'instagram_manage_insights',
      'ads_read',
      'business_management',
      'pages_read_user_content',
    ].join(',');

    let loginResponded = false;
    const loginTimeout = setTimeout(() => {
      if (!loginResponded) {
        loginResponded = true;
        setConnecting(null);
        toast({
          title: 'Popup bloqueado',
          description: 'No se pudo abrir el login de Facebook. Si estás en el preview, prueba en la URL publicada (socialifycr.lovable.app). También revisa que no tengas popups bloqueados.',
          variant: 'destructive',
        });
      }
    }, 5000);

    FB.login(async (loginResponse) => {
      loginResponded = true;
      clearTimeout(loginTimeout);

      if (loginResponse.status !== 'connected' || !loginResponse.authResponse) {
        setFbLoginStatus(loginResponse.status ?? 'unknown');
        toast({
          title: 'Conexión cancelada',
          description: 'No se completó la autorización con Meta.',
          variant: 'destructive',
        });
        setConnecting(null);
        return;
      }

      setFbLoginStatus('connected');
      await processToken(loginResponse.authResponse.accessToken);
    }, { scope: scopes, auth_type: 'rerequest' });
  };

  const handleConnectYouTube = async () => {
    setConnecting('youtube');
    
    try {
      const redirectUri = `${window.location.origin}/oauth/youtube/callback`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=authorize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUri, clientId }),
        }
      );
      
      const data = await response.json();

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        setConnecting(null);
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'youtube-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de autorización. Por favor, permite las ventanas emergentes.',
          variant: 'destructive',
        });
        setConnecting(null);
      }

      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setConnecting(null);
        }
      }, 1000);

    } catch (err) {
      console.error('Error initiating YouTube OAuth:', err);
      toast({
        title: 'Error',
        description: 'Error al iniciar la conexión con YouTube',
        variant: 'destructive',
      });
      setConnecting(null);
    }
  };

  const handleSaveYouTubeConnection = async (channel: { id: string; name: string }) => {
    if (!youtubeAccountsData) return;
    
    setSavingYouTube(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=save-connection`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            clientId,
            channelId: channel.id,
            channelName: channel.name,
            accessToken: youtubeAccountsData.accessToken,
            refreshToken: youtubeAccountsData.refreshToken,
            expiresIn: youtubeAccountsData.expiresIn,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await logAction({
        action: 'platform.connect',
        entityType: 'platform_connection',
        entityName: `YouTube - ${channel.name}`,
        details: { platform: 'youtube', channel_name: channel.name },
      });

      toast({
        title: 'Conexión exitosa',
        description: `Conectado a YouTube: ${channel.name}`,
      });
      
      setShowYouTubeSelector(false);
      setYoutubeAccountsData(null);
      fetchConnections();
    } catch (err) {
      console.error('Error saving YouTube connection:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al guardar la conexión',
        variant: 'destructive',
      });
    } finally {
      setSavingYouTube(false);
    }
  };

  const handleSaveTikTokConnection = async (
    account: { openId: string; displayName: string },
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-oauth?action=save-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            clientId,
            openId: account.openId,
            displayName: account.displayName,
            accessToken,
            refreshToken,
            expiresIn,
          }),
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      await logAction({
        action: 'platform.connect',
        entityType: 'platform_connection',
        entityName: `TikTok - ${account.displayName}`,
        details: { platform: 'tiktok', display_name: account.displayName },
      });

      toast({
        title: 'Conexión exitosa',
        description: `Conectado a TikTok: ${account.displayName}`,
      });

      fetchConnections();
    } catch (err) {
      console.error('Error saving TikTok connection:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al guardar la conexión',
        variant: 'destructive',
      });
    }
  };

  const handleConnectTikTok = async () => {
    setConnecting('tiktok');
    
    try {
      const redirectUri = `${window.location.origin}/oauth/tiktok/callback`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-oauth?action=authorize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUri, clientId }),
        }
      );
      
      const data = await response.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        setConnecting(null);
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'tiktok-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de autorización. Por favor, permite las ventanas emergentes.',
          variant: 'destructive',
        });
        setConnecting(null);
      }

      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setConnecting(null);
        }
      }, 1000);

    } catch (err) {
      console.error('Error initiating TikTok OAuth:', err);
      toast({ title: 'Error', description: 'Error al iniciar la conexión con TikTok', variant: 'destructive' });
      setConnecting(null);
    }
  };

  const handleConnect = (platform: string) => {
    if (platform === 'Meta (Facebook/Instagram)') {
      handleConnectMeta();
    } else if (platform === 'YouTube') {
      handleConnectYouTube();
    } else if (platform === 'TikTok') {
      handleConnectTikTok();
    } else {
      toast({
        title: 'Próximamente',
        description: `La conexión con ${platform} estará disponible pronto.`,
      });
    }
  };

  const handleDisconnect = async () => {
    if (!connectionToDisconnect) return;
    
    setDisconnectingId(connectionToDisconnect.id);
    
    try {
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connectionToDisconnect.id);

      if (error) throw error;

      await logAction({
        action: 'platform.disconnect',
        entityType: 'platform_connection',
        entityId: connectionToDisconnect.id,
        entityName: `${platformConfig[connectionToDisconnect.platform].name} - ${connectionToDisconnect.platform_page_name || ''}`,
        details: { platform: connectionToDisconnect.platform },
      });

      toast({
        title: 'Plataforma desconectada',
        description: `${platformConfig[connectionToDisconnect.platform].name} ha sido desconectada.`,
      });
      
      fetchConnections();
    } catch (err) {
      console.error('Error disconnecting platform:', err);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la plataforma',
        variant: 'destructive',
      });
    } finally {
      setDisconnectingId(null);
      setShowDisconnectDialog(false);
      setConnectionToDisconnect(null);
    }
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
              <div className="flex items-center gap-2">
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setConnectionToDisconnect(connection);
                    setShowDisconnectDialog(true);
                  }}
                  disabled={disconnectingId === connection.id}
                >
                  {disconnectingId === connection.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
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
                const isConnecting = connecting === platform;
                return (
                  <Button
                    key={platform}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleConnect(config.name)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <PlatformIcon className="h-3 w-3" />
                    )}
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

      {/* Meta Account Selector Dialog */}
      <MetaAccountSelector
        open={showAccountSelector}
        onOpenChange={(open) => {
          setShowAccountSelector(open);
          if (!open) {
            setMetaAccountsData(null);
          }
        }}
        accountsData={metaAccountsData}
        clientId={clientId}
        onSave={handleSaveMetaConnection}
      />

      {/* YouTube Channel Selector Dialog */}
      <YouTubeChannelSelector
        open={showYouTubeSelector}
        onOpenChange={(open) => {
          setShowYouTubeSelector(open);
          if (!open) {
            setYoutubeAccountsData(null);
          }
        }}
        channels={youtubeAccountsData?.accounts || []}
        onSelect={handleSaveYouTubeConnection}
        loading={savingYouTube}
        message={youtubeAccountsData?.message}
      />

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desconectar plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desconectar{' '}
              {connectionToDisconnect && platformConfig[connectionToDisconnect.platform].name}
              {connectionToDisconnect?.platform_page_name && ` (${connectionToDisconnect.platform_page_name})`}
              ? Esta acción no se puede deshacer y tendrás que volver a conectar la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConnectionToDisconnect(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
