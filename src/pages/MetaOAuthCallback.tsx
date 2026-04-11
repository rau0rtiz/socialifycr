import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const MetaOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const errorPayload = { type: 'META_OAUTH_ERROR', error: errorDescription || error };
      if (window.opener) {
        window.opener.postMessage(errorPayload, window.location.origin);
        window.close();
      } else {
        // iPad/iOS fallback: store in sessionStorage and navigate back
        sessionStorage.setItem('meta_oauth_result', JSON.stringify(errorPayload));
        navigate('/clientes');
      }
      return;
    }

    if (!code || !state) {
      const errorPayload = { type: 'META_OAUTH_ERROR', error: 'Parámetros de autorización faltantes' };
      if (window.opener) {
        window.opener.postMessage(errorPayload, window.location.origin);
        window.close();
      } else {
        sessionStorage.setItem('meta_oauth_result', JSON.stringify(errorPayload));
        navigate('/clientes');
      }
      return;
    }

    // Decode state to get clientId
    let clientId: string;
    try {
      const stateData = JSON.parse(atob(state));
      clientId = stateData.clientId;
    } catch {
      const errorPayload = { type: 'META_OAUTH_ERROR', error: 'Estado inválido' };
      if (window.opener) {
        window.opener.postMessage(errorPayload, window.location.origin);
        window.close();
      } else {
        sessionStorage.setItem('meta_oauth_result', JSON.stringify(errorPayload));
        navigate('/clientes');
      }
      return;
    }

    const payload = {
      type: 'META_OAUTH_CODE',
      code,
      clientId,
      redirectUri: `${window.location.origin}/oauth/meta/callback`,
    };

    if (window.opener) {
      // Desktop: send message to parent and close popup
      window.opener.postMessage(payload, window.location.origin);
      window.close();
    } else {
      // iPad/iOS fallback: store result and navigate back
      sessionStorage.setItem('meta_oauth_result', JSON.stringify(payload));
      navigate('/clientes');
    }
  }, [searchParams, navigate]);

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
