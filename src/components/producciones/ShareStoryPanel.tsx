import { useRef, useState } from 'react';
import { StoryReceiptCard, type StoryReceiptData, type StoryTheme } from './StoryReceiptCard';
import { renderStoryBlob, shareStoryImage, downloadBlob, canShareFiles } from '@/lib/share-story-image';
import { Loader2, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';

/** Preview + share/download actions for the 1080x1920 story receipt. */
export function ShareStoryPanel({ data, compact = false }: { data: StoryReceiptData; compact?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<StoryTheme>('light');
  const [busy, setBusy] = useState<null | 'share' | 'download'>(null);

  const filename = `recibo-${data.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'produccion'}.png`;

  const generate = async () => {
    const node = nodeRef.current;
    if (!node) throw new Error('No se pudo preparar la imagen');
    // Two passes: first render warms fonts/images so the final output is complete.
    await renderStoryBlob(node);
    return renderStoryBlob(node);
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const blob = await generate();
      const result = await shareStoryImage(blob, filename, `Recibo de producción · ${data.title}`);
      if (result === 'downloaded') toast.success('Imagen descargada — subila a tus historias');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo generar la imagen');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy('download');
    try {
      const blob = await generate();
      downloadBlob(blob, filename);
      toast.success('Imagen descargada');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo generar la imagen');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full">
      {/* Offscreen full-size node used for export */}
      <div style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
        <StoryReceiptCard ref={nodeRef} data={data} theme={theme} />
      </div>

      {/* Scaled visual preview */}
      <div className="mx-auto" style={{ width: compact ? 270 : 324 }}>
        <div
          className="relative overflow-hidden rounded-2xl shadow-lg"
          style={{ width: compact ? 270 : 324, height: compact ? 480 : 576 }}
        >
          <div
            style={{
              transform: `scale(${(compact ? 270 : 324) / 1080})`,
              transformOrigin: 'top left',
              width: 1080,
              height: 1920,
            }}
          >
            <StoryReceiptCard data={data} theme={theme} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {(['light', 'dark'] as StoryTheme[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition border ${
              theme === t
                ? 'bg-[#1a1a1a] text-[#f5f0e6] border-[#1a1a1a]'
                : 'bg-transparent text-[#8b7355] border-[#d4c5a9] hover:border-[#1a1a1a]'
            }`}
          >
            {t === 'light' ? 'Papel' : 'Studio'}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch justify-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e85d3a] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#1a1a1a] disabled:opacity-60"
        >
          {busy === 'share' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Compartir
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1a1a1a] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#1a1a1a] transition hover:bg-[#1a1a1a] hover:text-[#f5f0e6] disabled:opacity-60"
        >
          {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Descargar
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-[#8b7355]">
        {canShareFiles()
          ? 'Al compartir se abre Instagram, WhatsApp y más — como compartir una canción.'
          : 'Desde el celular podés compartirlo directo a Instagram. En escritorio se descarga la imagen.'}
      </p>
    </div>
  );
}
