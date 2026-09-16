import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type State =
  | { kind: 'working' }
  | { kind: 'ok'; username?: string; tokenType?: string; expiresInDays?: number }
  | { kind: 'error'; message: string };

/**
 * Callback público del login de Instagram Business.
 * Instagram redirige acá con el token en el fragmento (#access_token=...).
 * La página lo envía a una función del backend que lo valida y lo guarda
 * de forma segura — el token nunca queda expuesto en la app.
 */
export const InstagramOAuthCallback = () => {
  const [state, setState] = useState<State>({ kind: 'working' });

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const error = query.get('error') || params.get('error');
      const errorDescription = query.get('error_description') || params.get('error_description');

      // Limpiar el token de la barra de direcciones cuanto antes.
      window.history.replaceState({}, '', window.location.pathname);

      if (error) {
        setState({ kind: 'error', message: errorDescription || error });
        return;
      }

      if (!accessToken) {
        setState({ kind: 'error', message: 'No llegó ningún token de Instagram. Volvé a generarlo desde Meta.' });
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('ig-save-token', {
          body: { accessToken },
        });
        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        const expiresInDays =
          typeof data?.expiresIn === 'number' ? Math.round(data.expiresIn / 86400) : undefined;
        setState({
          kind: 'ok',
          username: data?.username,
          tokenType: data?.tokenType,
          expiresInDays,
        });
      } catch (e) {
        setState({ kind: 'error', message: e instanceof Error ? e.message : 'Error inesperado al guardar el token' });
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="agency-card rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        {state.kind === 'working' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h1 className="text-lg font-semibold text-foreground">Guardando conexión de Instagram…</h1>
            <p className="text-sm text-muted-foreground">Validando el token con Meta. No cerrés esta ventana.</p>
          </>
        )}
        {state.kind === 'ok' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h1 className="text-lg font-semibold text-foreground">Token de Instagram guardado</h1>
            <p className="text-sm text-muted-foreground">
              {state.username ? `Cuenta: @${state.username}. ` : ''}
              {state.tokenType === 'long_lived'
                ? `Token de larga duración${state.expiresInDays ? ` (~${state.expiresInDays} días)` : ''}.`
                : 'Token guardado. Lo vamos a extender cuando conectemos el secreto de la app.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Ya podés cerrar esta ventana. El estado de la conexión se ve en Chats → Conexiones, y el primer DM real
              va a aparecer en Chats → Bandeja.
            </p>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-lg font-semibold text-foreground">No se pudo guardar el token</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
};
