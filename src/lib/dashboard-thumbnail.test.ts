import { describe, expect, it } from 'vitest';
import { adThumbnail } from '../../supabase/functions/_shared/dashboard-thumbnail';

describe('actual ad thumbnail', () => {
  it('uses the creative thumbnail instead of a different source image', () => {
    expect(adThumbnail({ thumbnail_url: 'actual-ad', image_url: 'source-image' }, { thumbnail_url: 'actual-ad-large', image_url: 'other-image' })).toBe('actual-ad-large');
  });
  it('keeps the original ad thumbnail when the enlarged one is unavailable', () => {
    expect(adThumbnail({ thumbnail_url: 'actual-ad', image_url: 'source-image' }, { image_url: 'other-image' })).toBe('actual-ad');
  });
  it('uses only the same creative image as a fallback', () => {
    expect(adThumbnail({ image_url: 'same-creative' })).toBe('same-creative');
    expect(adThumbnail({})).toBeNull();
  });
});