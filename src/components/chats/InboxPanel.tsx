import { useState } from 'react';
import { Inbox, Filter, Sparkle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useConversationDraft,
  useGenerateDraft,
  useMsgConversations,
  useMsgMessages,
  useOffersFingerprint,
  useUpdateDraft,
  type MsgDraft,
  type Stage,
} from '@/hooks/use-messaging';
import { DraftCard } from './DraftCard';

const staleReason = (
  draft: MsgDraft,
  conv: { version: number; human_takeover_at: string | null } | undefined,
  fingerprint: string | undefined,
) => {
  if (draft.status === 'obsoleto') return draft.stale_reason ?? 'El borrador quedó obsoleto.';
  if (conv && draft.conversation_version != null && conv.version !== draft.conversation_version)
    return 'La conversación cambió después de generar el borrador.';
  if (conv && (conv.human_takeover_at ?? null) !== (draft.human_takeover_at ?? null))
    return 'Una persona tomó control de la conversación.';
  if (fingerprint && draft.offers_fingerprint && fingerprint !== draft.offers_fingerprint)
    return 'Los precios publicados cambiaron.';
  return null;
};

const STAGES: { value: Stage; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'conversando', label: 'Conversando' },
  { value: 'calificado', label: 'Calificado' },
  { value: 'enlace_enviado', label: 'Enlace enviado' },
  { value: 'cita_confirmada', label: 'Cita confirmada' },
  { value: 'no_interesado', label: 'No interesado' },
];

export const InboxPanel = () => {
  const [stage, setStage] = useState<Stage | 'todas'>('todas');
  const [channel, setChannel] = useState<string>('todos');
  const [selected, setSelected] = useState<string | null>(null);

  const { data: conversations, isLoading } = useMsgConversations({
    stage: stage === 'todas' ? undefined : stage,
    channel: channel === 'todos' ? undefined : channel,
  });
  const { data: messages } = useMsgMessages(selected);
  const { data: draft } = useConversationDraft(selected);
  const { data: fingerprint } = useOffersFingerprint();
  const generate = useGenerateDraft();
  const updateDraft = useUpdateDraft();
  const { toast } = useToast();

  const activeConv = conversations?.find((c) => c.id === selected);
  const stale = draft ? staleReason(draft, activeConv, fingerprint) : null;

  const runGenerate = () => {
    if (!selected) return;
    generate.mutate(
      { conversationId: selected },
      { onError: (e) => toast({ title: 'No se pudo generar el borrador', description: (e as Error).message, variant: 'destructive' }) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los canales</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={(v) => setStage(v as Stage | 'todas')}>
          <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las etapas</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : !conversations?.length ? (
        <div className="agency-card flex flex-col items-center gap-3 rounded-2xl px-8 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Sin conversaciones todavía</p>
          <p className="max-w-md text-xs text-muted-foreground">
            La bandeja se llena cuando Instagram quede conectado (fase 2). No hay conversaciones de demostración cargadas:
            todo lo que aparezca acá será real y estará etiquetado si es una simulación.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`agency-card w-full rounded-xl p-3 text-left transition ${selected === c.id ? 'ring-1 ring-primary/50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.msg_contacts?.business_name || c.msg_contacts?.display_name || 'Sin nombre'}
                  </span>
                  {c.is_demo && <Badge variant="outline" className="text-[10px]">Simulación</Badge>}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="capitalize">{c.channel}</span>
                  <span>·</span>
                  <span>{STAGES.find((s) => s.value === c.stage)?.label}</span>
                  {c.unread_count > 0 && <Badge className="ml-auto text-[10px]">{c.unread_count}</Badge>}
                </div>
              </button>
            ))}
          </div>
          <div className="agency-card min-h-[260px] rounded-2xl p-4">
            {!selected ? (
              <p className="text-xs text-muted-foreground">Elegí una conversación para ver el historial.</p>
            ) : (
              <div className="space-y-3">
                {(messages ?? []).map((m) => (
                  <div key={m.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="capitalize">{m.author}</span>
                      <span>·</span>
                      <span>{new Date(m.occurred_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}</span>
                      {m.is_draft && <Badge variant="outline" className="text-[10px]">Borrador</Badge>}
                    </div>
                    {m.body && /^\[.+\]$/.test(m.body.trim()) ? (
                      <p className="text-sm italic text-muted-foreground">{m.body} — delegar a humano</p>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
                    )}
                  </div>
                ))}
                {!messages?.length && <p className="text-xs text-muted-foreground">Sin mensajes registrados.</p>}

                <div className="border-t border-border/40 pt-3">
                  <Button size="sm" className="h-9 gap-1 text-xs" disabled={generate.isPending} onClick={runGenerate}>
                    <Sparkle className="h-3.5 w-3.5" />
                    {generate.isPending ? 'Generando…' : draft ? 'Generar otro borrador' : 'Generar borrador'}
                  </Button>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Genera una propuesta para revisar. No envía nada ni confirma citas.
                  </p>
                </div>

                {draft && draft.status !== 'descartado' && (
                  <DraftCard
                    draft={draft}
                    stale={stale}
                    regenerating={generate.isPending}
                    onRegenerate={runGenerate}
                    saving={updateDraft.isPending}
                    onSave={(text) => updateDraft.mutate({ id: draft.id, patch: { edited_reply: text, status: 'editado' } })}
                    onDiscard={() => updateDraft.mutate({ id: draft.id, patch: { status: 'descartado' } })}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
