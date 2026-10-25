import { describe, expect, it } from 'vitest';
import { clientSlug, isLegacyToken, prettyCalendarToken } from './calendar-share';

describe('calendar share tokens', () => {
  it('slugifies client names keeping letters and numbers', () => {
    expect(clientSlug('B Dental Studio')).toBe('b-dental-studio');
    expect(clientSlug('  Aurum  Studio  ')).toBe('aurum-studio');
    expect(clientSlug('Café Ñandú')).toBe('cafe-nandu');
    expect(clientSlug('Peptiva CR')).toBe('peptiva-cr');
  });

  it('never returns a slug over 24 chars or empty', () => {
    expect(clientSlug('Clínica Dental Especializada Ultra Larga')).toMatch(/^.{1,24}$/);
    expect(clientSlug('***')).toBe('cliente');
  });

  it('pretty tokens are slug + 4 random chars, never legacy hex', () => {
    for (let i = 0; i < 20; i++) {
      const token = prettyCalendarToken('The Clinic');
      expect(token).toMatch(/^the-clinic-[a-z0-9]{4}$/);
      expect(isLegacyToken(token)).toBe(false);
    }
  });

  it('detects legacy 32-char hex tokens', () => {
    expect(isLegacyToken('a'.repeat(32))).toBe(true);
    expect(isLegacyToken('b-dental-k4t2')).toBe(false);
  });
});
