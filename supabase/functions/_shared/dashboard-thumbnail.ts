type CreativeImage = { thumbnail_url?: string | null; image_url?: string | null };

// Meta's creative thumbnail represents the ad; image_url can be a separate source asset.
export function adThumbnail(creative: CreativeImage, large?: CreativeImage): string | null {
  return large?.thumbnail_url || creative.thumbnail_url || large?.image_url || creative.image_url || null;
}