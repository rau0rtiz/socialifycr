import { useEffect, useState } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUpdateLaunchTask, useDeleteLaunchTask, type LaunchPhaseTask } from '@/hooks/use-launch-tasks';

interface Props {
  task: LaunchPhaseTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDetailSheet = ({ task, open, onOpenChange }: Props) => {
  const update = useUpdateLaunchTask();
  const remove = useDeleteLaunchTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueDate(task.due_date);
      setDone(task.done);
    }
  }, [task]);

  if (!task) return null;

  const dirty =
    title.trim() !== task.title ||
    (description ?? '') !== (task.description ?? '') ||
    dueDate !== task.due_date ||
    done !== task.done;

  const handleSave = async () => {
    if (!title.trim()) return;
    await update.mutateAsync({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate,
      done,
    } as any);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await remove.mutateAsync({ id: task.id, campaign_id: task.campaign_id });
    onOpenChange(false);
  };

  const dateObj = dueDate ? parseISO(dueDate) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar tarea</SheetTitle>
          <SheetDescription>
            Planifica acciones del lanzamiento como correos, nutrición de comunidad o ideas.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Enviar correo de apertura"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-xs">Notas / contenido</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pega aquí el texto del correo, ideas para nutrir la comunidad, brief, etc."
              rows={10}
              className="resize-y min-h-[180px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateObj && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateObj ? formatDate(dateObj, 'PPP', { locale: es }) : 'Sin fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={(d) => setDueDate(d ? d.toISOString().slice(0, 10) : null)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={es}
                  />
                  {dueDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setDueDate(null)}
                      >
                        Limpiar fecha
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Button
                type="button"
                variant={done ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setDone(!done)}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center',
                    done ? 'bg-primary-foreground border-primary-foreground' : 'border-current',
                  )}
                >
                  {done && <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />}
                </div>
                {done ? 'Completada' : 'Pendiente'}
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-between sm:justify-between gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !dirty || update.isPending}>
              Guardar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
