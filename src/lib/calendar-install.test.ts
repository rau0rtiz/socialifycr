import { describe, expect, it } from 'vitest';
import { calendarManifest } from '../../supabase/functions/calendar-manifest/manifest';

describe('calendar home-screen installation', () => {
  it('launches the client calendar, never the agency dashboard', () => {
    const manifest = calendarManifest('b-dental-qkhq', 'https://app.socialifycr.com');
    expect(manifest.start_url).toBe('https://app.socialifycr.com/calendario/b-dental-qkhq');
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBe('Calendario Socialify');
  });
  it('keeps installed client calendars separate', () => {
    expect(calendarManifest('b-dental-qkhq', 'https://app.socialifycr.com').id)
      .not.toBe(calendarManifest('aurum-studio-gpb6', 'https://app.socialifycr.com').id);
  });
  it('uses dedicated Socialify icons in both required sizes', () => {
    expect(calendarManifest('b-dental-qkhq', 'https://app.socialifycr.com').icons.map(i => [i.src, i.sizes]))
      .toEqual([
        ['https://app.socialifycr.com/calendar-icon-192.png', '192x192'],
        ['https://app.socialifycr.com/calendar-icon-512.png', '512x512'],
      ]);
  });
});