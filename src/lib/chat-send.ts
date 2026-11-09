type SendInput = { conversationId: string; text: string; author?: 'humano' | 'bot' };
type Result = { data: { sent?: boolean; error?: string; code?: number; error_subcode?: number } | null; error: { message: string; context?: Response } | null };
type Client = {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token: string } | null }; error: unknown }>;
    refreshSession: () => Promise<{ data: { session: { access_token: string } | null }; error: unknown }>;
  };
  functions: { invoke: (name: string, options: { body: SendInput; headers: Record<string, string> }) => Promise<Result> };
};

export async function chatSendFailure(result: Result) {
  const response = result.error?.context;
  const detail = response instanceof Response
    ? await response.clone().json().catch(() => null)
    : null;
  const payload = detail ?? result.data;
  const message = payload?.error ?? result.error?.message ?? 'No se pudo confirmar el envío. Revisá el chat antes de volver a enviar.';
  if (payload?.error_subcode === 2534022 || /outside of allowed window/i.test(message)) {
    return { status: response?.status, message: 'Instagram cerró el plazo para responder desde Chats. Pedile al contacto que vuelva a escribir para habilitar el envío; también podés continuar la conversación directamente en Instagram.' };
  }
  if (response?.status === 401) {
    return { status: 401, message: 'Tu sesión venció. Volvé a iniciar sesión para enviar; tu mensaje no se borró.' };
  }
  return { status: response?.status, message };
}

/** Retry only an explicit authentication rejection, never an uncertain send. */
export async function sendChatMessage(client: Client, input: SendInput) {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Volvé a iniciar sesión para enviar; tu mensaje no se borró.');
  const invoke = (token: string) => client.functions.invoke('ig-send-message', {
    body: input, headers: { Authorization: `Bearer ${token}` },
  });
  let result = await invoke(data.session.access_token);
  if (result.error || result.data?.error) {
    let failure = await chatSendFailure(result);
    if (failure.status === 401) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) throw new Error(failure.message);
      result = await invoke(refreshed.data.session.access_token);
      if (result.error || result.data?.error) {
        failure = await chatSendFailure(result);
        throw new Error(failure.message);
      }
    } else {
      throw new Error(failure.message);
    }
  }
  if (!result.data?.sent) throw new Error('No se pudo confirmar el envío. Revisá el chat antes de volver a enviar.');
  return result.data;
}