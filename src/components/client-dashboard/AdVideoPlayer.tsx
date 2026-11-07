import { useRef, useState } from 'react';
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AdVideoPlayer({ src, poster, name, onError }: { src: string; poster?: string; name: string; onError: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState('');
  const toggle = async () => {
    const v = video.current;
    if (!v) return;
    if (!v.paused) { v.pause(); return; }
    try { await v.play(); setMessage(''); } catch { setMessage('No se pudo iniciar el video. Intentá de nuevo.'); }
  };
  return <div ref={frame} className="socialify-player overflow-hidden rounded-lg">
    <video ref={video} src={src} poster={poster} playsInline preload="metadata" aria-label={`Video del anuncio: ${name}`} className="block max-h-[55dvh] w-full object-contain" onClick={toggle} onError={onError} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} />
    <div className="flex items-center gap-2 border-t border-border px-2 py-1">
      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={playing ? 'Pausar video' : 'Reproducir video'} title={playing ? 'Pausar' : 'Reproducir'} onClick={toggle}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
      <input type="range" aria-label="Posición del video" min={0} max={duration || 1} step={0.1} value={position} disabled={!duration} className="min-w-0 flex-1 accent-primary" onChange={(e) => { if (video.current) { video.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); } }} />
      <span className="shrink-0 text-xs tabular-nums">{time(position)} / {time(duration)}</span>
      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={muted ? 'Activar sonido' : 'Silenciar'} title={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => { if (video.current) { video.current.muted = !muted; setMuted(!muted); } }}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Pantalla completa" title="Pantalla completa" onClick={async () => {
        const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        try { if (document.fullscreenElement) await document.exitFullscreen(); else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen(); else v?.webkitEnterFullscreen?.(); } catch { v?.webkitEnterFullscreen?.(); }
      }}><Maximize className="h-4 w-4" /></Button>
    </div>
    <div className="sp-bar"><span className="sp-dot" /><span className="sp-brand">Socialify</span><span className="sp-tag">Anuncio</span></div>
    {message && <p role="status" className="px-3 pb-3 text-xs">{message}</p>}
  </div>;
}