import { useEffect, useState } from 'react';
import {
  Check, Copy, Trash2, ChevronDown, ChevronUp, Pencil, Lock,
  GripVertical, ArrowUp, ArrowDown, ExternalLink, Sparkles,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { SheetShot } from '@/hooks/use-production-sheets';

const CONTENT_TYPES = [
  { value: 'reel', label: 'Reel', icon: '🎬' },
  { value: 'story', label: 'Story', icon: '📱' },
  { value: 'post', label: 'Post', icon: '🖼️' },
  { value: 'foto', label: 'Foto', icon: '📷' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'short', label: 'Short', icon: '▶️' },
  { value: 'otro', label: 'Otro', icon: '🎞️' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'multi', label: 'Multi' },
];

function typeMeta(t?: string | null) {
  return CONTENT_TYPES.find(x => x.value === t) || { value: 'otro', label: 'Pieza', icon: '🎞️' };
}

interface PieceCardProps {
  shot: SheetShot;
  index: number;
  onChange: (patch: Partial<SheetShot>) => void;
  onToggleRecorded: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDrag?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (dir: 'up' | 'down') => void;
}

export function PieceCard({
  shot,
  index,
  onChange,
  onToggleRecorded,
  onDuplicate,
  onDelete,
  canDrag = false,
  onDragStart,
  onDragEnd,
  canMoveUp = false,
  canMoveDown = false,
  onMove,
}: PieceCardProps) {
  const [dragArmed, setDragArmed] = useState(false);
  const isDraft = !!shot.is_draft;
  const [expanded, setExpanded] = useState(!shot.done || isDraft);
  const [editConcept, setEditConcept] = useState(false);
  const [editScript, setEditScript] = useState(false);
  const meta = typeMeta(shot.content_type);
  const platformLabel = PLATFORMS.find(p => p.value === shot.platform)?.label;

  const [local, setLocal] = useState({
    concept: shot.concept || shot.description || '',
    script: shot.script || '',
    hook: shot.hook || '',
    cta: shot.cta || '',
    tech_notes: shot.tech_notes || '',
  });

  useEffect(() => {
    setLocal({
      concept: shot.concept || shot.description || '',
      script: shot.script || '',
      hook: shot.hook || '',
      cta: shot.cta || '',
      tech_notes: shot.tech_notes || '',
    });
  }, [shot.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      const patch: any = {};
      if (local.concept !== (shot.concept || shot.description || '')) {
        patch.concept = local.concept;
        patch.description = local.concept;
      }
      if (local.script !== (shot.script || '')) patch.script = local.script;
      if (local.hook !== (shot.hook || '')) patch.hook = local.hook;
      if (local.cta !== (shot.cta || '')) patch.cta = local.cta;
      if (local.tech_notes !== (shot.tech_notes || '')) patch.tech_notes = local.tech_notes;
      if (Object.keys(patch).length) onChange(patch);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const conceptEditing = isDraft || editConcept || !local.concept;
  const scriptEditing = isDraft || editScript;

  const handleSaveIdea = () => {
    onChange({ is_draft: false });
    setEditConcept(false);
    setEditScript(false);
    toast.success('Idea guardada — el guion queda bloqueado para evitar edits accidentales.');
  };

  const cardBase = `relative rounded-2xl p-5 transition duration-300 ${
    isDraft
      ? 'border border-dashed border-amber-400 bg-amber-50/40'
      : shot.done
        ? 'bg-noeval-surface border border-emerald-500/30'
        : 'bg-noeval-surface border border-noeval-line hover:border-noeval-accent/60 hover:shadow-[0_12px_40px_-20px_rgba(26,26,26,0.18)]'
  }`;

  if (!expanded) {
    return (
      <div
        draggable={canDrag && dragArmed}
        onDragStart={(e) => { if (!canDrag) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={() => { setDragArmed(false); onDragEnd?.(); }}
        className={cardBase}
      >
        <div className="flex items-center gap-3">
          {canDrag && (
            <div className="no-print hidden md:inline-flex flex-col -ml-1 text-noeval-muted/50 hover:text-noeval-ink">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove?.('up'); }}
                disabled={!canMoveUp}
                className="p-0.5 disabled:opacity-20"
                aria-label="Subir"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove?.('down'); }}
                disabled={!canMoveDown}
                className="p-0.5 disabled:opacity-20"
                aria-label="Bajar"
              >
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
          {canDrag && (
            <button
              type="button"
              onMouseDown={() => setDragArmed(true)}
              onMouseUp={() => setDragArmed(false)}
              onTouchStart={() => setDragArmed(true)}
              onTouchEnd={() => setDragArmed(false)}
              className="no-print hidden md:inline-flex text-noeval-muted/50 hover:text-noeval-ink cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Reordenar"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-noeval-ink text-noeval-cream flex items-center justify-center font-serif text-xl font-bold shrink-0">
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none" title={meta.label}>{meta.icon}</span>
              {shot.done ? (
                <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.25em] uppercase text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} /> Grabada
                </span>
              ) : (
                <span className="inline-flex items-center text-[9px] tracking-[0.25em] uppercase text-noeval-accent bg-noeval-accent/10 border border-noeval-accent/30 font-bold px-2 py-0.5 rounded-full">
                  Pendiente
                </span>
              )}
              {platformLabel && (
                <span className="text-[10px] tracking-[0.2em] uppercase text-noeval-muted font-semibold">
                  · {platformLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 no-print shrink-0">
            <button
              onClick={() => setExpanded(true)}
              className="text-noeval-muted hover:text-noeval-ink p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
              title="Expandir"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="text-noeval-muted hover:text-noeval-ink p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
              title="Duplicar"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-noeval-muted hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {shot.done && local.tech_notes && (
          <div className="mt-3 pt-3 border-t border-noeval-line/40">
            <div className="text-[9px] tracking-[0.3em] uppercase text-noeval-muted mb-1">🎥 Notas técnicas</div>
            <div className="text-sm text-noeval-ink whitespace-pre-wrap font-serif leading-snug">{local.tech_notes}</div>
          </div>
        )}

        {shot.clickup_url && (
          <a
            href={shot.clickup_url}
            target="_blank"
            rel="noreferrer"
            className="no-print absolute top-4 right-14 text-[10px] tracking-[0.2em] uppercase text-noeval-accent hover:underline inline-flex items-center gap-1"
          >
            ClickUp <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      draggable={canDrag && dragArmed}
      onDragStart={(e) => { if (!canDrag) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={() => { setDragArmed(false); onDragEnd?.(); }}
      className={cardBase}
    >
      {isDraft && (
        <div className="mb-4 -mx-5 -mt-5 px-5 py-2.5 bg-amber-100/70 border-b border-amber-300 rounded-t-2xl flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-amber-900 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-semibold">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Borrador · pendiente de guardar
          </div>
          <span className="text-[10px] sm:text-[11px] text-amber-800/80 normal-case tracking-normal">
            Completá la idea y dale <strong>Guardar idea</strong> para confirmarla.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {canDrag && (
            <div className="no-print hidden md:flex flex-col text-noeval-muted/50 hover:text-noeval-ink -ml-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove?.('up'); }}
                disabled={!canMoveUp}
                className="p-0.5 disabled:opacity-20"
                aria-label="Subir"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove?.('down'); }}
                disabled={!canMoveDown}
                className="p-0.5 disabled:opacity-20"
                aria-label="Bajar"
              >
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
          {canDrag && (
            <button
              type="button"
              onMouseDown={() => setDragArmed(true)}
              onMouseUp={() => setDragArmed(false)}
              onTouchStart={() => setDragArmed(true)}
              onTouchEnd={() => setDragArmed(false)}
              className="no-print hidden md:inline-flex text-noeval-muted/50 hover:text-noeval-ink cursor-grab active:cursor-grabbing shrink-0 mt-1"
              aria-label="Reordenar"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-noeval-ink text-noeval-cream flex items-center justify-center font-serif text-xl font-bold shrink-0">
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {shot.done ? (
                <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.25em] uppercase text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} /> Grabada
                </span>
              ) : !isDraft && (
                <span className="inline-flex items-center text-[9px] tracking-[0.25em] uppercase text-noeval-accent bg-noeval-accent/10 border border-noeval-accent/30 font-bold px-2 py-0.5 rounded-full">
                  Pendiente
                </span>
              )}
              <Select value={shot.content_type || 'reel'} onValueChange={(v) => onChange({ content_type: v })}>
                <SelectTrigger className="h-7 bg-transparent border-noeval-line rounded-full text-[10px] tracking-[0.15em] uppercase font-bold px-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={shot.platform || 'instagram'} onValueChange={(v) => onChange({ platform: v })}>
                <SelectTrigger className="h-7 bg-transparent border-noeval-line rounded-full text-[10px] tracking-[0.15em] uppercase font-semibold px-2.5 text-noeval-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-noeval-ink leading-tight">
              {local.concept || '(sin concepto)'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-0.5 no-print shrink-0">
          <button
            onClick={() => setExpanded(false)}
            className="text-noeval-muted hover:text-noeval-ink p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
            title="Colapsar"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="text-noeval-muted hover:text-noeval-ink p-1.5 rounded-lg hover:bg-noeval-line/30 transition"
            title="Duplicar"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-noeval-muted hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Concepto */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Concepto · idea</Label>
          {!isDraft && local.concept && (
            <button
              onClick={() => setEditConcept((v) => !v)}
              className="no-print text-[10px] tracking-[0.2em] uppercase text-noeval-muted hover:text-noeval-ink inline-flex items-center gap-1"
            >
              {editConcept ? <><Check className="h-3 w-3" /> Listo</> : <><Pencil className="h-3 w-3" /> Editar</>}
            </button>
          )}
        </div>
        {conceptEditing ? (
          <input
            value={local.concept}
            onChange={(e) => setLocal({ ...local, concept: e.target.value })}
            placeholder="¿De qué trata esta pieza?"
            autoFocus={editConcept}
            className="w-full bg-transparent font-serif text-2xl sm:text-3xl text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-2 placeholder:text-noeval-muted/40"
          />
        ) : (
          <div
            onDoubleClick={() => setEditConcept(true)}
            className="font-serif text-2xl sm:text-3xl text-noeval-ink leading-snug border-b border-transparent pb-2 cursor-default select-text break-words"
            title="Doble clic para editar"
          >
            {local.concept}
          </div>
        )}
      </div>

      {/* Guion */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-noeval-accent" /> Guion / Copy
          </Label>
          {!isDraft && local.script && (
            <button
              onClick={() => setEditScript((v) => !v)}
              className="no-print text-[10px] tracking-[0.2em] uppercase text-noeval-muted hover:text-noeval-ink inline-flex items-center gap-1"
            >
              {editScript ? <><Check className="h-3 w-3" /> Listo</> : <><Pencil className="h-3 w-3" /> Editar</>}
            </button>
          )}
        </div>
        {scriptEditing || !local.script ? (
          <Textarea
            value={local.script}
            onChange={(e) => setLocal({ ...local, script: e.target.value })}
            placeholder="Escribí el guion completo, copy del post o estructura del story…"
            rows={Math.max(4, local.script.split('\n').length + 2)}
            autoFocus={editScript}
            className="bg-noeval-cream border-noeval-line text-sm resize-y leading-relaxed sm:min-h-[120px] rounded-xl"
          />
        ) : (
          <div
            onDoubleClick={() => setEditScript(true)}
            className="bg-noeval-cream border border-noeval-line rounded-xl px-4 py-3 text-sm text-noeval-ink whitespace-pre-wrap leading-relaxed cursor-default select-text break-words"
            title="Doble clic para editar"
          >
            {local.script}
            <div className="mt-2 flex items-center gap-1 text-[9px] tracking-[0.25em] uppercase text-noeval-muted/70 font-semibold">
              <Lock className="h-2.5 w-2.5" /> Lectura — clic en Editar para modificar
            </div>
          </div>
        )}
      </div>

      {/* Hook, CTA, Notas técnicas */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-noeval-cream/50 rounded-xl p-3 border border-noeval-line/60">
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted mb-1.5 block">⚡ Hook</Label>
            <Input
              value={local.hook}
              onChange={(e) => setLocal({ ...local, hook: e.target.value })}
              placeholder="Primera frase que detiene el scroll"
              className="bg-transparent border-0 border-b border-noeval-line focus:border-noeval-accent rounded-none px-0 text-sm"
            />
          </div>
          <div className="bg-noeval-cream/50 rounded-xl p-3 border border-noeval-line/60">
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted mb-1.5 block">🎯 CTA</Label>
            <Input
              value={local.cta}
              onChange={(e) => setLocal({ ...local, cta: e.target.value })}
              placeholder="Qué pedimos hacer al final"
              className="bg-transparent border-0 border-b border-noeval-line focus:border-noeval-accent rounded-none px-0 text-sm"
            />
          </div>
        </div>
        <div className="bg-noeval-cream/50 rounded-xl p-3 border border-noeval-line/60">
          <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted mb-1.5 block">🎥 Notas técnicas</Label>
          <Textarea
            value={local.tech_notes}
            onChange={(e) => setLocal({ ...local, tech_notes: e.target.value })}
            placeholder="Cámara, ángulos, wardrobe, props, locación específica…"
            rows={2}
            className="bg-transparent border-0 text-sm resize-none px-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 no-print">
        {shot.clickup_url ? (
          <a
            href={shot.clickup_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-noeval-accent hover:underline inline-flex items-center gap-1 self-start"
          >
            Ver en ClickUp <ExternalLink className="h-3 w-3" />
          </a>
        ) : <span className="hidden sm:block" />}

        {isDraft ? (
          <button
            onClick={handleSaveIdea}
            disabled={!local.concept.trim()}
            className="inline-flex items-center justify-center gap-1.5 text-[11px] tracking-[0.25em] uppercase font-semibold rounded-full px-6 py-3 transition w-full sm:w-auto bg-amber-500 text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Guardar idea
          </button>
        ) : (
          <button
            onClick={() => { const wasDone = shot.done; onToggleRecorded(); setExpanded(wasDone); }}
            className={`inline-flex items-center justify-center gap-1.5 text-[11px] tracking-[0.25em] uppercase font-semibold rounded-full px-6 py-3 transition w-full sm:w-auto ${
              shot.done
                ? 'bg-noeval-accent text-white shadow-sm hover:bg-noeval-accent/90'
                : 'border-2 border-noeval-ink text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream'
            }`}
          >
            {shot.done ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Grabado · desmarcar</> : <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Marcar grabado</>}
          </button>
        )}
      </div>
    </div>
  );
}
