import { CalendarDays, ChevronRight, Clapperboard, FileText, Film, Image as ImageIcon, Layers, Mail, Smartphone, Camera, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '@/components/calendario/CalendarMonth';
import { dayLabel } from '@/lib/calendar-media';

/** Presentation-only mapping of existing piece types. */
const TYPE_META: Record<string, { label: string; short: string; icon: LucideIcon }> = {
  reel: { label: 'Reel', short: 'REEL', icon: Film },
  tiktok: { label: 'TikTok', short: 'TIKTOK', icon: Film },
  short: { label: 'Short', short: 'SHORT', icon: Film },
  story: { label: 'Historia', short: 'HIST.', icon: Smartphone },
  foto: { label: 'Foto', short: 'FOTO', icon: Camera },
  post: { label: 'Post', short: 'POST', icon: ImageIcon },
  carrusel: { label: 'Carrusel', short: 'CAR.', icon: Layers },
  diseno: { label: 'Diseño', short: 'DISEÑO', icon: Palette },
  correo: { label: 'Correo', short: 'CORREO', icon: Mail },
  video: { label: 'Video', short: 'VIDEO', icon: Clapperboard },
};
const FALLBACK = { label: 'Contenido', short: 'CONT.', icon: FileText };
export const typeMeta = (t: string | null | undefined) => TYPE_META[t ?? ''] ?? FALLBACK;

/** Same rule the "por revisar" counter has always used. */
export const needsReview = (i: CalendarItem) => i.status !== 'aprobado';

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  aprobado: { label: 'Aprobado', cls: 'bg-success/15 text-success', dot: 'bg-success' },
  aprobada: { label: 'Aprobada', cls: 'bg-success/15 text-success', dot: 'bg-success' },
  cambios: { label: 'Cambios solicitados', cls: 'bg-destructive/15 text-destructive', dot: 'bg-destructive' },
  pendiente: { label: 'Por revisar', cls: 'bg-warning/15 text-warning', dot: 'bg-warning' },
};
export const statusMeta = (s: string | null | undefined) => STATUS[s ?? 'pendiente'] ?? { label: s ?? '', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };

export function TypeBadge({ type, className }: { type: string | null; className?: string }) {
  const m = typeMeta(type); const Icon = m.icon;
  return <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', className)}><Icon className="h-3.5 w-3.5 text-primary" aria-hidden />{m.label}</span>;
}

export function StatusChip({ status, label }: { status: string | null | undefined; label?: string }) {
  const m = statusMeta(status);
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', m.cls)}><span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />{label ?? m.label}</span>;
}

/** Preview uploaded by the agency with a type label on top; typographic fallback when there is none. */
export function TypePlaceholder({ item, className }: { item: CalendarItem; className?: string }) {
  const m = typeMeta(item.content_type); const Icon = m.icon;
  if (item.thumbnail_url) return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-secondary', className)}>
      <img src={item.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-foreground"><Icon className="h-3 w-3 text-primary" />{m.short}</span>
    </div>
  );
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary text-center', className)} aria-hidden>
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">{m.short}</span>
    </div>
  );
}

export function PieceCard({ item, onOpen }: { item: CalendarItem; onOpen: () => void }) {
  const review = needsReview(item);
  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <TypePlaceholder item={item} className="h-24 w-20 shrink-0 sm:h-28 sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <TypeBadge type={item.content_type} />
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.title}</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground first-letter:uppercase"><CalendarDays className="h-3.5 w-3.5" />{item.publish_date ? dayLabel(item.publish_date) : 'Por programar'}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <StatusChip status={item.status} />
          <button type="button" onClick={onOpen} className={cn('inline-flex min-h-11 items-center gap-1 rounded-xl px-4 text-sm font-semibold', review ? 'bg-primary text-primary-foreground' : 'border border-border bg-secondary text-foreground')}>
            {review ? 'Revisar' : 'Ver pieza'}<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

const WEEK = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function PublicMonthGrid({ year, month, items, selected, onSelect, onOpen }: {
  year: number; month: number; items: CalendarItem[]; selected: string | null;
  onSelect: (iso: string) => void; onOpen: (i: CalendarItem) => void;
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`)];
  while (cells.length % 7) cells.push(null);
  const today = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
  const byDay = (iso: string) => items.filter((i) => i.publish_date === iso).sort((a, b) => a.sort - b.sort);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-[10px] font-semibold tracking-wider text-muted-foreground sm:text-xs">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={idx} className="min-h-14 sm:min-h-28" />;
          const list = byDay(iso); const sel = selected === iso;
          const label = list.length ? `${Number(iso.slice(8))}: ${list.map((i) => `${typeMeta(i.content_type).label} ${i.title}, ${statusMeta(i.status).label}`).join('; ')}` : undefined;
          return (
            <div key={iso} role={list.length ? 'button' : undefined} tabIndex={list.length ? 0 : -1} aria-label={label} aria-pressed={list.length ? sel : undefined}
              onClick={() => list.length && onSelect(iso)} onKeyDown={(e) => { if (list.length && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(iso); } }}
              className={cn('flex min-h-14 min-w-0 flex-col rounded-lg border p-1 sm:min-h-28 sm:p-1.5', list.length ? 'cursor-pointer border-border bg-card' : 'border-transparent bg-card/40', sel && 'border-primary ring-1 ring-primary')}>
              <span className={cn('text-[11px] font-semibold sm:text-xs', iso === today ? 'text-primary' : list.length ? 'text-foreground' : 'text-muted-foreground')}>{Number(iso.slice(8))}</span>
              {list.length > 0 && <>
                {/* Mobile: icon + short label + status dot */}
                <div className="mt-0.5 flex flex-1 flex-col items-center justify-center gap-0.5 sm:hidden">
                  {(() => { const m = typeMeta(list[0].content_type); const Icon = m.icon; return <>{list[0].thumbnail_url ? <img src={list[0].thumbnail_url} alt="" loading="lazy" className="h-7 w-6 rounded object-cover" /> : <Icon className="h-4 w-4 text-primary" />}<span className="max-w-full truncate text-[8px] font-bold leading-none">{m.short}</span></>; })()}
                  <span className="flex items-center gap-0.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta(list[0].status).dot)} />
                    {list.length > 1 && <span className="text-[9px] font-semibold text-muted-foreground">+{list.length - 1}</span>}
                  </span>
                </div>
                {/* Tablet/desktop: mini cards */}
                <div className="mt-1 hidden flex-col gap-1 sm:flex">
                  {list.slice(0, 2).map((i) => (
                    <button key={i.id} type="button" onClick={(e) => { e.stopPropagation(); onOpen(i); }} className="rounded-md bg-secondary p-1.5 text-left hover:bg-accent">
                      {i.thumbnail_url && <img src={i.thumbnail_url} alt="" loading="lazy" className="mb-1 aspect-[4/5] w-full rounded object-cover" />}
                      <TypeBadge type={i.content_type} className="text-[9px]" />
                      <div className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight">{i.title}</div>
                      <div className="mt-1"><StatusChip status={i.status} /></div>
                    </button>
                  ))}
                  {list.length > 2 && <span className="text-[10px] font-semibold text-muted-foreground">+{list.length - 2} más</span>}
                </div>
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
