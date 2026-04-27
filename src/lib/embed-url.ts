export type ReferencePlatform =
  | 'youtube'
  | 'youtube_shorts'
  | 'instagram'
  | 'instagram_reel'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'vimeo'
  | 'loom'
  | 'other';

export interface ParsedReference {
  platform: ReferencePlatform;
  embedUrl: string | null;
  /** Aspect ratio hint for embed container: 'video' (16:9), 'vertical' (9:16), 'square' (1:1) */
  aspect: 'video' | 'vertical' | 'square';
  /** Original tweet/status id if applicable (for X embed which uses blockquote, not iframe) */
  externalId?: string;
}

const cleanUrl = (raw: string) => raw.trim().replace(/^@+/, '');

export const parseReferenceUrl = (raw: string): ParsedReference => {
  const url = cleanUrl(raw);
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    return { platform: 'other', embedUrl: null, aspect: 'video' };
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname;

  // YouTube Shorts
  let m = path.match(/^\/shorts\/([\w-]{6,})/);
  if ((host.endsWith('youtube.com') || host === 'm.youtube.com') && m) {
    return { platform: 'youtube_shorts', embedUrl: `https://www.youtube.com/embed/${m[1]}`, aspect: 'vertical' };
  }
  // YouTube standard watch / embed
  if (host.endsWith('youtube.com') || host === 'm.youtube.com') {
    const v = parsed.searchParams.get('v');
    if (v) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${v}`, aspect: 'video' };
    m = path.match(/^\/embed\/([\w-]+)/);
    if (m) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${m[1]}`, aspect: 'video' };
  }
  // youtu.be short links
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0];
    if (id) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}`, aspect: 'video' };
  }

  // Instagram (post / reel / tv / igtv)
  if (host.endsWith('instagram.com')) {
    m = path.match(/^\/(p|reel|reels|tv|igtv)\/([\w-]+)/);
    if (m) {
      const isReel = m[1] === 'reel' || m[1] === 'reels';
      const code = m[2];
      return {
        platform: isReel ? 'instagram_reel' : 'instagram',
        embedUrl: `https://www.instagram.com/p/${code}/embed`,
        aspect: isReel ? 'vertical' : 'square',
      };
    }
  }

  // TikTok
  if (host.endsWith('tiktok.com')) {
    m = path.match(/\/video\/(\d+)/);
    if (m) return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}`, aspect: 'vertical' };
    // vm.tiktok.com short link → can't resolve client-side, embed still works via oEmbed page
    return { platform: 'tiktok', embedUrl: null, aspect: 'vertical' };
  }

  // Facebook (videos / reels / posts / fb.watch)
  if (host.endsWith('facebook.com') || host === 'fb.watch') {
    const isReel = /\/reel\//.test(path);
    return {
      platform: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`,
      aspect: isReel ? 'vertical' : 'video',
    };
  }

  // LinkedIn — only the embed format is reliably embeddable
  if (host.endsWith('linkedin.com')) {
    // /embed/feed/update/urn:li:activity:ID
    m = path.match(/urn:li:activity:(\d+)/i);
    if (m) {
      return {
        platform: 'linkedin',
        embedUrl: `https://www.linkedin.com/embed/feed/update/urn:li:activity:${m[1]}`,
        aspect: 'square',
      };
    }
    // posts/...activity-ID-...
    m = path.match(/activity[-:](\d{10,})/i);
    if (m) {
      return {
        platform: 'linkedin',
        embedUrl: `https://www.linkedin.com/embed/feed/update/urn:li:activity:${m[1]}`,
        aspect: 'square',
      };
    }
    return { platform: 'linkedin', embedUrl: null, aspect: 'square' };
  }

  // X / Twitter
  if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
    m = path.match(/\/status(?:es)?\/(\d+)/);
    if (m) return { platform: 'twitter', embedUrl: null, aspect: 'square', externalId: m[1] };
  }

  // Vimeo
  if (host.endsWith('vimeo.com')) {
    m = path.match(/^\/(\d+)/);
    if (m) return { platform: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}`, aspect: 'video' };
  }

  // Loom
  if (host.endsWith('loom.com')) {
    m = path.match(/\/(?:share|embed)\/([\w-]+)/);
    if (m) return { platform: 'loom', embedUrl: `https://www.loom.com/embed/${m[1]}`, aspect: 'video' };
  }

  return { platform: 'other', embedUrl: null, aspect: 'video' };
};

export const PLATFORM_META: Record<ReferencePlatform, { label: string; color: string }> = {
  youtube: { label: 'YouTube', color: '#FF0000' },
  youtube_shorts: { label: 'YT Shorts', color: '#FF0000' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  instagram_reel: { label: 'IG Reel', color: '#E1306C' },
  tiktok: { label: 'TikTok', color: '#000000' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  twitter: { label: 'X / Twitter', color: '#000000' },
  vimeo: { label: 'Vimeo', color: '#1AB7EA' },
  loom: { label: 'Loom', color: '#625DF5' },
  other: { label: 'Link', color: '#6B7280' },
};
