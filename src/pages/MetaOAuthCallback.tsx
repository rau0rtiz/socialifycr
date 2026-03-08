import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const MetaOAuthCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      if (window.opener) {
        window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: errorDescription || error }, window.location.origin);
        window.close();
      }
      return;
    }

    if (!code || !state) {
      if (window.opener) {
        window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: 'Parámetros de autorización faltantes' }, window.location.origin);
        window.close();
      }
      return;
    }

    // Decode state to get clientId
    let clientId: string;
    try {
      const stateData = JSON.parse(atob(state));
      clientId = stateData.clientId;
    } catch {
      if (window.opener) {
        window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: 'Estado inválido' }, window.location.origin);
        window.close();
      }
      return;
    }

    // Send the code back to the parent window - the parent has the active session
    // and will make the authenticated API call
    if (window.opener) {
      window.opener.postMessage({
        type: 'META_OAUTH_CODE',
        code,
        clientId,
        redirectUri: `${window.location.origin}/oauth/meta/callback`,
      }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-foreground">Conectando con Meta...</h1>
        <p className="text-muted-foreground mt-2">Por favor espera mientras completamos la conexión.</p>
      </div>
    </div>
  );
};
