import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar, Image as ImageIcon, MoreVertical, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format as formatDate, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdVariant, VariantStatus } from '@/hooks/use-ad-variants';

const STATUS_META: Record<VariantStatus, { label: string; dotCls: string; chipCls: string }> = {
  draft:       { label: 'Pendiente',   dotCls: 'bg-muted-foreground/40',
                  chipCls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En progreso', dotCls: 'bg-amber-500',
                  chipCls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  ready:       { label: 'Listo',       dotCls: 'bg-emerald-500',
                  chipCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  published:   { label: 'Subido',      dotCls: 'bg-blue-500',
                  chipCls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
};

interface Props {
  variant: AdVariant;
  contentTypeLabel?: string;
  accentColor?: string;
  onClick?: () => void;
  onDelete?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  showDragHandle?: boolean;
  compact?: boolean;
}

export const MoldVariantCard = ({
  variant: v, contentTypeLabel, accentColor, onClick, onDelete, selectMode, selected, showDragHandle, compact,
}: Props) => {
  const status = STATUS_META[v.status];
  const hasAsset = v.assets && v.assets.length > 0;
  const hasDate = !!v.due_date;
  const today = new Date();
  const daysToDue = hasDate ? differenceInCalendarDays(parseISO(v.due_date!), today) : null;
  const isOverdue = daysToDue !== null && daysToDue < 0 && v.status !== 'published';
  const isSoon = daysToDue !== null && daysToDue >= 0 && daysToDue <= 2 && v.status !== 'published';
  const isDone = v.status === 'ready' || v.status === 'published';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card border rounded-lg overflow-hidden transition-all cursor-pointer',
        'hover:shadow-md hover:border-primary/40',
        selected && 'ring-2 ring-primary',
        accentColor && 'border-l-[3px]',
        isDone && 'opacity-70',
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      {/* Drag handle */}
      {showDragHandle && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      )}

      {/* Selection checkbox visual */}
      {selectMode && (
        <div className="absolute top-2 right-2 z-10">
          <div className={cn(
            'h-4 w-4 rounded border-2 flex items-center justify-center',
            selected ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40',
          )}>
            {selected && <span className="text-[10px] text-primary-foreground">✓</span>}
          </div>
        </div>
      )}

      {/* Action menu */}
      {!selectMode && onDelete && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Body */}
      <div className={cn('p-2.5 space-y-1.5', compact && 'p-2')}>
        {contentTypeLabel && (
          <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0 h-4">
            {contentTypeLabel}
          </Badge>
        )}

        {(v.title || v.hook_text) && (
          <p className="text-sm font-medium line-clamp-2 leading-snug">
            {v.title || v.hook_text}
          </p>
        )}

        {!v.title && !v.hook_text && !v.copy && (
          <p className="text-xs text-muted-foreground italic">Sin contenido</p>
        )}

        {!v.title && v.copy && !v.hook_text && (
          <p className="text-xs text-muted-foreground line-clamp-2">{v.copy}</p>
        )}

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1', status.chipCls)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dotCls)} />
            {status.label}
          </span>

          {hasDate && (
            <span className={cn(
              'text-[10px] inline-flex items-center gap-1',
              isOverdue && 'text-red-600 dark:text-red-400 font-medium',
              isSoon && 'text-amber-600 dark:text-amber-400',
              !isOverdue && !isSoon && 'text-muted-foreground',
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(parseISO(v.due_date!), 'd MMM', { locale: es })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
