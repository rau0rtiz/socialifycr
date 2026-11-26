import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Square, X, Send, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Msg = { role: 'user' | 'assistant'; content: string; link?: string | null };
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
      setMsgs(m => [...m, { role: 'user', content: data.transcript }, { role: 'assistant', content: data.reply, link: data.link }]);
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

  return (
    <div className="ari-assistant fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="ari-panel w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl overflow-hidden flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-4 py-3 ari-panel-head">
            <div>
              <div className="font-semibold">Ari</div>
              <div className="text-xs opacity-70">{recording ? 'Te escucho…' : busy ? 'Pensando…' : 'Tocá el micrófono y pedime algo'}</div>
            </div>
            <button aria-label="Cerrar Ari" onClick={() => setOpen(false)} className="p-1 rounded-md opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {!msgs.length && <p className="opacity-60">Ej.: «Creá una hoja de producción para B-Dental», «agregá un video sobre blanqueamiento», «apagá a Ari en Instagram», «dame el link del calendario de Maracuyá».</p>}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ari-bubble-user ml-8' : 'ari-bubble-bot mr-8'}>
                {m.content}
                {m.link && (
                  <button onClick={() => { navigator.clipboard.writeText(m.link!); toast.success('Link copiado'); }} className="mt-1 flex items-center gap-1 text-xs underline break-all text-left">
                    <Copy className="h-3 w-3 shrink-0" />{m.link}
                  </button>
                )}
              </div>
            ))}
            {busy && <Loader2 className="h-4 w-4 animate-spin opacity-60" />}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 p-3 ari-panel-foot" onSubmit={e => { e.preventDefault(); if (text.trim() && !busy) { send({ text: text.trim() }); setText(''); } }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="O escribile…" className="ari-input flex-1 rounded-xl px-3 py-2 text-sm outline-none" />
            <button type="submit" aria-label="Enviar" disabled={busy || !text.trim()} className="ari-send rounded-xl px-3 disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
      <button
        aria-label={open ? (recording ? 'Detener grabación' : 'Hablar con Ari') : 'Abrir Ari'}
        onClick={() => { if (!open) { setOpen(true); return; } if (!busy) toggleRec(); }}
        className={`ari-orb h-14 w-14 rounded-full flex items-center justify-center ${recording ? 'ari-orb-live' : ''}`}
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : open ? <Mic className="h-6 w-6" /> : <span className="font-bold text-lg">Ari</span>}
      </button>
    </div>
  );
}
