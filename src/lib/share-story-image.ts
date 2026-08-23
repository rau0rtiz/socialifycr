import { toBlob } from 'html-to-image';

export async function renderStoryBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#f5f0e6',
    skipFonts: false,
  });
  if (!blob) throw new Error('No se pudo generar la imagen');
  return blob;
}

export function canShareFiles(): boolean {
  try {
    const f = new File([new Blob()], 'x.png', { type: 'image/png' });
    return !!navigator.canShare?.({ files: [f] }) && !!navigator.share;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function shareStoryImage(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (canShareFiles()) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'shared';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
