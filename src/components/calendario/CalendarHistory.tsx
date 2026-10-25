import { History, MessageSquare, PencilLine, Check } from 'lucide-react';
import { calendarHistoryTime, orderedCalendarHistory, type CalendarComment } from '@/lib/calendar-history';

export function CalendarHistory({ comments }: { comments: CalendarComment[] }) {
  const requests = comments.filter(c => c.kind === 'cambio').length;
  return (
    <section aria-label="Historial de pedidos y notas" className="min-w-0 space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />Historial de pedidos y notas</h3>
        <span className="text-xs text-muted-foreground">{requests} {requests === 1 ? 'pedido de cambios' : 'pedidos de cambios'}</span>
      </div>
      {comments.length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay pedidos ni notas.</p> : (
        <ol className="space-y-3">
          {orderedCalendarHistory(comments).map(c => {
            const Icon = c.kind === 'cambio' ? PencilLine : c.kind === 'aprobacion' ? Check : MessageSquare;
            return (
              <li key={c.id} className="flex min-w-0 gap-3 border-l-2 border-border pl-3">
                <Icon className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="break-words text-sm"><strong>{c.author_name}</strong><span className="text-muted-foreground"> · {c.author_type === 'agencia' ? 'Socialify' : 'Cliente'}</span></div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-medium">{c.kind === 'cambio' ? 'Pidió cambios' : c.kind === 'aprobacion' ? 'Aprobó la pieza' : 'Dejó una nota'}</span>
                    <time dateTime={c.created_at} className="text-muted-foreground">{calendarHistoryTime(c.created_at)} · Costa Rica</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}