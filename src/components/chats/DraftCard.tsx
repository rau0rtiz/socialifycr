import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, Sparkle, Trash2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MsgDraft } from '@/hooks/use-messaging';

const ACTION_LABEL: Record<string, string> = {
  responder: 'Responder',
  pedir_dato: 'Pedir un dato',
  enviar_agenda: 'Enviar agenda',
  derivar_humano: 'Derivar a una persona',
  derivar_produccion: 'Derivar a producción',
  marcar_no_contactar: 'Marcar no contactar',
  no_responder: 'No responder',
};

interface Props {
  draft: MsgDraft;
  stale: string | null;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onSave?: (text: string) => void;
  onDiscard?: () => void;
  saving?: boolean;
}

export const DraftCard = ({ draft, stale, onRegenerate, regenerating, onSave, onDiscard, saving }: Props) => {
  const [text, setText] = useState(draft.edited_reply ?? draft.proposed_reply);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setText(draft.edited_reply ?? draft.proposed_reply);
    setEditing(false);
  }, [draft.id, draft.edited_reply, draft.proposed_reply]);

  const fit = draft.fit_signals ?? {};

  return (
    <div className="min-w-0 break-words rounded-2xl border border-primary/30 bg-primary/[0.04] p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="gap-1 text-[10px]"><Sparkle className="h-3 w-3" /> Borrador de IA</Badge>
        <Badge variant="outline" className="text-[10px] capitalize">{draft.intent}</Badge>
        <Badge variant="outline" className="text-[10px]">{ACTION_LABEL[draft.suggested_action] ?? draft.suggested_action}</Badge>
        {draft.needs_human && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300">
            <UserRound className="h-3 w-3" /> Requiere una persona
          </Badge>
        )}
        {draft.knowledge_is_draft && (
          <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-300">
            Manual en borrador
          </Badge>
        )}
      </div>

      {stale && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{stale} Hay que generar el borrador de nuevo antes de usarlo.</span>
        </div>
      )}

      {editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="text-sm" />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-foreground">{text}</p>
      )}

      {draft.needs_human_reason && (
        <p className="mt-2 text-[11px] text-muted-foreground">Motivo: {draft.needs_human_reason}</p>
      )}

      {!!draft.facts?.length && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold text-foreground">Datos detectados</p>
          {draft.facts.map((f, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">
              · {f.field}: {f.value} <span className="opacity-60">(mensaje {f.source_message_index}, confianza {f.confidence})</span>
            </p>
          ))}
        </div>
      )}

      {!!Object.keys(fit).length && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Encaje: {Object.entries(fit).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
        {onSave && (
          editing ? (
            <>
              <Button size="sm" className="h-8 gap-1 text-xs" disabled={saving} onClick={() => { onSave(text); setEditing(false); }}>
                <Check className="h-3.5 w-3.5" /> Guardar edición
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setText(draft.edited_reply ?? draft.proposed_reply); setEditing(false); }}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditing(true)}>Editar</Button>
          )
        )}
        {onRegenerate && (
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={regenerating} onClick={onRegenerate}>
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} /> Regenerar
          </Button>
        )}
        {onDiscard && (
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground" onClick={onDiscard}>
            <Trash2 className="h-3.5 w-3.5" /> Descartar
          </Button>
        )}
        <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">
          {draft.model} · manual v{draft.knowledge_version} · {draft.latency_ms ?? '—'} ms
          {draft.usage?.total_tokens ? ` · ${draft.usage.total_tokens} tokens` : ''}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Generar no envía nada ni confirma citas. El envío queda en manos del equipo.
      </p>
    </div>
  );
};
