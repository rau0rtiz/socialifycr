/** Video links (Google Drive / Milanote / direct files) are never uploaded; we only embed or link. */
export type VideoEmbed =
  | { kind: 'iframe'; src: string; provider: 'drive' }
  | { kind: 'video'; src: string; provider: 'archivo' | 'milanote' }
  | { kind: 'link'; src: string; provider: 'milanote' | 'otro' };

export const driveFileId = (url: string): string | null => {
  const m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
  return url.includes('drive.google.com') || url.includes('docs.google.com') ? m?.[1] ?? null : null;
};

const isVideoFile = (url: string) => /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);

export const videoEmbed = (raw?: string | null): VideoEmbed | null => {
  const url = raw?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const id = driveFileId(url);
  if (id) return { kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview`, provider: 'drive' };
  const milanote = /milanote/i.test(url);
  if (isVideoFile(url)) return { kind: 'video', src: url, provider: milanote ? 'milanote' : 'archivo' };
  return { kind: 'link', src: url, provider: milanote ? 'milanote' : 'otro' };
};

/** Thumbnail to show: uploaded image first, then Drive's preview of the video. */
export const itemThumb = (thumb?: string | null, video?: string | null): string | null => {
  if (thumb) return thumb;
  const id = video ? driveFileId(video) : null;
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w640` : null;
};

export const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  cambios: 'Con cambios',
};

/** Monday-first grid of ISO dates (YYYY-MM-DD) covering the month. */
export const monthGrid = (year: number, month: number): { iso: string; inMonth: boolean }[] => {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month, 1 - offset);
  const days = Math.ceil((offset + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7) * 7;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start + i * 86400000);
    return { iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month };
  });
};

export const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 15)).toLocaleDateString('es-CR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
