import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Square, X, Send, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { readAriEvents } from '@/lib/ari-stream';
import { useAuth } from '@/contexts/AuthContext';

type Msg = { id?: string; context?: string; pending?: boolean; role: 'user' | 'assistant'; content: string; link?: string | null; copy?: string | null };
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
  const [phase, setPhase] = useState('Pensando…');
  const sendingRef = useRef(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const openingRef = useRef(0);

  const closeMedia = () => {
    openingRef.current += 1;
    const recorder = rec.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    rec.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    audioEl.current?.pause();
    setRecording(false);
  };
  const changeOpen = (value: boolean) => {
    openRef.current = value;
    setOpen(value);
    if (!value) closeMedia();
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      const element = overlayRef.current;
      if (!element) return;
      element.style.height = `${viewport?.height ?? window.innerHeight}px`;
      element.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
    };
  }, [open]);

  useEffect(() => () => {
    openingRef.current += 1;
    if (rec.current) {
      rec.current.onstop = null;
      if (rec.current.state !== 'inactive') rec.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioEl.current?.pause();
  }, []);

  const copy = (t: string, label = 'Copiado') => { navigator.clipboard.writeText(t); toast.success(label); };

  const visible = !!user && (pathname.startsWith('/agencia') || pathname.startsWith('/producciones'));
  if (!visible) return null;

  const send = async (payload: { audio?: Blob; text?: string }) => {
    if(sendingRef.current) return;
    sendingRef.current=true;
    setBusy(true);
    setPhase(payload.audio ? 'Transcribiendo…' : 'Revisando el pedido…');
    const userId=crypto.randomUUID();
    const history=msgs.filter(m=>!m.pending).map(({role,content,context})=>({role,content:content+(context ? '\nResultados verificados de herramientas: '+context : '')}));
    setMsgs(m=>[...m,{id:userId,role:'user',content:payload.text ?? 'Audio enviado · transcribiendo…',pending:!!payload.audio}]);
    const results:unknown[]=[];
    const invalidate=(keys?:string[])=>keys?.forEach(k=>{
      if(k==='sheets') qc.invalidateQueries({queryKey:['production-sheets']});
      else if(k.startsWith('sheet:')) qc.invalidateQueries({queryKey:['production-sheet',k.slice(6)]});
      else qc.invalidateQueries();
    });
    try {
      const {data:s}=await supabase.auth.getSession();
      const fd=new FormData();
      if(payload.audio)fd.append('audio',new File([payload.audio],'ari.webm',{type:payload.audio.type || 'audio/webm'}));
      if(payload.text)fd.append('text',payload.text);
      fd.append('stream','1');fd.append('path',pathname);fd.append('history',JSON.stringify(history));
      const response=await fetch(FN_URL,{method:'POST',headers:{Authorization:`Bearer ${s.session?.access_token ?? ''}`},body:fd});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error || 'Ari no respondió');}
      if(!response.body)throw new Error('No se recibió respuesta de Ari');
      await readAriEvents(response.body,event=>{
        if(event.type==='transcript'){
          setMsgs(m=>m.map(msg=>msg.id===userId?{...msg,content:event.text,pending:false}:msg));
          setPhase('Revisando el pedido…');
        } else if(event.type==='intent') {
          setMsgs(m=>[...m,{role:'assistant',content:event.text}]);setPhase('Aplicando cambios…');
        } else if(event.type==='tool_result') {
          results.push({name:event.name,result:event.result});invalidate(event.invalidate);
        } else if(event.type==='reply') {
          setMsgs(m=>[...m,{role:'assistant',content:event.text,link:event.link,copy:event.copy,context:JSON.stringify(results)}]);
          invalidate(event.invalidate);
          if(event.navigate && event.navigate!==pathname)navigate(event.navigate);
          setPhase('Preparando la voz…');
        } else if(event.type==='audio' && openRef.current) {
          audioEl.current?.pause();audioEl.current=new Audio(`data:audio/mpeg;base64,${event.audio}`);audioEl.current.play().catch(()=>{});
        } else if(event.type==='error') {
          invalidate(event.invalidate);setMsgs(m=>[...m,{role:'assistant',content:event.error,context:JSON.stringify(results)}]);toast.error(event.error);
        }
      });
    } catch(e) {
      const message=e instanceof Error?e.message:'Ari no respondió';
      setMsgs(m=>[...m,{role:'assistant',content:message,context:JSON.stringify(results)}]);toast.error(message);
    } finally {setBusy(false);sendingRef.current=false;}
  };

  const toggleRec = async () => {
    if (recording) { rec.current?.stop(); return; }
    try {
      const attempt = ++openingRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!openRef.current || attempt !== openingRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType: type });
      chunks.current = [];
      mr.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        rec.current = null;
        setRecording(false);
        const blob = new Blob(chunks.current, { type });
        if (blob.size > 1000) send({ audio: blob });
      };
      rec.current = mr; mr.start(); setRecording(true);
    } catch { toast.error('Necesito permiso del micrófono para escucharte.'); }
  };

  const status = recording ? 'Te escucho…' : busy ? phase : 'Tocá para hablar';
  return (
    <div className="ari-assistant print:hidden">
      {!open && (
        <Button variant="ghost" aria-label="Abrir Ari" title="Hablar con Ari" onClick={() => changeOpen(true)} className="ari-launcher fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full p-0">
          <img src="/favicon.png" alt="" className="ari-launcher-mark h-8 w-8 object-contain" />
        </Button>
      )}
      <Dialog.Root open={open} onOpenChange={changeOpen}>
        <Dialog.Portal>
        <Dialog.Content ref={overlayRef} aria-describedby={undefined} onOpenAutoFocus={event => { event.preventDefault(); overlayRef.current?.querySelector<HTMLButtonElement>('[aria-label="Cerrar Ari"]')?.focus(); }} className="ari-assistant ari-overlay fixed left-0 right-0 top-0 z-[100] flex flex-col outline-none">
          <div className="ari-aura" aria-hidden />
          <div className="ari-header relative shrink-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
            <Dialog.Title className="ari-chip">Ari · Socialify</Dialog.Title>
            <Button variant="ghost" aria-label="Cerrar Ari" onClick={() => changeOpen(false)} className="ari-glass-btn h-11 w-11 shrink-0 rounded-full p-0"><X className="h-5 w-5" /></Button>
          </div>
          <div ref={scrollRef} className="ari-scroll relative min-h-0 flex-1 overflow-y-auto px-5">
            <div className="mx-auto max-w-2xl space-y-3 py-4">
              {!msgs.length && (
                <div className="text-center pt-6 sm:pt-12">
                  <h2 className="ari-title">Hola, ¿cómo va?</h2>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {['Creá una hoja de producción para B-Dental', 'Dame el link del calendario de Maracuyá', 'Escribime un mensaje para confirmar la grabación', 'Apagá a Ari en Instagram'].map(t => (
                      <Button variant="ghost" key={t} disabled={busy} onClick={() => send({ text: t })} className="ari-glass-btn h-auto max-w-full whitespace-normal rounded-full px-4 py-2 text-sm">{t}</Button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`${m.role === 'user' ? 'ari-bubble-user' : 'ari-bubble-bot'} min-w-0 max-w-[90%] break-words text-[15px] leading-relaxed`}>
                    {m.role === 'assistant' ? <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <div className="whitespace-pre-wrap">{m.content}</div>}
                    {m.copy && (
                      <div className="ari-copy h-auto whitespace-normal mt-3 rounded-2xl p-3">
                        <div className="whitespace-pre-wrap text-sm select-text">{m.copy}</div>
                        <Button variant="ghost" onClick={() => copy(m.copy ?? '', 'Texto copiado')} className="ari-copy-btn h-auto whitespace-normal mt-3 w-full rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"><Copy className="h-4 w-4" />Copiar texto</Button>
                      </div>
                    )}
                    {m.link && (
                      <Button variant="ghost" onClick={() => copy(m.link ?? '', 'Link copiado')} className="ari-copy h-auto whitespace-normal mt-3 w-full rounded-2xl p-3 flex items-center gap-2 text-sm text-left break-all">
                        <Copy className="h-4 w-4 shrink-0" />{m.link}
                      </Button>
                    )}
                    {m.role === 'assistant' && !m.copy && !m.link && (
                      <Button variant="ghost" aria-label="Copiar respuesta" onClick={() => copy(m.content)} className="mt-1 opacity-50 hover:opacity-100"><Copy className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="ari-bubble-bot"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}

            </div>
          </div>
          <div className="ari-footer relative shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto max-w-2xl flex flex-col items-center gap-3">
              <Button variant="ghost"
                aria-label={recording ? 'Detener grabación' : 'Hablar con Ari'}
                disabled={busy}
                onClick={toggleRec}
                className={`ari-orb ari-orb-big h-16 w-16 shrink-0 rounded-full p-0 [&_svg]:size-6 ${recording ? 'ari-orb-live' : ''}`}
              >
                {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : recording ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
              </Button>
              <div className="text-xs ari-muted">{status}</div>
              <form className="ari-composer w-full flex gap-2 rounded-full p-1.5" onSubmit={e => { e.preventDefault(); if (text.trim() && !busy && !recording) { send({ text: text.trim() }); setText(''); } }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribile a Ari…" aria-label="Mensaje para Ari" className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none" />
                <Button variant="ghost" type="submit" aria-label="Enviar" disabled={busy || recording || !text.trim()} className="ari-send h-10 w-10 shrink-0 p-0 rounded-full flex items-center justify-center disabled:opacity-40"><Send className="h-4 w-4" /></Button>
              </form>
            </div>
          </div>
        </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
