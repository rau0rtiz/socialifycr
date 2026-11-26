import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, RotateCcw, Minus, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, FlipHorizontal, FlipVertical } from 'lucide-react';
import { openRoom, type RemoteCmd, type RemoteState } from '@/lib/prompter-remote';

export default function PrompterRemoto() {
  const { room = '' } = useParams();
  const ch = useRef<ReturnType<typeof openRoom>>();
  const [st, setSt] = useState<RemoteState | null>(null);
  const [live, setLive] = useState(false);
  const mini = useRef<HTMLDivElement>(null);
  const touching = useRef(0);
  const lastSeek = useRef(0);

  useEffect(() => {
    const c = openRoom(room);
    c.on('broadcast', { event: 'state' }, ({ payload }) => setSt(payload as RemoteState))
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const el = mini.current;
        if (!el || touching.current || performance.now() - lastSeek.current < 400) return;
        el.scrollTop = (payload as { f: number }).f * Math.max(0, el.scrollHeight - el.clientHeight);
      })
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

  const onMiniScroll = () => {
    const el = mini.current; const now = performance.now();
    if (!el || !touching.current || now - lastSeek.current < 50) return;
    lastSeek.current = now;
    const max = el.scrollHeight - el.clientHeight;
    ch.current?.send({ type: 'broadcast', event: 'cmd', payload: { a: 'seek', f: max > 0 ? el.scrollTop / max : 0 } });
  };
  const hold = () => { touching.current = 1; };
  const release = () => { setTimeout(() => { onMiniScroll(); touching.current = 0; }, 250); };
  const titles = st?.titles || [];
  const miniSize = st ? Math.max(14, Math.round(st.size * 0.32)) : 20;

  return (
    <div className="socialify-prompter prompter-root" style={{ minHeight: '100dvh', height: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 20, userSelect: 'none' }}>
      <div className="prompter-hint" style={{ textAlign: 'center' }}>
        {live ? (st ? `Conectado · ${st.title}` : 'Conectado · esperando el teleprompter…') : 'Conectando…'}
      </div>
      {titles.length > 1 && (
        <div className="prompter-row prompter-pick" style={{ flexWrap: 'nowrap' }}>
          <button className="prompter-btn" disabled={!st?.idx} onClick={() => send({ a: 'select', i: (st?.idx ?? 0) - 1 })} aria-label="Guion anterior"><ChevronLeft /></button>
          <select value={st?.idx ?? 0} onChange={e => send({ a: 'select', i: Number(e.target.value) })} aria-label="Elegir guion" style={{ height: 52 }}>
            {titles.map((t, i) => <option key={i} value={i}>{String(i + 1).padStart(2, '0')} · {t}</option>)}
          </select>
          <button className="prompter-btn" disabled={(st?.idx ?? 0) >= titles.length - 1} onClick={() => send({ a: 'select', i: (st?.idx ?? 0) + 1 })} aria-label="Guion siguiente"><ChevronRight /></button>
        </div>
      )}
      <div className="prompter-mini">
        <div ref={mini} className="prompter-mini-scroll" onScroll={onMiniScroll}
          onTouchStart={hold} onTouchEnd={release} onTouchCancel={release}
          onPointerDown={hold} onPointerUp={release} onWheel={() => { hold(); release(); }}>
          <div style={{ height: '45%' }} />
          <div className="prompter-text" style={{ fontSize: miniSize, lineHeight: st?.line ?? 1.35 }}>{st?.script || 'Esperando el guion…'}</div>
          <div style={{ height: '90%' }} />
        </div>
        <div className="prompter-guide" style={{ height: miniSize * (st?.line ?? 1.35) }} />
      </div>
      <div className="prompter-hint" style={{ textAlign: 'center', display: 'block' }}>Deslizá el texto para mover el teleprompter</div>
      <button className="prompter-btn prompter-main" style={{ width: '100%', height: '18vh', borderRadius: 24 }} onClick={() => send({ a: 'toggle' })} aria-label="Iniciar o pausar">
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
