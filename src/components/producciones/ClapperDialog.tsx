import { useEffect, useState } from 'react';
import { Clapperboard, Minus, Plus, X, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ClapperDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  pieceNumber: number;
  clientName?: string;
  producerName?: string | null;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function ClapperDialog({ open, onOpenChange, title, pieceNumber, clientName, producerName }: ClapperDialogProps) {
  const [now, setNow] = useState(new Date());
  const [take, setTake] = useState(1);
  const [encargado, setEncargado] = useState(producerName || '');

  useEffect(() => { if (open) setEncargado(producerName || ''); }, [open, producerName]);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const goFull = () => {
    const el = document.getElementById('socialify-clapper');
    el?.requestFullscreen?.().catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-[100dvh] p-0 border-0 rounded-none bg-noeval-ink [&>button]:hidden">
        <DialogTitle className="sr-only">Claqueta · {title}</DialogTitle>
        <div id="socialify-clapper" className="relative h-full w-full flex flex-col bg-noeval-ink text-noeval-cream p-4 sm:p-8 select-none">
          {/* Stripes */}
          <div
            className="h-10 sm:h-16 rounded-lg shrink-0"
            style={{ background: 'repeating-linear-gradient(-45deg, hsl(var(--foreground)) 0 28px, #faf8f5 28px 56px)' }}
          />
          <div className="flex-1 mt-4 sm:mt-6 rounded-2xl border-2 border-noeval-cream/80 grid grid-rows-[auto_1fr_auto] overflow-hidden">
            <div className="grid grid-cols-3 border-b-2 border-noeval-cream/80 text-center">
              <Cell label="Pieza" value={String(pieceNumber).padStart(2, '0')} />
              <div className="border-x-2 border-noeval-cream/80">
                <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase opacity-60 pt-2">Toma</div>
                <div className="flex items-center justify-center gap-3 pb-2">
                  <button onClick={() => setTake(t => Math.max(1, t - 1))} className="p-1 opacity-60 hover:opacity-100" aria-label="Toma anterior"><Minus className="h-5 w-5" /></button>
                  <span className="font-bold text-4xl sm:text-6xl tabular-nums">{take}</span>
                  <button onClick={() => setTake(t => t + 1)} className="p-1 opacity-60 hover:opacity-100" aria-label="Siguiente toma"><Plus className="h-5 w-5" /></button>
                </div>
              </div>
              <Cell label="Fecha" value={fmtDate(now)} small />
            </div>
            <div className="flex flex-col items-center justify-center px-4 text-center">
              {clientName && <div className="text-xs sm:text-sm tracking-[0.35em] uppercase text-noeval-accent mb-3">{clientName}</div>}
              <div className="font-bold leading-tight text-3xl sm:text-5xl lg:text-7xl break-words max-w-[95%]">
                {title || 'Sin título'}
              </div>
            </div>
            <div className="grid grid-cols-2 border-t-2 border-noeval-cream/80 text-center">
              <div className="border-r-2 border-noeval-cream/80 py-2 px-3">
                <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase opacity-60">Encargado</div>
                <input
                  value={encargado}
                  onChange={(e) => setEncargado(e.target.value)}
                  placeholder="Nombre"
                  className="w-full bg-transparent text-center font-bold text-xl sm:text-3xl outline-none placeholder:opacity-30"
                />
              </div>
              <Cell label="Hora" value={fmtTime(now)} mono />
            </div>
          </div>
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex gap-2">
            <button onClick={goFull} className="rounded-full bg-noeval-ink/80 p-2 text-noeval-cream hover:text-noeval-accent" aria-label="Pantalla completa"><Maximize2 className="h-5 w-5" /></button>
            <button onClick={() => onOpenChange(false)} className="rounded-full bg-noeval-ink/80 p-2 text-noeval-cream hover:text-noeval-accent" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value, small, mono }: { label: string; value: string; small?: boolean; mono?: boolean }) {
  return (
    <div className="py-2 px-2">
      <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase opacity-60">{label}</div>
      <div className={`font-bold tabular-nums ${small ? 'text-lg sm:text-3xl mt-2' : 'text-4xl sm:text-6xl'} ${mono ? 'text-2xl sm:text-5xl' : ''}`}>{value}</div>
    </div>
  );
}

export function ClapperButton(props: Omit<ClapperDialogProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-noeval-muted hover:text-noeval-accent p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
        title="Claqueta para cámara"
      >
        <Clapperboard className="h-4 w-4" />
      </button>
      <ClapperDialog open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}
