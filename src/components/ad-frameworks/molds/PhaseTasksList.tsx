import { useState } from 'react';
import { Check, Plus, Trash2, Calendar as CalendarIcon, ListTodo, X } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useCreateLaunchTask,
  useDeleteLaunchTask,
  useUpdateLaunchTask,
  type LaunchPhaseTask,
} from '@/hooks/use-launch-tasks';

interface Props {
  campaignId: string;
  phaseId: string;
  tasks: LaunchPhaseTask[];
  accentColor: string;
}

export const PhaseTasksList = ({ campaignId, phaseId, tasks, accentColor }: Props) => {
  const create = useCreateLaunchTask();
  const update = useUpdateLaunchTask();
  const remove = useDeleteLaunchTask();

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
  const doneCount = tasks.filter((t) => t.done).length;

  const handleAdd = async () => {
    const t = newTitle.trim();
    if (!t) return;
    await create.mutateAsync({ campaign_id: campaignId, phase_id: phaseId, title: t, position: tasks.length });
    setNewTitle('');
    setAdding(false);
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ListTodo className="h-3.5 w-3.5" style={{ color: accentColor }} />
        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground/80">Tareas / Acciones</h4>
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground ml-auto">
          {doneCount}/{tasks.length}
        </span>
      </div>

      {sorted.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground italic px-1">
          Sin tareas. Planifica acciones como "Enviar correo de bienvenida" o "Nutrir grupo de WhatsApp".
        </p>
      )}

      <div className="space-y-1">
        {sorted.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={(done) => update.mutate({ id: task.id, done } as any)}
            onChangeTitle={(title) => update.mutate({ id: task.id, title } as any)}
            onChangeDate={(due_date) => update.mutate({ id: task.id, due_date } as any)}
            onDelete={() => remove.mutate({ id: task.id, campaign_id: campaignId })}
          />
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setAdding(false);
                setNewTitle('');
              }
            }}
            placeholder="Ej: Enviar correo de apertura"
            className="h-7 text-xs"
          />
          <Button size="sm" className="h-7 px-2" onClick={handleAdd} disabled={!newTitle.trim()}>
            Añadir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => {
              setAdding(false);
              setNewTitle('');
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" /> Añadir tarea
        </Button>
      )}
    </div>
  );
};

const TaskRow = ({
  task,
  onToggle,
  onChangeTitle,
  onChangeDate,
  onDelete,
}: {
  task: LaunchPhaseTask;
  onToggle: (done: boolean) => void;
  onChangeTitle: (title: string) => void;
  onChangeDate: (date: string | null) => void;
  onDelete: () => void;
}) => {
  const [title, setTitle] = useState(task.title);
  const dateObj = task.due_date ? parseISO(task.due_date) : undefined;

  return (
    <div className="group flex items-center gap-1.5 rounded-md bg-background border px-2 py-1.5">
      <button
        type="button"
        onClick={() => onToggle(!task.done)}
        className={cn(
          'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
          task.done ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary',
        )}
      >
        {task.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim() && title !== task.title) onChangeTitle(title.trim());
        }}
        className={cn(
          'h-6 px-1 border-0 bg-transparent shadow-none text-xs focus-visible:ring-0 focus-visible:ring-offset-0',
          task.done && 'line-through text-muted-foreground',
        )}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-1.5 text-[10px] gap-1 shrink-0',
              dateObj ? 'text-foreground/80' : 'text-muted-foreground/60',
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {dateObj ? formatDate(dateObj, 'd MMM', { locale: es }) : ''}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={(d) => onChangeDate(d ? d.toISOString().slice(0, 10) : null)}
            initialFocus
            className="p-3 pointer-events-auto"
            locale={es}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
