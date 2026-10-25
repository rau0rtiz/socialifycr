import { ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { videoEmbed } from '@/lib/calendar-media';
import { CalendarThumb, type CalendarItem } from './CalendarMonth';

/** Socialify-branded frame around any playable media. The label strip sits under the media
 *  so nothing but the video itself touches the top edge. */
const PlayerFrame = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="socialify-player overflow-hidden rounded-xl">
    <div className="sp-body">{children}</div>
    <div className="sp-bar">
      <span className="sp-dot" />
      <span className="sp-brand">Socialify</span>
      {label && <span className="sp-tag">{label}</span>}
    </div>
  </div>
);

/** Drive's own embed puts its toolbar (download, fullscreen, …) on top of the video, so we
 *  ask the browser to play the file directly — that keeps every control under the picture —
 *  and only fall back to Drive's embed when the file cannot be streamed that way. */
const DriveVideo = ({ direct, preview, provider }: { direct: string; preview: string; provider: string }) => {
  const [directFailed, setDirectFailed] = useState(false);
  if (directFailed)
    return (
      <PlayerFrame label={provider}>
        <div className="aspect-[9/16] max-h-[60dvh] w-full sm:aspect-video">
          <iframe src={preview} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title="Video de Drive" />
        </div>
      </PlayerFrame>
    );
  return (
    <PlayerFrame label={provider}>
      <video
        src={direct}
        controls
        playsInline
        preload="metadata"
        className="block max-h-[60dvh] w-full bg-black"
        onError={() => setDirectFailed(true)}
      />
    </PlayerFrame>
  );
};

/** Plays Drive/direct video inline; Milanote boards and other links open in a new tab. */
export const VideoPlayer = ({ item }: { item: CalendarItem }) => {
  const e = videoEmbed(item.video_url);
  // Measured intrinsic size so the player (and its frame) match the video's aspect ratio.
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const w = dims?.w || 9;
  const h = dims?.h || 16;
  // Static artwork uses its intrinsic dimensions, without a video-shaped frame.
  if (item.thumbnail_url && !['reel', 'tiktok', 'short', 'story'].includes(item.content_type ?? '')) {
    return <CalendarThumb item={item} className="mx-auto block h-auto max-h-[50dvh] w-auto max-w-full rounded-lg" />;
  }
  if (e?.kind === 'iframe') return <DriveVideo direct={e.direct} preview={e.src} provider={e.provider} />;
  if (e?.kind === 'video')
    return (
      <div className="mx-auto" style={{ width: `min(100%, calc(48dvh * ${w / h}))` }}>
        <PlayerFrame label={e.provider}>
          <video
            src={e.src}
            controls
            playsInline
            className="block w-full bg-black"
            style={{ aspectRatio: `${w} / ${h}` }}
            onLoadedMetadata={(ev) => {
              const v = ev.currentTarget;
              if (v.videoWidth && v.videoHeight) setDims({ w: v.videoWidth, h: v.videoHeight });
            }}
          />
        </PlayerFrame>
      </div>
    );
  return (
    <div className="space-y-2">
      <PlayerFrame>
        <CalendarThumb item={item} className="mx-auto block h-auto max-h-[50dvh] w-auto max-w-full" />
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
