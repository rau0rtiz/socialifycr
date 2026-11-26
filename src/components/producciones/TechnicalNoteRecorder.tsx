import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, X, FileText } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TechnicalNoteRecorder({ shotId, sheetId, onTranscript }: {
  shotId: string; sheetId: string; onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'ready' | 'transcribing'>('idle');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state !== 'inactive') recorder.current?.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!audio) { setAudioUrl(''); return; }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Este navegador no permite grabar audio. Probá Safari o Chrome actualizado.');
      return;
    }
    setState('starting');
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      let bytes = 0;
      next.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes > 19 * 1024 * 1024 && next.state === 'recording') next.stop();
      };
      next.onstop = () => {
        input.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        const blob = new Blob(chunks, { type: next.mimeType || 'audio/mp4' });
        if (!blob.size) { setState('idle'); toast.error('No se grabó audio.'); return; }
        setAudio(blob);
        setState('ready');
      };
      next.onerror = () => {
        input.getTracks().forEach(track => track.stop());
        if (mounted.current) { setState('idle'); toast.error('La grabación se interrumpió.'); }
      };
      recorder.current = next;
      next.start(1000);
      setState('recording');
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) setState('idle');
      toast.error('Permití el acceso al micrófono para grabar tus notas.');
    }
  }

  async function transcribe() {
    if (!audio) return;
    setState('transcribing');
    try {
      const body = new FormData();
      body.append('audio', audio, audio.type.includes('mp4') ? 'nota.m4a' : 'nota.webm');
      body.append('shot_id', shotId);
      body.append('sheet_id', sheetId);
      const { data, error } = await supabase.functions.invoke('transcribe-production-note', { body });
      if (error) {
        let message = error.message;
        if (error instanceof FunctionsHttpError) {
          const detail = await error.context.json().catch(() => null);
          message = detail?.error || message;
          if (detail?.status === 402) message = 'Revisá el saldo de tu cuenta de ElevenLabs.';
          if (detail?.status === 401 || detail?.status === 403) message = 'Revisá los permisos de transcripción de tu conexión de ElevenLabs.';
        }
        throw new Error(message);
      }
      if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('No se detectó voz en el audio.');
      if (!mounted.current) return;
      callback.current(data.text);
      setAudio(null);
      setState('idle');
      toast.success('Transcripción agregada a las notas técnicas.');
    } catch (error) {
      if (mounted.current) {
        setState('ready');
        toast.error(error instanceof Error ? error.message : 'No se pudo transcribir. Probá de nuevo.');
      }
    }
  }

  const busy = state === 'transcribing' || state === 'starting';
  return (
    <div className="no-print flex flex-wrap items-center gap-2 mt-2">
      {state === 'idle' || state === 'starting' ? (
        <Button type="button" variant="ghost" size="sm" onClick={start} disabled={busy}
          className="text-noeval-accent" title="Grabar nota de voz" aria-label="Grabar nota de voz">
          {state === 'starting' ? <Loader2 className="animate-spin" /> : <Mic />} Grabar
        </Button>
      ) : state === 'recording' ? (
        <Button type="button" variant="outline" size="sm" onClick={() => recorder.current?.stop()}
          className="text-noeval-accent border-noeval-accent" aria-label="Detener grabación">
          <Square /> Detener grabación
        </Button>
      ) : (
        <>
          {audioUrl && <audio controls src={audioUrl} className="h-9 w-full max-w-[260px]" aria-label="Nota de voz" />}
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={transcribe} className="text-noeval-accent">
            {busy ? <Loader2 className="animate-spin" /> : <FileText />} {busy ? 'Transcribiendo…' : 'Transcribir'}
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={() => { setAudio(null); setState('idle'); }}
            title="Descartar audio" aria-label="Descartar audio"><X /></Button>
        </>
      )}
    </div>
  );
}