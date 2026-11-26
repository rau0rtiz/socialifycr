import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, RotateCcw, Minus, Plus, ChevronUp, ChevronDown, FlipHorizontal, FlipVertical } from 'lucide-react';
import { openRoom, type RemoteCmd, type RemoteState } from '@/lib/prompter-remote';

export default function PrompterRemoto() {
  const { room = '' } = useParams();
  const ch = useRef<ReturnType<typeof openRoom>>();
  const [st, setSt] = useState<RemoteState | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const c = openRoom(room);
    c.on('broadcast', { event: 'state' }, ({ payload }) => setSt(payload as RemoteState))
      .subscribe(s => {
        setLive(s === 'SUBSCRIBED');
        if (s === 'SUBSCRIBED') c.send({ type: 'broadcast', event: 'cmd', payload: { a: 'hello' } });
      });
    ch.current = c;
    (navigator as any).wakeLock?.request?.('screen').catch(() => {});
    return () => { c.unsubscribe(); };
  }, [room]);

  const send = (payload: RemoteCmd) => {
    navigator.vibrate?.(10);
    ch.current?.send({ type: 'broadcast', event: 'cmd', payload });
  };

  return (
    <div className="socialify-prompter prompter-root" style={{ minHeight: '100dvh', height: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 20, userSelect: 'none' }}>
      <div className="prompter-hint" style={{ textAlign: 'center' }}>
        {live ? (st ? `Conectado · ${st.title}` : 'Conectado · esperando el teleprompter…') : 'Conectando…'}
      </div>
      <button className="prompter-btn prompter-main" style={{ width: '100%', height: '32vh', borderRadius: 24 }} onClick={() => send({ a: 'toggle' })} aria-label="Iniciar o pausar">
        {st?.playing ? <Pause style={{ width: 72, height: 72 }} /> : <Play style={{ width: 72, height: 72 }} />}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button className="prompter-btn" style={{ width: '100%', height: 72 }} onClick={() => send({ a: 'nudge', d: -1 })} aria-label="Retroceder"><ChevronUp /></button>
        <button className="prompter-btn" style={{ width: '100%', height: 72 }} onClick={() => send({ a: 'nudge', d: 1 })} aria-label="Avanzar"><ChevronDown /></button>
      </div>
      <Row label="Velocidad" value={st?.speed} onDec={() => send({ a: 'speed', d: -5 })} onInc={() => send({ a: 'speed', d: 5 })} />
      <Row label="Tamaño" value={st?.size} onDec={() => send({ a: 'size', d: -4 })} onInc={() => send({ a: 'size', d: 4 })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <button className="prompter-btn" style={{ width: '100%', height: 60 }} onClick={() => send({ a: 'reset' })} aria-label="Volver al inicio"><RotateCcw /></button>
        <button className={`prompter-btn ${st?.mirrorX ? 'on' : ''}`} style={{ width: '100%', height: 60 }} onClick={() => send({ a: 'mirrorX' })} aria-label="Espejo horizontal"><FlipHorizontal /></button>
        <button className={`prompter-btn ${st?.mirrorY ? 'on' : ''}`} style={{ width: '100%', height: 60 }} onClick={() => send({ a: 'mirrorY' })} aria-label="Espejo vertical"><FlipVertical /></button>
      </div>
    </div>
  );
}

function Row({ label, value, onDec, onInc }: { label: string; value?: number; onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 72px', gap: 12, alignItems: 'center' }}>
      <button className="prompter-btn" style={{ width: '100%', height: 64 }} onClick={onDec} aria-label={`Menos ${label}`}><Minus /></button>
      <div className="prompter-stepval" style={{ textAlign: 'center' }}><span>{label}</span><b>{value ?? '–'}</b></div>
      <button className="prompter-btn" style={{ width: '100%', height: 64 }} onClick={onInc} aria-label={`Más ${label}`}><Plus /></button>
    </div>
  );
}
