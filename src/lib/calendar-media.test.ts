import { describe, it, expect } from 'vitest';
import { videoEmbed, itemThumb, monthGrid } from './calendar-media';

describe('calendar media', () => {
  it('plays Google Drive links inside the calendar', () => {
    expect(videoEmbed('https://drive.google.com/file/d/abc123/view?usp=sharing'))
      .toEqual({ kind: 'iframe', src: 'https://drive.google.com/file/d/abc123/preview', provider: 'drive' });
  });
  it('plays a Milanote direct video file inline', () => {
    expect(videoEmbed('https://cdn.milanote.com/x/video.mp4')?.kind).toBe('video');
  });
  it('opens a Milanote board link in a new tab', () => {
    expect(videoEmbed('https://app.milanote.com/1R2abc/board')).toEqual({ kind: 'link', src: 'https://app.milanote.com/1R2abc/board', provider: 'milanote' });
  });
  it('uses Drive preview as thumbnail when none uploaded', () => {
    expect(itemThumb(null, 'https://drive.google.com/file/d/abc123/view')).toContain('id=abc123');
    expect(itemThumb('https://x/y.jpg', 'https://drive.google.com/file/d/abc123/view')).toBe('https://x/y.jpg');
  });
  it('October 2026 grid starts on Monday Sep 28', () => {
    const g = monthGrid(2026, 9);
    expect(g[0].iso).toBe('2026-09-28');
    expect(g.length % 7).toBe(0);
  });
});
