import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Square, X, Send, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Msg = { role: 'user' | 'assistant'; content: string; link?: string | null; copy?: string | null };
const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ari-voice`;

/** Floating "Ari" voice assistant, visible on every agency page. */
export function AriVoiceAssistant() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const copy = (t: string, label = 'Copiado') => { navigator.clipboard.writeText(t); toast.success(label); };

  const visible = !!user && (pathname.startsWith('/agencia') || pathname.startsWith('/producciones'));
  if (!visible) return null;

  const send = async (payload: { audio?: Blob; text?: string }) => {
    setBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const fd = new FormData();
      if (payload.audio) fd.append('audio', new File([payload.audio], 'ari.webm', { type: payload.audio.type || 'audio/webm' }));
      if (payload.text) fd.append('text', payload.text);
      fd.append('path', pathname);
      fd.append('history', JSON.stringify(msgs.slice(-8).map(({ role, content }) => ({ role, content }))));
      const r = await fetch(FN_URL, { method: 'POST', headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}` }, body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { if (data.transcript) setMsgs(m => [...m, { role: 'user', content: data.transcript }]); throw new Error(data.error || 'Ari no respondió'); }
      setMsgs(m => [...m, { role: 'user', content: data.transcript }, { role: 'assistant', content: data.reply, link: data.link, copy: data.copy }]);
      if (data.audio) {
        audioEl.current?.pause();
        audioEl.current = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audioEl.current.play().catch(() => {});
      }
      (data.invalidate as string[] | undefined)?.forEach(k => {
        if (k === 'sheets') qc.invalidateQueries({ queryKey: ['production-sheets'] });
        else if (k.startsWith('sheet:')) qc.invalidateQueries({ queryKey: ['production-sheet', k.slice(6)] });
        else qc.invalidateQueries();
      });
      if (data.navigate && data.navigate !== pathname) navigate(data.navigate);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ari no respondió');
    } finally { setBusy(false); }
  };

  const toggleRec = async () => {
    if (recording) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType: type });
      chunks.current = [];
      mr.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type });
        if (blob.size > 1000) send({ audio: blob });
      };
      rec.current = mr; mr.start(); setRecording(true);
    } catch { toast.error('Necesito permiso del micrófono para escucharte.'); }
  };

  const status = recording ? 'Te escucho…' : busy ? 'Pensando…' : 'Tocá para hablar';
  return (
    <div className="ari-assistant print:hidden">
      {!open && (
        <button aria-label="Abrir Ari" onClick={() => setOpen(true)} className="ari-orb fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full flex items-center justify-center">
          <span className="font-bold text-lg">Ari</span>
        </button>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Ari" className="ari-overlay fixed inset-0 z-[70] flex flex-col">
          <div className="ari-aura" aria-hidden />
          <div className="relative flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
            <div className="ari-chip">Ari · Socialify</div>
            <button aria-label="Cerrar Ari" onClick={() => setOpen(false)} className="ari-glass-btn h-10 w-10 rounded-full flex items-center justify-center"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative flex-1 overflow-y-auto px-5">
            <div className="mx-auto max-w-2xl space-y-3 py-4">
              {!msgs.length && (
                <div className="text-center pt-6 sm:pt-12">
                  <h2 className="ari-title">¿Qué hacemos, Raúl?</h2>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {['Creá una hoja de producción para B-Dental', 'Dame el link del calendario de Maracuyá', 'Escribime un mensaje para confirmar la grabación', 'Apagá a Ari en Instagram'].map(t => (
                      <button key={t} disabled={busy} onClick={() => send({ text: t })} className="ari-glass-btn rounded-full px-4 py-2 text-sm">{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`${m.role === 'user' ? 'ari-bubble-user' : 'ari-bubble-bot'} max-w-[85%] text-[15px] leading-relaxed`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.copy && (
                      <div className="ari-copy mt-3 rounded-2xl p-3">
                        <div className="whitespace-pre-wrap text-sm select-text">{m.copy}</div>
                        <button onClick={() => copy(m.copy!, 'Texto copiado')} className="ari-copy-btn mt-3 w-full rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"><Copy className="h-4 w-4" />Copiar texto</button>
                      </div>
                    )}
                    {m.link && (
                      <button onClick={() => copy(m.link!, 'Link copiado')} className="ari-copy mt-3 w-full rounded-2xl p-3 flex items-center gap-2 text-sm text-left break-all">
                        <Copy className="h-4 w-4 shrink-0" />{m.link}
                      </button>
                    )}
                    {m.role === 'assistant' && !m.copy && !m.link && (
                      <button aria-label="Copiar respuesta" onClick={() => copy(m.content)} className="mt-1 opacity-50 hover:opacity-100"><Copy className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="ari-bubble-bot"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
              <div ref={endRef} />
            </div>
          </div>
          <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
              <button
                aria-label={recording ? 'Detener grabación' : 'Hablar con Ari'}
                disabled={busy}
                onClick={toggleRec}
                className={`ari-orb ari-orb-big h-20 w-20 rounded-full flex items-center justify-center ${recording ? 'ari-orb-live' : ''}`}
              >
                {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : recording ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
              </button>
              <div className="text-xs ari-muted">{status}</div>
              <form className="ari-composer w-full flex gap-2 rounded-full p-1.5" onSubmit={e => { e.preventDefault(); if (text.trim() && !busy) { send({ text: text.trim() }); setText(''); } }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribile a Ari…" className="flex-1 bg-transparent px-4 text-[15px] outline-none" />
                <button type="submit" aria-label="Enviar" disabled={busy || !text.trim()} className="ari-send h-10 w-10 rounded-full flex items-center justify-center disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
