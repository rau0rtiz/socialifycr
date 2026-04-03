import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const YouTubeOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('YouTube OAuth error:', error);
        toast({
          title: 'Error de autorización',
          description: 'Error al conectar con YouTube',
          variant: 'destructive',
        });
        
        if (window.opener) {
          window.opener.postMessage({ type: 'YOUTUBE_OAUTH_ERROR', error }, window.location.origin);
          window.close();
        } else {
          navigate('/clientes');
        }
        return;
      }

      if (!code || !state) {
        toast({
          title: 'Error',
          description: 'Parámetros de autorización faltantes',
          variant: 'destructive',
        });
        
        if (window.opener) {
          window.close();
        } else {
          navigate('/clientes');
        }
        return;
      }

      try {
        const stateData = JSON.parse(atob(state));
        const clientId = stateData.clientId;
        const redirectUri = `${window.location.origin}/oauth/youtube/callback`;

        // Get current session token for authenticated request
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error('No hay sesión activa. Por favor inicia sesión primero.');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=fetch-accounts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ code, redirectUri, clientId })
          }
        );

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (window.opener) {
          window.opener.postMessage({ 
            type: 'YOUTUBE_OAUTH_ACCOUNTS', 
            accounts: result.accounts,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            clientId
          }, window.location.origin);
          window.close();
        } else {
          // Redirect flow — store data in sessionStorage and navigate back
          sessionStorage.setItem('youtube_oauth_result', JSON.stringify({
            type: 'YOUTUBE_OAUTH_ACCOUNTS',
            accounts: result.accounts,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            clientId,
          }));
          navigate('/clientes');
        }
      } catch (err) {
        console.error('Error completing YouTube OAuth:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });

        if (window.opener) {
          window.opener.postMessage({ type: 'YOUTUBE_OAUTH_ERROR', error: errorMessage }, window.location.origin);
          window.close();
        } else {
          navigate('/clientes');
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-foreground">Conectando con YouTube...</h1>
        <p className="text-muted-foreground mt-2">Por favor espera mientras obtenemos tus canales.</p>
      </div>
    </div>
  );
};
