import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

// We configure the worker manually to avoid bundling issues
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  data: ArrayBuffer;
}

const PdfViewer = ({ data }: PdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(false);

      try {
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

          const scale = 1.5;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <FileText className="h-12 w-12 opacity-30" />
        <p className="text-sm">No se pudo renderizar el PDF</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-muted/20">
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Cargando PDF...</p>
        </div>
      )}
      <div ref={containerRef} className="flex flex-col items-center gap-2 p-2" />
      {!loading && pageCount > 0 && (
        <p className="text-center text-[10px] text-muted-foreground py-2">
          {pageCount} página{pageCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default PdfViewer;
