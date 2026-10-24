import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { videoEmbed } from '@/lib/calendar-media';
import { CalendarThumb, type CalendarItem } from './CalendarMonth';

/** Plays Drive/direct video inline; Milanote boards and other links open in a new tab. */
export const VideoPlayer = ({ item }: { item: CalendarItem }) => {
  const e = videoEmbed(item.video_url);
  if (e?.kind === 'iframe')
    return (
      <div className="aspect-[9/16] max-h-[70vh] w-full overflow-hidden rounded-xl bg-muted sm:aspect-video">
        <iframe src={e.src} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title={item.title} />
      </div>
    );
  if (e?.kind === 'video')
    return <video src={e.src} controls playsInline className="max-h-[70vh] w-full rounded-xl bg-muted" />;
  return (
    <div className="space-y-2">
      <CalendarThumb item={item} className="max-h-[60vh] w-full rounded-xl" />
      {e?.kind === 'link' && (
        <Button asChild variant="outline" className="w-full">
          <a href={e.src} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            {e.provider === 'milanote' ? 'Ver video en Milanote' : 'Ver video'}
          </a>
        </Button>
      )}
    </div>
  );
};
