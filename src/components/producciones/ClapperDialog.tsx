import { useEffect, useState } from 'react';
import { Clapperboard, Minus, Plus, X, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClapperDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  pieceNumber?: number;
  clientName?: string;
  producerName?: string | null;
  clientLogo?: string | null;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function ClapperDialog({ open, onOpenChange, title, clientName, producerName, clientLogo }: ClapperDialogProps) {
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
      <DialogContent aria-describedby={undefined} className="socialify-clapper max-w-none w-screen h-[100dvh] max-h-[100dvh] p-0 gap-0 border-0 rounded-none overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Claqueta · {title}</DialogTitle>
        <div id="socialify-clapper" className="socialify-clapper clapper-layout select-none">
          <div className="clapper-toolbar">
            <div className="clapper-stripes" />
            <Button variant="ghost" size="icon" onClick={goFull} className="clapper-ghost" aria-label="Pantalla completa" title="Pantalla completa"><Maximize2 /></Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="clapper-ghost" aria-label="Cerrar" title="Cerrar"><X /></Button>
          </div>
          <div className="clapper-board">
            <div className="clapper-brand">
              {clientLogo && (
                <div className="clapper-logo"><img src={clientLogo} alt={clientName || 'Logo del cliente'} /></div>
              )}
              {clientName && <div className="clapper-accent clapper-display clapper-client">{clientName}</div>}
            </div>
            <div className="clapper-title-area">
              <div className="clapper-display clapper-video-title">
                {title || 'Sin título'}
              </div>
            </div>
            <div className="clapper-details">
              <div className="clapper-cell">
                <div className="clapper-label">Toma</div>
                <div className="clapper-take-controls">
                  <Button variant="ghost" size="icon" disabled={take === 1} onClick={() => setTake(t => Math.max(1, t - 1))} className="clapper-ghost" aria-label="Toma anterior" title="Toma anterior"><Minus /></Button>
                  <span className="clapper-display clapper-value tabular-nums">{take}</span>
                  <Button variant="ghost" size="icon" onClick={() => setTake(t => t + 1)} className="clapper-ghost" aria-label="Siguiente toma" title="Siguiente toma"><Plus /></Button>
                </div>
              </div>
              <div className="clapper-cell">
                <label htmlFor="clapper-producer" className="clapper-label">Encargado</label>
                <input
                  id="clapper-producer"
                  value={encargado}
                  onChange={(e) => setEncargado(e.target.value)}
                  placeholder="Nombre"
                  className="clapper-text clapper-display clapper-value w-full min-w-0 bg-transparent text-center outline-none"
                />
              </div>
              <Cell label="Fecha" value={fmtDate(now)} />
              <Cell label="Hora · Costa Rica" value={fmtTime(now)} clock />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value, clock }: { label: string; value: string; clock?: boolean }) {
  return (
    <div className="clapper-cell">
      <div className="clapper-label">{label}</div>
      <div className={`clapper-display clapper-value tabular-nums ${clock ? 'clapper-clock' : 'clapper-date'}`}>{value}</div>
    </div>
  );
}

export function ClapperButton(props: Omit<ClapperDialogProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-noeval-muted hover:text-noeval-accent h-7 w-7 rounded-lg hover:bg-noeval-line/30 transition"
        title="Claqueta para cámara"
        aria-label="Claqueta para cámara"
      >
        <Clapperboard className="h-4 w-4" />
      </Button>
      <ClapperDialog open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}
