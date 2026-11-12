import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import {
  ContentPlanData, PlanPiece, PlanTodo, PIECE_TYPES, USAGE_LABEL, GOAL_LABEL,
  resizePieces, emptyPiece, uid, PlanUsage, PlanGoal,
} from '@/lib/content-plan';

const TodoList = ({ todos, onChange, placeholder }: { todos: PlanTodo[]; onChange: (t: PlanTodo[]) => void; placeholder: string }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...todos, { id: uid(), text: draft.trim(), done: false }]);
    setDraft('');
  };
  return (
    <div className="space-y-1.5">
      {todos.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <Checkbox checked={t.done} onCheckedChange={(v) => onChange(todos.map((x) => x.id === t.id ? { ...x, done: !!v } : x))} />
          <Input value={t.text} className="h-8" onChange={(e) => onChange(todos.map((x) => x.id === t.id ? { ...x, text: e.target.value } : x))} />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onChange(todos.filter((x) => x.id !== t.id))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={draft} className="h-8" placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

const PieceCard = ({ piece, index, total, onChange, onMove, onRemove }: {
  piece: PlanPiece; index: number; total: number;
  onChange: (p: PlanPiece) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void;
}) => {
  const [tagDraft, setTagDraft] = useState('');
  const set = <K extends keyof PlanPiece>(k: K, v: PlanPiece[K]) => onChange({ ...piece, [k]: v });
  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !piece.tags.includes(t)) set('tags', [...piece.tags, t]);
    setTagDraft('');
  };
  return (
    <div className="rounded-lg border p-3 space-y-3 bg-card">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-primary w-7">{String(index + 1).padStart(2, '0')}</span>
        <Input value={piece.title} onChange={(e) => set('title', e.target.value)} placeholder="Título de la pieza" className="h-9" />
        <Select value={piece.type} onValueChange={(v) => set('type', v)}>
          <SelectTrigger className="h-9 w-32 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>{PIECE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {(Object.keys(USAGE_LABEL) as PlanUsage[]).map((u) => (
          <Button key={u} type="button" size="sm" variant={piece.usage === u ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => set('usage', u)}>{USAGE_LABEL[u]}</Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {(Object.keys(GOAL_LABEL) as Exclude<PlanGoal, ''>[]).map((g) => (
          <Button key={g} type="button" size="sm" variant={piece.goal === g ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => set('goal', piece.goal === g ? '' : g)}>{GOAL_LABEL[g]}</Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {piece.tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {t}<button type="button" onClick={() => set('tags', piece.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="+ etiqueta" className="h-7 w-28 text-xs"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} onBlur={addTag} />
      </div>
      <Textarea value={piece.description} onChange={(e) => set('description', e.target.value)} placeholder="Descripción del video" className="min-h-[70px] text-sm" />
      <div className="grid sm:grid-cols-2 gap-2">
        <Textarea value={piece.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Guion / notas (opcional)" className="min-h-[60px] text-sm" />
        <Textarea value={piece.references} onChange={(e) => set('references', e.target.value)} placeholder="Links de referencia (opcional)" className="min-h-[60px] text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Pendientes de esta pieza</Label>
        <TodoList todos={piece.todos} onChange={(t) => set('todos', t)} placeholder="Agregar pendiente…" />
      </div>
    </div>
  );
};

export default function ContentPlanEditor({ value, onChange }: { value: ContentPlanData; onChange: (d: ContentPlanData) => void }) {
  const set = <K extends keyof ContentPlanData>(k: K, v: ContentPlanData[K]) => onChange({ ...value, [k]: v });
  const pieces = value.pieces;
  const updatePiece = (i: number, p: PlanPiece) => set('pieces', pieces.map((x, j) => j === i ? p : x));
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...pieces];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    set('pieces', arr);
  };
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_160px] gap-3">
        <div className="space-y-1.5">
          <Label>Descripción general</Label>
          <Textarea value={value.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Objetivo del plan, contexto de la producción…" className="min-h-[70px]" />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Fecha de producción</Label>
            <Input type="date" value={value.productionDate} onChange={(e) => set('productionDate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad de piezas</Label>
            <Input type="number" min={0} max={60} value={pieces.length} onChange={(e) => set('pieces', resizePieces(pieces, Number(e.target.value)))} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Piezas</Label>
        {pieces.map((p, i) => (
          <PieceCard key={p.id} piece={p} index={i} total={pieces.length}
            onChange={(np) => updatePiece(i, np)} onMove={(d) => move(i, d)}
            onRemove={() => set('pieces', pieces.filter((_, j) => j !== i))} />
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => set('pieces', [...pieces, emptyPiece(pieces.length + 1)])}>
          <Plus className="h-4 w-4" /> Agregar pieza
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label>Pendientes del plan</Label>
        <TodoList todos={value.todos} onChange={(t) => set('todos', t)} placeholder="Ej: confirmar locación, enviar guion al cliente…" />
      </div>
      <div className="space-y-1.5">
        <Label>HTML extra (opcional)</Label>
        <Textarea value={value.extraHtml} onChange={(e) => set('extraHtml', e.target.value)} placeholder="<div>…</div> — se muestra al final del plan" className="min-h-[80px] font-mono text-xs" />
      </div>
    </div>
  );
}
