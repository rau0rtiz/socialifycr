import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StoryReceiptData, StoryPiece } from '@/components/producciones/StoryReceiptCard';

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  reel: { icon: '🎬', label: 'Reel' },
  story: { icon: '📱', label: 'Story' },
  post: { icon: '🖼️', label: 'Post' },
  foto: { icon: '📷', label: 'Foto' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  short: { icon: '▶️', label: 'Short' },
  otro: { icon: '🎞️', label: 'Pieza' },
};

interface ShotLike {
  concept?: string | null;
  description?: string | null;
  content_type?: string | null;
  done?: boolean | null;
  sort_order?: number | null;
}

export function buildStoryReceipt(args: {
  sheetId: string;
  title?: string | null;
  shootDate?: string | null;
  clientName?: string | null;
  clientLogo?: string | null;
  shots: ShotLike[];
}): StoryReceiptData {
  const recorded = args.shots
    .filter((s) => s.done)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const pieces: StoryPiece[] = recorded.map((s) => {
    const meta = TYPE_LABELS[s.content_type || 'otro'] || TYPE_LABELS.otro;
    return {
      name: (s.concept || s.description || 'Sin nombre').trim(),
      typeLabel: meta.label,
      icon: meta.icon,
    };
  });

  let dateLabel = '—';
  if (args.shootDate) {
    try {
      dateLabel = format(parseISO(args.shootDate), "EEEE d 'de' MMMM, yyyy", { locale: es });
      dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    } catch {
      dateLabel = args.shootDate;
    }
  }

  return {
    title: args.title?.trim() || 'Producción',
    clientName: args.clientName || '',
    clientLogo: args.clientLogo || null,
    dateLabel,
    pieces,
    folio: String(args.sheetId).replace(/-/g, '').slice(0, 8).toUpperCase(),
  };
}
