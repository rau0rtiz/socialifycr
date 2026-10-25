import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { videoEmbed } from '@/lib/calendar-media';
import { CalendarThumb, type CalendarItem } from './CalendarMonth';

/** Socialify-branded frame around any playable media. */
const PlayerFrame = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="socialify-player overflow-hidden rounded-xl">
    <div className="sp-bar">
      <span className="sp-dot" />
      <span className="sp-brand">Socialify</span>
      {label && <span className="sp-tag">{label}</span>}
    </div>
    <div className="sp-body">{children}</div>
  </div>
);

/** Plays Drive/direct video inline; Milanote boards and other links open in a new tab. */
export const VideoPlayer = ({ item }: { item: CalendarItem }) => {
  const e = videoEmbed(item.video_url);
  if (e?.kind === 'iframe')
    return (
      <PlayerFrame label={e.provider}>
        <div className="aspect-[9/16] max-h-[62vh] w-full sm:aspect-video">
          <iframe src={e.src} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title={item.title} />
        </div>
      </PlayerFrame>
    );
  if (e?.kind === 'video')
    return (
      <PlayerFrame label={e.provider}>
        <video src={e.src} controls playsInline className="max-h-[62vh] w-full" />
      </PlayerFrame>
    );
  return (
    <div className="space-y-2">
      <PlayerFrame>
        <CalendarThumb item={item} className="max-h-[52vh] w-full" />
      </PlayerFrame>
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
