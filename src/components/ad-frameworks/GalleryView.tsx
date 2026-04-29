import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Film, GalleryHorizontal, Calendar as CalendarIcon, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { differenceInCalendarDays, parseISO, format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AdVariant, VariantStatus, CreativeType } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension } from '@/hooks/use-ad-frameworks';

const CREATIVE_META: Record<CreativeType, { icon: typeof ImageIcon; label: string }> = {
  photo:    { icon: ImageIcon,         label: 'Foto' },
  reel:     { icon: Film,              label: 'Reel' },
  carousel: { icon: GalleryHorizontal, label: 'Carrusel' },
};

const STATUS_META: Record<VariantStatus, { label: string; cls: string; dotCls: string }> = {
  draft:       { label: 'Pendiente',   cls: 'bg-muted text-muted-foreground',                                              dotCls: 'bg-muted-foreground/40' },
  in_progress: { label: 'En progreso', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',         dotCls: 'bg-amber-500' },
  ready:       { label: 'Listo',       cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300', dotCls: 'bg-emerald-500' },
  published:   { label: 'Subido',      cls: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300',             dotCls: 'bg-blue-500' },
};

const STATUS_ORDER: VariantStatus[] = ['draft', 'in_progress', 'ready', 'published'];

interface Props {
  variants: AdVariant[];
  angles: AdFrameworkDimension[];
  formats: AdFrameworkDimension[];
  hooks: AdFrameworkDimension[];
  onOpenVariant: (id: string) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export const GalleryView = ({
  variants, angles, formats, hooks, onOpenVariant, selectMode, selectedIds, onToggleSelect,
}: Props) => {
  const [angleFilter, setAngleFilter] = useState<Set<string>>(new Set());
  const [formatFilter, setFormatFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<VariantStatus>>(new Set());
  const [search, setSearch] = useState('');

  const toggle = <T,>(set: Set<T>, fn: (s: Set<T>) => void, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    fn(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return variants.filter((v) => {
      if (angleFilter.size > 0 && !angleFilter.has(v.angle_id)) return false;
      if (formatFilter.size > 0 && !formatFilter.has(v.format_id)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(v.status)) return false;
      if (q) {
        const hay = `${v.hook_text ?? ''} ${v.copy ?? ''} ${v.cta ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [variants, angleFilter, formatFilter, statusFilter, search]);

  const hasFilter = angleFilter.size + formatFilter.size + statusFilter.size > 0 || search.length > 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por hook, copy o CTA..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAngleFilter(new Set()); setFormatFilter(new Set()); setStatusFilter(new Set()); setSearch(''); }}
              className="h-8 gap-1 text-xs"
            >
              <X className="h-3 w-3" /> Limpiar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {filtered.length} de {variants.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup label="Ángulo">
            {angles.map((a) => (
              <FilterChip
                key={a.id}
                label={a.label}
                color={a.color}
                active={angleFilter.has(a.id)}
                onClick={() => toggle(angleFilter, setAngleFilter, a.id)}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Formato">
            {formats.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                active={formatFilter.has(f.id)}
                onClick={() => toggle(formatFilter, setFormatFilter, f.id)}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Estado">
            {STATUS_ORDER.map((s) => (
              <FilterChip
                key={s}
                label={STATUS_META[s].label}
                dotCls={STATUS_META[s].dotCls}
                active={statusFilter.has(s)}
                onClick={() => toggle(statusFilter, setStatusFilter, s)}
              />
            ))}
          </FilterGroup>
        </div>
      </Card>

      {/* Galería */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          {hasFilter ? 'No hay variantes con esos filtros.' : 'No hay variantes aún.'}
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((v) => (
            <GalleryCard
              key={v.id}
              variant={v}
              angle={angles.find((a) => a.id === v.angle_id)}
              format={formats.find((f) => f.id === v.format_id)}
              hook={hooks.find((h) => h.id === v.hook_id)}
              selectMode={selectMode}
              selected={selectedIds.has(v.id)}
              onClick={() => {
                if (selectMode) onToggleSelect(v.id);
                else onOpenVariant(v.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}:</span>
    {children}
  </div>
);

const FilterChip = ({
  label, active, onClick, color, dotCls,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string | null;
  dotCls?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors',
      active
        ? 'bg-foreground text-background border-foreground'
        : 'bg-background text-foreground border-border hover:border-foreground/40',
    )}
  >
    {color && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
    {dotCls && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotCls)} />}
    {label}
  </button>
);

const GalleryCard = ({
  variant, angle, format, hook, selectMode, selected, onClick,
}: {
  variant: AdVariant;
  angle?: AdFrameworkDimension;
  format?: AdFrameworkDimension;
  hook?: AdFrameworkDimension;
  selectMode: boolean;
  selected: boolean;
  onClick: () => void;
}) => {
  const creative = variant.creative_type ? CREATIVE_META[variant.creative_type] : null;
  const CreativeIcon = creative?.icon;
  const status = STATUS_META[variant.status];
  const accent = angle?.color ?? 'hsl(var(--muted-foreground))';

  // Try to find an image asset for thumbnail
  const thumb = variant.assets.find((a) => a.type === 'image' || /\.(jpe?g|png|webp|gif)$/i.test(a.url));

  let dueLabel: string | null = null;
  let dueCls = '';
  if (variant.due_date) {
    const d = parseISO(variant.due_date);
    const days = differenceInCalendarDays(d, new Date());
    const done = variant.status === 'published';
    if (done) {
      dueLabel = formatDate(d, 'd MMM', { locale: es });
      dueCls = 'text-blue-600 dark:text-blue-400';
    } else if (days < 0) {
      dueLabel = `Vencida ${Math.abs(days)}d`;
      dueCls = 'text-red-600 dark:text-red-400 font-semibold';
    } else if (days === 0) {
      dueLabel = 'Hoy';
      dueCls = 'text-amber-600 dark:text-amber-400 font-semibold';
    } else if (days <= 2) {
      dueLabel = `${formatDate(d, 'd MMM', { locale: es })}`;
      dueCls = 'text-amber-600 dark:text-amber-400';
    } else {
      dueLabel = formatDate(d, 'd MMM', { locale: es });
      dueCls = 'text-muted-foreground';
    }
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[4/5] bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: thumb
            ? `url(${thumb.url})`
            : `linear-gradient(135deg, ${accent}15, ${accent}05)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!thumb && CreativeIcon && (
          <CreativeIcon className="h-12 w-12 opacity-30" style={{ color: accent }} />
        )}
        {!thumb && !CreativeIcon && (
          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
        )}

        {/* Status dot top-right */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 backdrop-blur rounded-full px-2 py-0.5 shadow-sm">
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dotCls)} />
          <span className="text-[9px] font-medium">{status.label}</span>
        </div>

        {/* Selection */}
        {selectMode && (
          <div className={cn(
            'absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
            selected ? 'bg-primary border-primary' : 'bg-background/80 border-border',
          )}>
            {selected && <span className="h-2 w-2 rounded-full bg-background" />}
          </div>
        )}

        {/* Angle band */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-1.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1 flex-wrap">
          {angle && (
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              {angle.label}
            </span>
          )}
          {format && (
            <span className="text-[9px] text-muted-foreground">· {format.label}</span>
          )}
        </div>

        <p className="text-xs font-semibold leading-snug line-clamp-2 flex-1">
          {variant.hook_text || (
            <span className="italic text-muted-foreground font-normal">Sin hook escrito</span>
          )}
        </p>

        {dueLabel && (
          <div className={cn('flex items-center gap-1 text-[10px]', dueCls)}>
            <CalendarIcon className="h-2.5 w-2.5" /> {dueLabel}
          </div>
        )}
      </div>
    </Card>
  );
};
