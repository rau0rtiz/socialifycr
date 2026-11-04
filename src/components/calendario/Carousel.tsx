import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Slide-by-slide carousel viewer in the agency's intended order. */
export function CarouselViewer({ urls }: { urls: string[] }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const go = (n: number) => setI(Math.max(0, Math.min(urls.length - 1, n)));
  return (
    <div className="mx-auto w-full max-w-full">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-lg bg-secondary"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current == null) return; const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 40) go(i + (d < 0 ? 1 : -1)); touch.current = null; }}
      >
        <img src={urls[i]} alt={`Diapositiva ${i + 1} de ${urls.length}`} className="mx-auto block h-auto max-h-[55dvh] w-auto max-w-full object-contain" />
        {i > 0 && <button type="button" aria-label="Diapositiva anterior" onClick={() => go(i - 1)} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground"><ChevronLeft className="h-5 w-5" /></button>}
        {i < urls.length - 1 && <button type="button" aria-label="Diapositiva siguiente" onClick={() => go(i + 1)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground"><ChevronRight className="h-5 w-5" /></button>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <div className="flex gap-1.5">{urls.map((_, k) => <button key={k} type="button" aria-label={`Ir a diapositiva ${k + 1}`} onClick={() => setI(k)} className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/40')} />)}</div>
        <span className="text-xs tabular-nums text-muted-foreground">{i + 1} / {urls.length}</span>
      </div>
    </div>
  );
}

/** Agency editor: drop many files at once, drag to reorder, remove. */
export function CarouselEditor({ urls, onChange, upload }: { urls: string[]; onChange: (next: string[]) => void; upload: (f: File) => Promise<string | null> }) {
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const drag = useRef<number | null>(null);
  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    if (!imgs.length) return;
    setBusy(imgs.length);
    const out = await Promise.all(imgs.map(upload));
    setBusy(0);
    onChange([...urls, ...out.filter((u): u is string => !!u)]);
  };
  const move = (from: number, to: number) => { if (from === to) return; const n = [...urls]; const [x] = n.splice(from, 1); n.splice(to, 0, x); onChange(n); };
  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => { if (drag.current == null) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { if (drag.current != null) return; e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
        className={cn('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground', over ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60')}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        {busy ? `Subiendo ${busy} diapositiva${busy > 1 ? 's' : ''}…` : 'Arrastrá todas las diapositivas o tocá para elegirlas'}
        <span className="text-[11px]">Se ordenan por nombre de archivo; después podés reacomodarlas.</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </label>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((u, k) => (
            <div
              key={u + k}
              draggable
              onDragStart={() => { drag.current = k; }}
              onDragEnd={() => { drag.current = null; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (drag.current != null) move(drag.current, k); drag.current = null; }}
              className="group relative cursor-grab overflow-hidden rounded-md border border-border bg-secondary active:cursor-grabbing"
            >
              <img src={u} alt={`Diapositiva ${k + 1}`} className="aspect-[4/5] w-full object-cover" draggable={false} />
              <span className="absolute left-1 top-1 rounded bg-background/85 px-1.5 text-[10px] font-bold tabular-nums">{k + 1}</span>
              <GripVertical className="absolute bottom-1 left-1 h-4 w-4 text-foreground/80" />
              <button type="button" aria-label={`Quitar diapositiva ${k + 1}`} onClick={() => onChange(urls.filter((_, j) => j !== k))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/85"><X className="h-3.5 w-3.5" /></button>
              <div className="absolute bottom-1 right-1 flex gap-0.5 sm:hidden">
                {k > 0 && <button type="button" aria-label="Mover antes" onClick={() => move(k, k - 1)} className="flex h-6 w-6 items-center justify-center rounded bg-background/85"><ChevronLeft className="h-3.5 w-3.5" /></button>}
                {k < urls.length - 1 && <button type="button" aria-label="Mover después" onClick={() => move(k, k + 1)} className="flex h-6 w-6 items-center justify-center rounded bg-background/85"><ChevronRight className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
