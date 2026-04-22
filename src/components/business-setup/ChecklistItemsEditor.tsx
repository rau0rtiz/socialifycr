import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ChecklistItem } from '@/hooks/use-client-features';

interface ChecklistItemsEditorProps {
  items: ChecklistItem[];
  onSave: (items: ChecklistItem[]) => Promise<void>;
  isSaving: boolean;
}

export const ChecklistItemsEditor = ({ items, onSave, isSaving }: ChecklistItemsEditorProps) => {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(items);

  // Sync from server only when server data changes AND we have no pending edits
  useEffect(() => {
    setLocalItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  const isDirty = useMemo(
    () => JSON.stringify(localItems) !== JSON.stringify(items),
    [localItems, items]
  );

  const addItem = () => {
    setLocalItems([...localItems, { key: `custom_${Date.now()}`, label: '' }]);
  };

  const removeItem = (key: string) => {
    setLocalItems(localItems.filter(i => i.key !== key));
  };

  const updateLabel = (key: string, label: string) => {
    setLocalItems(localItems.map(i => (i.key === key ? { ...i, label } : i)));
  };

  const handleSave = async () => {
    const cleaned = localItems.filter(i => i.label.trim() !== '');
    if (cleaned.length === 0) {
      toast.error('Debe haber al menos un item con texto');
      return;
    }
    try {
      await onSave(cleaned);
      toast.success('Checklist guardado');
    } catch {
      toast.error('Error al guardar el checklist');
    }
  };

  return (
    <div className="space-y-3">
      {localItems.map((item, idx) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
          <Input
            value={item.label}
            onChange={(e) => updateLabel(item.key, e.target.value)}
            placeholder="Ej: Ya vio el video introductorio"
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.key)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={addItem} type="button">
          <Plus className="h-3.5 w-3.5" />
          Agregar item
        </Button>
        <Button
          size="sm"
          className="gap-1.5 flex-1"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          type="button"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isDirty ? 'Guardar cambios' : 'Sin cambios'}
        </Button>
      </div>
    </div>
  );
};
