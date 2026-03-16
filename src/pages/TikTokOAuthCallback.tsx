import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const TikTokOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('TikTok OAuth error:', error);
        if (window.opener) {
          window.opener.postMessage({ type: 'TIKTOK_OAUTH_ERROR', error }, window.location.origin);
          window.close();
        } else {
          navigate('/clientes');
        }
        return;
      }

      if (!code || !state) {
        if (window.opener) {
          window.opener.postMessage({ type: 'TIKTOK_OAUTH_ERROR', error: 'Parámetros faltantes' }, window.location.origin);
          window.close();
        } else {
          navigate('/clientes');
        }
        return;
      }

      try {
        const stateData = JSON.parse(atob(state));
        const clientId = stateData.clientId;
        const redirectUri = 'https://socialifycr.lovable.app/oauth/tiktok/callback';

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error('No hay sesión activa. Por favor inicia sesión primero.');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-oauth?action=fetch-accounts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ code, redirectUri, clientId }),
          }
        );

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (window.opener) {
          window.opener.postMessage({
            type: 'TIKTOK_OAUTH_ACCOUNT',
            account: result.account,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            clientId,
          }, window.location.origin);
          window.close();
        } else {
          navigate('/clientes');
        }
      } catch (err) {
        console.error('Error completing TikTok OAuth:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

        if (window.opener) {
          window.opener.postMessage({ type: 'TIKTOK_OAUTH_ERROR', error: errorMessage }, window.location.origin);
          window.close();
        } else {
          toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
        <h1 className="text-xl font-semibold text-foreground">Conectando con TikTok...</h1>
        <p className="text-muted-foreground mt-2">Por favor espera mientras completamos la conexión.</p>
      </div>
    </div>
  );
};
