export interface ProgressItem { publish_date: string | null; status: string }

export function calendarProgress(items: ProgressItem[], month: string, target: number | null, today: string) {
  const monthly = items.filter((item) => item.publish_date?.startsWith(month.slice(0, 7)));
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const end = `${month.slice(0, 7)}-${days}`;
  const elapsed = today < month ? 0 : today > end ? days : Number(today.slice(8, 10));
  const expected = target ? Math.ceil(target * elapsed / days) : 0;
  const due = monthly.filter((item) => (item.publish_date ?? '') <= today).length;
  const gap = Math.max(0, expected - due);
  return {
    scheduled: monthly.length,
    approved: monthly.filter((item) => item.status === 'aprobado').length,
    changes: monthly.filter((item) => item.status === 'cambios').length,
    unscheduled: items.filter((item) => !item.publish_date).length,
    expected, due, gap,
    remaining: Math.max(0, (target ?? 0) - monthly.length),
    percent: target ? Math.min(100, Math.round(monthly.length / target * 100)) : 0,
    pace: !target ? 'unset' : elapsed === 0 ? 'future' : gap > 0 ? 'behind' : 'on-track',
  };
}

export const calendarToday = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);

export const validCalendarTarget = (value: number) => Number.isInteger(value) && value > 0 && value <= 10000;