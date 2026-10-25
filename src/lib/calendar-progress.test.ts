import { describe, it, expect } from 'vitest';
import { calendarProgress, validCalendarTarget } from './calendar-progress';

describe('monthly client calendar goals', () => {
  it('counts only pieces scheduled in the selected month', () => {
    const p = calendarProgress([{ publish_date: '2026-10-02', status: 'aprobado' }, { publish_date: '2026-11-02', status: 'aprobado' }, { publish_date: null, status: 'pendiente' }], '2026-10-01', 10, '2026-10-15');
    expect(p.scheduled).toBe(1); expect(p.approved).toBe(1); expect(p.unscheduled).toBe(1); expect(p.remaining).toBe(9);
  });
  it('flags a delay against elapsed month without counting future dates as completed pace', () => {
    const p = calendarProgress([{ publish_date: '2026-10-30', status: 'aprobado' }], '2026-10-01', 31, '2026-10-15');
    expect(p.expected).toBe(15); expect(p.due).toBe(0); expect(p.gap).toBe(15); expect(p.pace).toBe('behind');
  });
  it('is on track when scheduled coverage to date meets expected pace', () => {
    const items = Array.from({ length: 15 }, () => ({ publish_date: '2026-10-15', status: 'pendiente' }));
    expect(calendarProgress(items, '2026-10-01', 31, '2026-10-15').pace).toBe('on-track');
  });
  it('does not call future months late or invent a missing goal', () => {
    expect(calendarProgress([], '2026-11-01', 20, '2026-10-24').pace).toBe('future');
    expect(calendarProgress([], '2026-10-01', null, '2026-10-24').pace).toBe('unset');
  });
  it('caps visual coverage at 100 percent', () => {
    expect(calendarProgress(Array.from({ length: 3 }, () => ({ publish_date: '2026-10-01', status: 'aprobado' })), '2026-10-01', 2, '2026-10-24').percent).toBe(100);
  });
  it('accepts only positive whole-piece targets within the supported limit', () => {
    expect(validCalendarTarget(19)).toBe(true); expect(validCalendarTarget(0)).toBe(false); expect(validCalendarTarget(1.5)).toBe(false); expect(validCalendarTarget(10001)).toBe(false);
  });
});