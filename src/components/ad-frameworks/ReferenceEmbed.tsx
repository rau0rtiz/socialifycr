import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ParsedReference } from '@/lib/embed-url';

let twitterScriptLoaded = false;
const loadTwitterScript = () => {
  if (twitterScriptLoaded || typeof document === 'undefined') return;
  twitterScriptLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://platform.twitter.com/widgets.js';
  s.async = true;
  s.charset = 'utf-8';
  document.body.appendChild(s);
};

interface Props {
  parsed: ParsedReference;
  url: string;
}

const ASPECT_CLASS: Record<ParsedReference['aspect'], string> = {
  video: 'aspect-video',
  vertical: 'aspect-[9/16]',
  square: 'aspect-square',
};

export const ReferenceEmbed = ({ parsed, url }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed.platform === 'twitter' && parsed.externalId) {
      loadTwitterScript();
      // ask the widgets script to render again if it's already loaded
      const w = (window as any).twttr;
      if (w?.widgets?.load) {
        setTimeout(() => w.widgets.load(containerRef.current), 50);
      }
    }
  }, [parsed.platform, parsed.externalId]);

  // No embed URL → fallback link card
  if (!parsed.embedUrl && parsed.platform !== 'twitter') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ASPECT_CLASS[parsed.aspect]} w-full bg-muted rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors p-4 text-center`}
      >
        <ExternalLink className="h-6 w-6" />
        <span className="text-xs break-all line-clamp-3">{url}</span>
        <span className="text-[10px] uppercase tracking-wider">No previsualizable — abrir original</span>
      </a>
    );
  }

  // Twitter / X uses blockquote + script
  if (parsed.platform === 'twitter' && parsed.externalId) {
    return (
      <div
        ref={containerRef}
        className="w-full max-h-[600px] overflow-y-auto rounded-md bg-muted/30 [&_.twitter-tweet]:!my-0 [&_.twitter-tweet]:!mx-auto"
      >
        <blockquote className="twitter-tweet" data-dnt="true">
          <a href={url}>Cargando tweet...</a>
        </blockquote>
      </div>
    );
  }

  return (
    <div className={`${ASPECT_CLASS[parsed.aspect]} w-full overflow-hidden rounded-md bg-muted`}>
      <iframe
        src={parsed.embedUrl ?? undefined}
        className="w-full h-full border-0"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
        title="Referencia"
      />
    </div>
  );
};
