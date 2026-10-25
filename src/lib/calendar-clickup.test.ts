import { describe, expect, it } from 'vitest';
import { listBelongsToSpace, calendarSyncFields, calendarTaskPayload, isClickUpApproved, shouldShowCalendarPiece } from '../../supabase/functions/_shared/calendar-clickup-rules';

describe('calendar ClickUp destination', () => {
  it('excludes ClickUp-approved pieces only from unscheduled pieces', () => {
    expect(isClickUpApproved({ status: 'APROBADO' })).toBe(true);
    expect(isClickUpApproved({ status: 'aprobada' })).toBe(true);
    expect(isClickUpApproved({ status: 'pre-aprobación' })).toBe(false);
    expect(isClickUpApproved({ status: 'no aprobado' })).toBe(false);
    expect(shouldShowCalendarPiece({ publish_date: null, clickup_approved: true })).toBe(false);
    expect(shouldShowCalendarPiece({ publish_date: '2026-10-25', clickup_approved: true })).toBe(true);
    expect(shouldShowCalendarPiece({ publish_date: null, clickup_approved: false })).toBe(true);
  });
  it('rejects lists from another client space and missing space data', () => {
    expect(listBelongsToSpace({ space: { id: 'cliente-a' } }, 'cliente-a')).toBe(true);
    expect(listBelongsToSpace({ space: { id: 'cliente-b' } }, 'cliente-a')).toBe(false);
    expect(listBelongsToSpace({}, 'cliente-a')).toBe(false);
  });
  it('never imports editing deadlines as delivery dates, including unscheduled pieces', () => {
    const fields = calendarSyncFields({ due_date: String(Date.parse('2026-10-25T18:00:00Z')), url: 'https://app.clickup.com/t/123' }, 'Reel');
    expect(fields).toEqual({ title: 'Reel', clickup_url: 'https://app.clickup.com/t/123' });
    expect({ publish_date: null, ...fields }.publish_date).toBeNull();
    expect({ publish_date: '2026-11-02', ...fields }.publish_date).toBe('2026-11-02');
  });
  it('never exports manual delivery dates as ClickUp editing deadlines', () => {
    const task = calendarTaskPayload({ id: 'piece-1', title: 'Reel', content_type: 'reel', publish_date: '2026-10-25' });
    expect(task).not.toHaveProperty('due_date');
    expect(task).not.toHaveProperty('start_date');
    expect(task.name).toBe('[REEL] Reel');
  });
});