import { cn } from '@/lib/utils';
import { Check, Calendar, MoreVertical, Trash2, ListTodo, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format as formatDate, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LaunchPhaseTask } from '@/hooks/use-launch-tasks';

interface Props {
  task: LaunchPhaseTask;
  accentColor?: string;
  onClick?: () => void;
  onToggleDone?: (done: boolean) => void;
  onDelete?: () => void;
}

/**
 * Task card — same shape/size as MoldVariantCard so it sits naturally in the
 * unified grid, but uses a distinct violet color identity (dashed border +
 * tinted surface) to clearly differentiate tasks from creative pieces.
 */
export const TaskCard = ({ task, accentColor, onClick, onToggleDone, onDelete }: Props) => {
  const hasDate = !!task.due_date;
  const today = new Date();
  const daysToDue = hasDate ? differenceInCalendarDays(parseISO(task.due_date!), today) : null;
  const isOverdue = daysToDue !== null && daysToDue < 0 && !task.done;
  const isSoon = daysToDue !== null && daysToDue >= 0 && daysToDue <= 2 && !task.done;
  const hasNotes = !!task.description && task.description.trim().length > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-lg overflow-hidden transition-all cursor-pointer',
        'border-2 border-dashed border-violet-400/50 dark:border-violet-400/40',
        'bg-violet-50/60 dark:bg-violet-950/20',
        'hover:shadow-md hover:border-violet-500 dark:hover:border-violet-300',
        task.done && 'opacity-60',
      )}
    >
      {/* Action menu */}
      {onDelete && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Body — mirrors MoldVariantCard padding */}
      <div className="p-2.5 space-y-1.5">
        <Badge
          variant="outline"
          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0 h-4 gap-1 border-violet-400/60 bg-violet-100/70 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
        >
          <ListTodo className="h-2.5 w-2.5" />
          Tarea
        </Badge>

        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone?.(!task.done);
            }}
            className={cn(
              'mt-0.5 h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              task.done
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-violet-400/60 hover:border-violet-600 bg-background',
            )}
          >
            {task.done && <Check className="h-2 w-2" strokeWidth={4} />}
          </button>
          <p
            className={cn(
              'text-sm font-medium line-clamp-2 leading-snug flex-1',
              task.done && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </p>
        </div>

        {hasNotes && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug pl-5">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-violet-700/80 dark:text-violet-300/80">
            {hasNotes ? <FileText className="h-2.5 w-2.5" /> : null}
            {hasNotes ? 'Con notas' : 'Acción'}
          </span>

          {hasDate ? (
            <span className={cn(
              'text-[10px] inline-flex items-center gap-1',
              isOverdue && 'text-red-600 dark:text-red-400 font-medium',
              isSoon && 'text-amber-600 dark:text-amber-400',
              !isOverdue && !isSoon && 'text-muted-foreground',
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(parseISO(task.due_date!), 'd MMM', { locale: es })}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Sin fecha</span>
          )}
        </div>
      </div>
    </div>
  );
};
