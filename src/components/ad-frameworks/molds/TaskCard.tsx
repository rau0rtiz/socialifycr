import { cn } from '@/lib/utils';
import { Check, Calendar as CalendarIcon, MoreVertical, Trash2, ListTodo, FileText } from 'lucide-react';
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
        'group relative bg-card border rounded-lg overflow-hidden transition-all cursor-pointer',
        'hover:shadow-md hover:border-primary/40',
        accentColor && 'border-l-[3px]',
        task.done && 'opacity-60',
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
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
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Tinted header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={accentColor ? { backgroundColor: accentColor + '12' } : undefined}
      >
        <ListTodo className="h-3 w-3" style={accentColor ? { color: accentColor } : undefined} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Tarea
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone?.(!task.done);
            }}
            className={cn(
              'mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              task.done
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/40 hover:border-primary',
            )}
          >
            {task.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </button>
          <p
            className={cn(
              'text-sm font-semibold leading-snug flex-1',
              task.done && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </p>
        </div>

        {hasNotes && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-6 leading-snug">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap pl-6">
          {hasDate ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full text-[10px] font-medium px-2 py-0.5 border',
                isOverdue && 'bg-destructive/10 text-destructive border-destructive/30',
                isSoon && 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                !isOverdue && !isSoon && 'bg-muted text-foreground/70',
              )}
            >
              <CalendarIcon className="h-2.5 w-2.5" />
              {formatDate(parseISO(task.due_date!), 'd MMM', { locale: es })}
              {isOverdue && ' · vencida'}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Sin fecha</span>
          )}
          {hasNotes && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
              <FileText className="h-2.5 w-2.5" /> Notas
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
