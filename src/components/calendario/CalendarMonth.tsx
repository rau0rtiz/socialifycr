import { ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { itemThumb, monthGrid, monthLabel, dayLabel, STATUS_LABEL } from '@/lib/calendar-media';

export interface CalendarItem {
  id: string;
  title: string;
  copy: string | null;
  explanation: string | null;
  platform: string | null;
  content_type: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  publish_date: string | null;
  status: string;
  cover_status?: string | null;
  sort: number;
  clickup_url?: string | null;
  clickup_sync_error?: string | null;
}

export const statusDot = (s: string) =>
  s === 'aprobado' || s === 'aprobada' ? 'bg-success' : s === 'cambios' ? 'bg-warning' : 'bg-muted-foreground/50';

export const StatusPill = ({ status, labels }: { status: string; labels?: Record<string, string> }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
      (status === 'aprobado' || status === 'aprobada') && 'bg-success/15 text-success',
      status === 'cambios' && 'bg-warning/15 text-warning',
      status === 'pendiente' && 'bg-muted text-muted-foreground',
    )}
  >
    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(status))} />
    {labels?.[status] ?? STATUS_LABEL[status] ?? status}
  </span>
);

const Thumb = ({ item, className }: { item: CalendarItem; className?: string }) => {
  const src = itemThumb(item.thumbnail_url, item.video_url);
  return src ? (
    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={cn('object-cover', className)} />
  ) : (
    <div className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}>
      <Film className="h-4 w-4" />
    </div>
  );
};

interface Props {
  year: number;
  month: number;
  onMonthChange: (y: number, m: number) => void;
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
  /** Agency only: drop a piece on a day. */
  onDropItem?: (itemId: string, iso: string) => void;
  onDayClick?: (iso: string) => void;
}

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CalendarMonth = ({ year, month, onMonthChange, items, onOpen, onDropItem, onDayClick }: Props) => {
  const grid = monthGrid(year, month);
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    if (!it.publish_date) continue;
    const arr = byDay.get(it.publish_date) ?? [];
    arr.push(it);
    byDay.set(it.publish_date, arr);
  }
  const today = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
  const shift = (d: number) => {
    const t = new Date(Date.UTC(year, month + d, 1));
    onMonthChange(t.getUTCFullYear(), t.getUTCMonth());
  };
  const monthDays = grid.filter((g) => g.inMonth && byDay.has(g.iso));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold first-letter:uppercase sm:text-2xl">{monthLabel(year, month)}</h2>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop / tablet: month grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
          {WEEK.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map(({ iso, inMonth }) => {
            const list = byDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                onDragOver={onDropItem ? (e) => e.preventDefault() : undefined}
                onDrop={onDropItem ? (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) onDropItem(id, iso); } : undefined}
                onClick={onDayClick ? () => onDayClick(iso) : undefined}
                className={cn(
                  'min-h-[118px] rounded-xl border border-border/60 bg-card/60 p-1.5 transition-colors',
                  !inMonth && 'opacity-40',
                  iso === today && 'border-primary/70',
                  onDropItem && 'hover:border-primary/50',
                )}
              >
                <div className={cn('mb-1 text-xs font-medium', iso === today ? 'text-primary' : 'text-muted-foreground')}>
                  {Number(iso.slice(8))}
                </div>
                <div className="space-y-1">
                  {list.map((it) => (
                    <button
                      key={it.id}
                      draggable={!!onDropItem}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                      onClick={(e) => { e.stopPropagation(); onOpen(it); }}
                      className="group block w-full overflow-hidden rounded-lg border border-border/60 bg-background text-left transition hover:border-primary/60"
                    >
                      <div className="relative">
                        <Thumb item={it} className="aspect-[4/3] w-full" />
                        <span className={cn('absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-background', statusDot(it.status))} />
                      </div>
                      <div className="line-clamp-2 px-1.5 py-1 text-[11px] leading-tight">{it.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone: agenda list by day */}
      <div className="space-y-4 md:hidden">
        {monthDays.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay piezas programadas este mes.
          </p>
        )}
        {monthDays.map(({ iso }) => (
          <div key={iso}>
            <div className={cn('mb-2 text-sm font-semibold first-letter:uppercase', iso === today && 'text-primary')}>{dayLabel(iso)}</div>
            <div className="grid grid-cols-2 gap-2">
              {(byDay.get(iso) ?? []).map((it) => (
                <button key={it.id} draggable={!!onDropItem} onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)} onClick={() => onOpen(it)} className="overflow-hidden rounded-xl border border-border/60 bg-card text-left">
                  <Thumb item={it} className="aspect-[4/5] w-full" />
                  <div className="space-y-1 p-2">
                    <div className="line-clamp-2 text-xs font-medium">{it.title}</div>
                    <StatusPill status={it.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { Thumb as CalendarThumb };
