import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollText, X, Maximize2, Play, Pause, RotateCcw, FlipHorizontal, FlipVertical,
  RotateCw, Minus, Plus, Settings2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  script: string;
}

const LS = 'socialify-teleprompter-prefs';
type Prefs = { speed: number; size: number; mirrorX: boolean; mirrorY: boolean; rotate: number; margin: number; line: number };
const DEFAULTS: Prefs = { speed: 40, size: 64, mirrorX: false, mirrorY: false, rotate: 0, margin: 8, line: 1.35 };

function loadPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return DEFAULTS; }
}

export function TeleprompterDialog({ open, onOpenChange, title, script }: Props) {
  const [p, setP] = useState<Prefs>(loadPrefs);
  const [playing, setPlaying] = useState(false);
  const [showCtl, setShowCtl] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const raf = useRef<number>();
  const last = useRef<number>(0);
  const acc = useRef(0);

  useEffect(() => { localStorage.setItem(LS, JSON.stringify(p)); }, [p]);
  useEffect(() => { if (!open) setPlaying(false); }, [open]);

  // Wake lock to keep iPad screen awake
  useEffect(() => {
    if (!open) return;
    let lock: any;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch(() => {}); };
  }, [open]);

  useEffect(() => {
    if (!playing) { if (raf.current) cancelAnimationFrame(raf.current); return; }
    last.current = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.1, (t - last.current) / 1000);
      last.current = t;
      const el = scroller.current;
      if (el) {
        acc.current += p.speed * dt * (p.size / 48);
        const whole = Math.floor(acc.current);
        if (whole) { el.scrollTop += whole; acc.current -= whole; }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { setPlaying(false); setShowCtl(true); return; }
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, p.speed, p.size]);

  const toggle = useCallback(() => {
    setPlaying(x => {
      const next = !x;
      setShowCtl(!next);
      return next;
    });
  }, []);

  const reset = () => { setPlaying(false); if (scroller.current) scroller.current.scrollTop = 0; };

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowUp') setP(x => ({ ...x, speed: Math.min(200, x.speed + 5) }));
      else if (e.key === 'ArrowDown') setP(x => ({ ...x, speed: Math.max(5, x.speed - 5) }));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, toggle]);

  const goFull = () => {
    const el = document.getElementById('socialify-teleprompter') as any;
    (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
  };

  const set = (patch: Partial<Prefs>) => setP(x => ({ ...x, ...patch }));
  const rotated = p.rotate % 180 !== 0;
  const transform = `rotate(${p.rotate}deg) scale(${p.mirrorX ? -1 : 1}, ${p.mirrorY ? -1 : 1})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="socialify-prompter max-w-none w-screen h-[100dvh] max-h-[100dvh] p-0 gap-0 border-0 rounded-none overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Teleprompter · {title}</DialogTitle>
        <div id="socialify-teleprompter" className="socialify-prompter prompter-root">
          <div className="prompter-stage">
            <div
              className="prompter-rot"
              style={{
                transform,
                width: rotated ? '100dvh' : '100%',
                height: rotated ? '100vw' : '100%',
              }}
            >
              <div
                ref={scroller}
                className="prompter-scroll"
                onClick={() => setShowCtl(s => !s)}
                style={{ paddingLeft: `${p.margin}%`, paddingRight: `${p.margin}%` }}
              >
                <div style={{ height: '45%' }} />
                <div className="prompter-text" style={{ fontSize: p.size, lineHeight: p.line }}>
                  {script?.trim() || 'Esta pieza todavía no tiene guion.'}
                </div>
                <div style={{ height: '90%' }} />
              </div>
            </div>
            <div className="prompter-guide" />
          </div>

          {showCtl && (
            <div className="prompter-bar" onClick={e => e.stopPropagation()}>
              <div className="prompter-row">
                <button className="prompter-btn prompter-main" onClick={toggle} aria-label={playing ? 'Pausar' : 'Iniciar'}>
                  {playing ? <Pause /> : <Play />}
                </button>
                <button className="prompter-btn" onClick={reset} aria-label="Volver al inicio"><RotateCcw /></button>
                <Stepper label="Velocidad" value={p.speed} onDec={() => set({ speed: Math.max(5, p.speed - 5) })} onInc={() => set({ speed: Math.min(200, p.speed + 5) })} />
                <Stepper label="Tamaño" value={p.size} onDec={() => set({ size: Math.max(24, p.size - 4) })} onInc={() => set({ size: Math.min(160, p.size + 4) })} />
                <button className={`prompter-btn ${p.mirrorX ? 'on' : ''}`} onClick={() => set({ mirrorX: !p.mirrorX })} aria-label="Espejo horizontal"><FlipHorizontal /></button>
                <button className={`prompter-btn ${p.mirrorY ? 'on' : ''}`} onClick={() => set({ mirrorY: !p.mirrorY })} aria-label="Espejo vertical"><FlipVertical /></button>
                <button className={`prompter-btn ${p.rotate ? 'on' : ''}`} onClick={() => set({ rotate: (p.rotate + 90) % 360 })} aria-label="Rotar"><RotateCw /></button>
                <button className="prompter-btn" onClick={goFull} aria-label="Pantalla completa"><Maximize2 /></button>
                <button className="prompter-btn" onClick={() => onOpenChange(false)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="prompter-row prompter-sliders">
                <Slider label="Velocidad" min={5} max={200} value={p.speed} onChange={v => set({ speed: v })} />
                <Slider label="Tamaño" min={24} max={160} value={p.size} onChange={v => set({ size: v })} />
                <Slider label="Márgenes" min={0} max={30} value={p.margin} onChange={v => set({ margin: v })} />
                <Slider label="Interlineado" min={1} max={2.2} step={0.05} value={p.line} onChange={v => set({ line: v })} />
              </div>
              <div className="prompter-hint"><Settings2 className="inline h-3 w-3" /> Tocá el texto para ocultar/mostrar controles · Espacio = play/pausa</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="prompter-stepper" aria-label={label}>
      <button className="prompter-btn sm" onClick={onDec} aria-label={`Menos ${label}`}><Minus /></button>
      <div className="prompter-stepval"><span>{label}</span><b>{value}</b></div>
      <button className="prompter-btn sm" onClick={onInc} aria-label={`Más ${label}`}><Plus /></button>
    </div>
  );
}

function Slider({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="prompter-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  );
}

export function TeleprompterButton({ title, script }: { title: string; script: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-noeval-muted hover:text-noeval-ink p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
        title="Teleprompter"
        aria-label="Teleprompter"
      >
        <ScrollText className="h-4 w-4" />
      </button>
      {open && <TeleprompterDialog open={open} onOpenChange={setOpen} title={title} script={script} />}
    </>
  );
}
