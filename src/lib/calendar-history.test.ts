import { describe, expect, it } from 'vitest';
import { calendarHistoryTime, orderedCalendarHistory, type CalendarComment } from './calendar-history';

describe('calendar request history', () => {
  it('keeps every request and author, newest first without modifying saved history', () => {
    const comments: CalendarComment[] = [
      { id: 'first', item_id: 'piece', author_name: 'Ana', author_type: 'cliente', kind: 'cambio', body: 'Cambiar el cierre', created_at: '2026-10-24T20:00:00Z' },
      { id: 'second', item_id: 'piece', author_name: 'Luis', author_type: 'cliente', kind: 'cambio', body: 'Cambiar la música', created_at: '2026-10-25T03:46:00Z' },
      { id: 'approved', item_id: 'piece', author_name: 'Ana', author_type: 'cliente', kind: 'aprobacion', body: 'Aprobada', created_at: '2026-10-25T04:00:00Z' },
    ];
    expect(orderedCalendarHistory(comments).map(c => [c.id, c.author_name, c.body])).toEqual([
      ['approved', 'Ana', 'Aprobada'], ['second', 'Luis', 'Cambiar la música'], ['first', 'Ana', 'Cambiar el cierre'],
    ]);
    expect(comments[0].id).toBe('first');
  });
  it('shows request dates and times in Costa Rica even across the UTC day boundary', () => {
    expect(calendarHistoryTime('2026-10-25T03:46:00Z')).toBe('24/10/2026, 21:46');
  });
});