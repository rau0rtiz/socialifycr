export interface CalendarComment {
  id: string;
  item_id: string;
  author_name: string;
  author_type: string;
  kind: string;
  body: string;
  created_at: string;
}

export function orderedCalendarHistory(comments: CalendarComment[]) {
  return [...comments].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function calendarHistoryTime(value: string) {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}