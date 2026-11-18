import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Play, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ContentPlanData, PlanPiece, PlanTodo, PIECE_TYPES, USAGE_LABEL, GOAL_LABEL,
  resizePieces, emptyPiece, uid, PlanUsage, PlanGoal, splitRefs, referenceEmbed, referencePlatform, buildContentPlanHtml,
} from '@/lib/content-plan';

const USAGE_TONE: Record<PlanUsage, string> = {
  anuncio: 'border-t-primary', organico: 'border-t-[hsl(100_36%_35%)]', ambos: 'border-t-foreground',
};
const NUM_TONE: Record<PlanUsage, string> = {
  anuncio: 'bg-primary/15 text-primary', organico: 'bg-[hsl(100_36%_35%/0.15)] text-[hsl(100_36%_35%)]', ambos: 'bg-muted text-foreground',
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground">{label}{hint && <span className="font-normal opacity-70"> · {hint}</span>}</p>
    {children}
  </div>
);

const TodoList = ({ todos, onChange, placeholder }: { todos: PlanTodo[]; onChange: (t: PlanTodo[]) => void; placeholder: string }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...todos, { id: uid(), text: draft.trim(), done: false }]);
    setDraft('');
  };
  return (
    <div className="divide-y">
      {todos.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-1.5">
          <Checkbox checked={t.done} onCheckedChange={(v) => onChange(todos.map((x) => x.id === t.id ? { ...x, done: !!v } : x))} />
          <input value={t.text} className={cn('flex-1 bg-transparent text-sm outline-none', t.done && 'line-through text-muted-foreground')}
            onChange={(e) => onChange(todos.map((x) => x.id === t.id ? { ...x, text: e.target.value } : x))} />
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange(todos.filter((x) => x.id !== t.id))}><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <div className="flex items-center gap-2 py-1.5">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <input value={draft} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)} onBlur={add}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      </div>
    </div>
  );
};

const RefPreview = ({ url, resolved }: { url: string; resolved: Record<string, string> }) => {
  const e = referenceEmbed(url, resolved);
  return (
    <div className="space-y-1.5">
      {e && <iframe src={e.src} title="Referencia" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen
        className={cn('w-full rounded-lg border-0 bg-foreground', e.vertical ? 'aspect-[9/16] max-h-[420px]' : 'aspect-video')} />}
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary"><Play className="h-3.5 w-3.5" /></span>
        <span className="truncate">Abrir en {referencePlatform(url, resolved)}</span>
      </a>
    </div>
  );
};

const PieceCard = ({ piece, index, total, open, resolved, onToggle, onChange, onMove, onRemove, onRefsBlur }: {
  piece: PlanPiece; index: number; total: number; open: boolean; resolved: Record<string, string>;
  onToggle: () => void; onChange: (p: PlanPiece) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onRefsBlur: () => void;
}) => {
  const [tagDraft, setTagDraft] = useState('');
  const set = <K extends keyof PlanPiece>(k: K, v: PlanPiece[K]) => onChange({ ...piece, [k]: v });
  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !piece.tags.includes(t)) set('tags', [...piece.tags, t]);
    setTagDraft('');
  };
  const refs = splitRefs(piece.references);
  const filled = [piece.description, piece.hook, refs.length].filter(Boolean).length;
  return (
    <div className={cn('overflow-hidden rounded-xl border border-t-4 bg-card', USAGE_TONE[piece.usage])}>
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter') onToggle(); }}
        className={cn('flex cursor-pointer items-start gap-3 p-4', open && 'border-b')}>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold', NUM_TONE[piece.usage])}>{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className={cn('rounded-full px-2 py-0.5', NUM_TONE[piece.usage])}>{USAGE_LABEL[piece.usage]}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{piece.type}</span>
            {piece.goal && <span className="rounded-full bg-foreground px-2 py-0.5 text-background">{GOAL_LABEL[piece.goal]}</span>}
          </div>
          <p className="truncate font-semibold">{piece.title || `Pieza ${index + 1}`}</p>
          {!open && <p className="truncate text-sm text-muted-foreground">{piece.hook || (filled ? `${filled} de 3 datos clave listos` : 'Sin llenar todavía')}</p>}
        </div>
        <ChevronDown className={cn('mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </div>
      {open && (
        <div className="grid md:grid-cols-[minmax(200px,34%)_1fr]">
          <div className="space-y-3 border-b bg-muted/30 p-4 md:border-b-0 md:border-r">
            <Field label="Referencias" hint="pegá links de TikTok, IG o YouTube">
              <Textarea value={piece.references} onChange={(e) => set('references', e.target.value)} onBlur={onRefsBlur}
                placeholder="https://vt.tiktok.com/…" className="min-h-[60px] bg-card text-xs" />
            </Field>
            {refs.map((r) => <RefPreview key={r} url={r} resolved={resolved} />)}
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
              <Field label="Título"><Input value={piece.title} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="Formato">
                <Select value={piece.type} onValueChange={(v) => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PIECE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Uso y objetivo">
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(USAGE_LABEL) as PlanUsage[]).map((u) => (
                  <Button key={u} type="button" size="sm" variant={piece.usage === u ? 'default' : 'outline'} className="h-7 rounded-full text-xs" onClick={() => set('usage', u)}>{USAGE_LABEL[u]}</Button>
                ))}
                <span className="mx-1 h-5 w-px bg-border" />
                {(Object.keys(GOAL_LABEL) as Exclude<PlanGoal, ''>[]).map((g) => (
                  <Button key={g} type="button" size="sm" variant={piece.goal === g ? 'default' : 'outline'} className="h-7 rounded-full text-xs" onClick={() => set('goal', piece.goal === g ? '' : g)}>{GOAL_LABEL[g]}</Button>
                ))}
                {piece.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {t}<button type="button" onClick={() => set('tags', piece.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="+ etiqueta" className="h-7 w-24 rounded-full text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} onBlur={addTag} />
              </div>
            </Field>
            <Field label="Gancho" hint="la primera frase"><Input value={piece.hook} onChange={(e) => set('hook', e.target.value)} placeholder="“Si vas a…, no cometás este error”" /></Field>
            <Field label="Contenido"><Textarea value={piece.description} onChange={(e) => set('description', e.target.value)} placeholder="De qué trata el video" className="min-h-[70px]" /></Field>
            <Field label="Guion / notas" hint="opcional"><Textarea value={piece.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-[50px]" /></Field>
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <Field label="Propuesta visual" hint="opcional"><Textarea value={piece.visual} onChange={(e) => set('visual', e.target.value)} placeholder="Tomas, edición, ritmo…" className="min-h-[50px] bg-card" /></Field>
            </div>
            <Field label="Llamado a la acción" hint="opcional"><Input value={piece.cta} onChange={(e) => set('cta', e.target.value)} placeholder="“Agendá por WhatsApp”" /></Field>
            <div className="border-t pt-3">
              <Field label="Lo que necesitamos"><TodoList todos={piece.todos} onChange={(t) => set('todos', t)} placeholder="Agregar algo que hace falta…" /></Field>
            </div>
            <div className="flex items-center justify-end gap-1 border-t pt-3">
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /> Quitar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const STEPS = ['El plan', 'Piezas', 'Checklist general', 'Revisar'];

export default function ContentPlanEditor({ value, onChange, title = 'Plan de contenido', clientName = '' }: {
  value: ContentPlanData; onChange: (d: ContentPlanData) => void; title?: string; clientName?: string;
}) {
  const [step, setStep] = useState(0);
  const [openId, setOpenId] = useState<string | null>(value.pieces[0]?.id ?? null);
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const set = <K extends keyof ContentPlanData>(k: K, v: ContentPlanData[K]) => onChange({ ...value, [k]: v });
  const pieces = value.pieces;
  const resolved = value.resolvedRefs || {};
  const updatePiece = (i: number, p: PlanPiece) => set('pieces', pieces.map((x, j) => j === i ? p : x));
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...pieces];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    set('pieces', arr);
  };

  const resolveRefs = async () => {
    const cur = latest.current;
    const pending = cur.pieces.flatMap((p) => splitRefs(p.references))
      .filter((u) => !(cur.resolvedRefs || {})[u] && !referenceEmbed(u) && /tiktok|fb\.watch|youtu|instagram|facebook/.test(u));
    if (!pending.length) return;
    const { data } = await supabase.functions.invoke('resolve-reference-urls', { body: { urls: [...new Set(pending)] } });
    if (data?.resolved) {
      const now = latest.current;
      onChange({ ...now, resolvedRefs: { ...(now.resolvedRefs || {}), ...data.resolved } });
    }
  };
  useEffect(() => { resolveRefs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = pieces.filter((p) => p.description || p.hook).length;

  return (
    <div className="space-y-5">
      <ol className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <button type="button" onClick={() => setStep(i)}
              className={cn('flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
                i === step ? 'bg-foreground text-background' : i < step ? 'text-foreground' : 'text-muted-foreground')}>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold',
                i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/15 text-primary' : 'bg-muted')}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>{s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-5 rounded-xl border bg-card p-5">
          <div>
            <p className="text-sm font-semibold text-primary">{clientName || 'Cliente'}</p>
            <h3 className="text-2xl font-bold tracking-tight">{title || 'Plan de contenido'}</h3>
          </div>
          <Field label="Descripción general" hint="aparece debajo del título">
            <Textarea value={value.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Qué buscamos con esta producción…" className="min-h-[90px]" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de producción"><Input type="date" value={value.productionDate} onChange={(e) => set('productionDate', e.target.value)} /></Field>
            <Field label="Cantidad de piezas">
              <Input type="number" min={0} max={60} value={pieces.length} onChange={(e) => set('pieces', resizePieces(pieces, Number(e.target.value)))} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{ready} de {pieces.length} piezas con contenido. Abrí cada una y llenala como se verá en el plan.</p>
          {pieces.map((p, i) => (
            <PieceCard key={p.id} piece={p} index={i} total={pieces.length} open={openId === p.id} resolved={resolved}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onChange={(np) => updatePiece(i, np)} onMove={(d) => move(i, d)} onRefsBlur={resolveRefs}
              onRemove={() => set('pieces', pieces.filter((_, j) => j !== i))} />
          ))}
          <Button type="button" variant="outline" className="w-full gap-1.5 border-dashed" onClick={() => {
            const np = emptyPiece(pieces.length + 1); set('pieces', [...pieces, np]); setOpenId(np.id);
          }}><Plus className="h-4 w-4" /> Agregar pieza</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card px-5 py-3">
            <p className="mb-1 text-sm font-semibold">Recomendaciones generales</p>
            <TodoList todos={value.todos} onChange={(t) => set('todos', t)} placeholder="Ej: subtítulos en todos los videos…" />
          </div>
          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">HTML extra (opcional)</summary>
            <Textarea value={value.extraHtml} onChange={(e) => set('extraHtml', e.target.value)} placeholder="<div>…</div> — se muestra al final del plan" className="mt-3 min-h-[80px] font-mono text-xs" />
          </details>
        </div>
      )}

      {step === 3 && (
        <iframe title="Vista previa plan" srcDoc={buildContentPlanHtml(value, title || 'Plan de contenido', clientName)}
          sandbox="allow-same-origin allow-popups allow-scripts" className="h-[65dvh] w-full rounded-xl border bg-background" />
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" /> Atrás</Button>
        {step < STEPS.length - 1 && <Button type="button" onClick={() => setStep(step + 1)} className="gap-1">{STEPS[step + 1]} <ChevronRight className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
