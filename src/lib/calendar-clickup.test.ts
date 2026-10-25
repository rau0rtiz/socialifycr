import { describe, expect, it } from 'vitest';
import { listBelongsToSpace, publicationDueDate } from '../../supabase/functions/_shared/calendar-clickup-rules';

describe('calendar ClickUp destination', () => {
  it('rejects lists from another client space and missing space data', () => {
    expect(listBelongsToSpace({ space: { id: 'cliente-a' } }, 'cliente-a')).toBe(true);
    expect(listBelongsToSpace({ space: { id: 'cliente-b' } }, 'cliente-a')).toBe(false);
    expect(listBelongsToSpace({}, 'cliente-a')).toBe(false);
  });
  it('uses the Costa Rica publication day for the ClickUp due date', () => {
    expect(publicationDueDate('2026-10-25')).toBe(Date.parse('2026-10-25T18:00:00Z'));
  });
});