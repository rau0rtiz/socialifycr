import { describe, expect, it, vi } from 'vitest';
import { chatSendFailure, sendChatMessage } from './chat-send';

const input = { conversationId: 'conversation', text: 'Respuesta' };
const rejected = (status: number, body: object) => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(body), { status }) } });
const client = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'initial' } }, error: null }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'renewed' } }, error: null }),
  },
  functions: { invoke: vi.fn().mockResolvedValue({ data: { sent: true }, error: null }) },
});

describe('chat send failures and safe retries', () => {
  it('extracts the provider rejection instead of hiding it behind non-2xx', async () => {
    expect((await chatSendFailure(rejected(400, { error: 'Instagram no está conectado' }))).message).toBe('Instagram no está conectado');
  });
  it('does not retry Instagram window rejections', async () => {
    const c = client();
    c.functions.invoke.mockResolvedValue(rejected(400, { error: 'This message is sent outside of allowed window.', error_subcode: 2534022 }));
    await expect(sendChatMessage(c, input)).rejects.toThrow('Instagram cerró el plazo');
    expect(c.functions.invoke).toHaveBeenCalledTimes(1);
    expect(c.auth.refreshSession).not.toHaveBeenCalled();
  });
  it('renews the session only after a 401 and retries once', async () => {
    const c = client();
    c.functions.invoke.mockResolvedValueOnce(rejected(401, { error: 'Sesión inválida' }));
    await expect(sendChatMessage(c, input)).resolves.toEqual({ sent: true });
    expect(c.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(c.functions.invoke).toHaveBeenLastCalledWith('ig-send-message', { body: input, headers: { Authorization: 'Bearer renewed' } });
  });
  it('stops after a second 401', async () => {
    const c = client();
    c.functions.invoke.mockImplementation(async () => rejected(401, { error: 'Sesión inválida' }));
    await expect(sendChatMessage(c, input)).rejects.toThrow('Tu sesión venció');
    expect(c.functions.invoke).toHaveBeenCalledTimes(2);
  });
  it('does not retry uncertain network failures or claim success without sent', async () => {
    const c = client();
    c.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    await expect(sendChatMessage(c, input)).rejects.toThrow('Failed to fetch');
    expect(c.functions.invoke).toHaveBeenCalledTimes(1);
    c.functions.invoke.mockResolvedValueOnce({ data: {}, error: null });
    await expect(sendChatMessage(c, input)).rejects.toThrow('No se pudo confirmar');
  });
});