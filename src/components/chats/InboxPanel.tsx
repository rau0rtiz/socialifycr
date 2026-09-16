import { useEffect, useRef, useState } from 'react';
import { Inbox, Filter, Sparkle, Send, Instagram } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useConversationDraft,
  useGenerateDraft,
  useMsgConversations,
  useMsgMessages,
  useOffersFingerprint,
  useSendMessage,
  useUpdateDraft,
  type InboxRow,
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

const handle = (c: InboxRow) => {
  const user = c.msg_contact_identities?.username;
  if (user) return `@${user}`;
  const name = c.msg_contacts?.display_name;
  if (name) return name.startsWith('@') ? name : name;
  return c.msg_contacts?.business_name || 'Sin nombre';
};

const initials = (label: string) =>
  label.replace('@', '').slice(0, 2).toUpperCase() || '??';

const hourOf = (iso: string) =>
  new Date(iso).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const InboxPanel = () => {
  const [stage, setStage] = useState<Stage | 'todas'>('todas');
  const [channel, setChannel] = useState<string>('todos');
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data: conversations, isLoading } = useMsgConversations({
    stage: stage === 'todas' ? undefined : stage,
    channel: channel === 'todos' ? undefined : channel,
  });
  const { data: messages } = useMsgMessages(selected);
  const { data: draft } = useConversationDraft(selected);
  const { data: fingerprint } = useOffersFingerprint();
  const generate = useGenerateDraft();
  const updateDraft = useUpdateDraft();
  const send = useSendMessage();
  const { toast } = useToast();

  const activeConv = conversations?.find((c) => c.id === selected);
  const stale = draft ? staleReason(draft, activeConv, fingerprint) : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length, selected]);

  const runGenerate = () => {
    if (!selected) return;
    generate.mutate(
      { conversationId: selected },
      { onError: (e) => toast({ title: 'No se pudo generar el borrador', description: (e as Error).message, variant: 'destructive' }) },
    );
  };

  const runSend = (override?: string) => {
    const body = (override ?? text).trim();
    if (!selected || !body) return;
    send.mutate(
      { conversationId: selected, text: body },
      {
        onSuccess: () => {
          setText('');
          if (draft && draft.status !== 'descartado' && body === (draft.edited_reply || draft.proposed_reply || '').trim()) {
            updateDraft.mutate({ id: draft.id, patch: { status: 'enviado' } });
          }
        },
        onError: (e) => toast({ title: 'No se pudo enviar', description: (e as Error).message, variant: 'destructive' }),
      },
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
            La bandeja se llena con los mensajes directos reales que lleguen a Instagram. No hay conversaciones de
            demostración cargadas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {conversations.map((c) => {
              const label = handle(c);
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c.id); setText(''); }}
                  className={`agency-card flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected === c.id ? 'ring-1 ring-primary/50' : ''}`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={c.msg_contacts?.avatar_url ?? undefined} alt={label} />
                    <AvatarFallback className="text-[11px]">{initials(label)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{label}</span>
                      {c.is_demo && <Badge variant="outline" className="text-[10px]">Simulación</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="capitalize">{c.channel}</span>
                      <span>·</span>
                      <span className="truncate">{STAGES.find((s) => s.value === c.stage)?.label}</span>
                      {c.unread_count > 0 && <Badge className="ml-auto text-[10px]">{c.unread_count}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="agency-card flex min-h-[420px] flex-col rounded-2xl">
            {!selected || !activeConv ? (
              <p className="p-4 text-xs text-muted-foreground">Elegí una conversación para ver el chat.</p>
            ) : (
              <>
                {/* Encabezado del chat */}
                <div className="flex items-center gap-3 border-b border-border/40 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeConv.msg_contacts?.avatar_url ?? undefined} alt={handle(activeConv)} />
                    <AvatarFallback className="text-[11px]">{initials(handle(activeConv))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{handle(activeConv)}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Instagram className="h-3 w-3" />
                      {activeConv.msg_contacts?.profile_url ? (
                        <a
                          href={activeConv.msg_contacts.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          Ver perfil
                        </a>
                      ) : (
                        <span className="capitalize">{activeConv.channel}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-8 gap-1 text-xs"
                    disabled={generate.isPending}
                    onClick={runGenerate}
                  >
                    <Sparkle className="h-3.5 w-3.5" />
                    {generate.isPending ? 'Generando…' : 'Borrador de Ari'}
                  </Button>
                </div>

                {/* Historial */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 420 }}>
                  {!messages?.length && <p className="text-xs text-muted-foreground">Sin mensajes registrados.</p>}
                  {(messages ?? []).map((m) => {
                    const mine = m.direction === 'outbound';
                    const isTag = !!m.body && /^\[.+\]$/.test(m.body.trim());
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                            mine
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border/40 bg-background/40 text-foreground'
                          }`}
                        >
                          {isTag ? (
                            <p className="text-sm italic opacity-80">{m.body} — delegar a humano</p>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                          )}
                          <div className={`mt-1 flex items-center gap-2 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            <span className="capitalize">{m.author}</span>
                            <span>·</span>
                            <span>{hourOf(m.occurred_at)}</span>
                            {m.is_draft && <Badge variant="outline" className="text-[9px]">Borrador</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                {/* Borrador del bot */}
                {draft && draft.status !== 'descartado' && (
                  <div className="border-t border-border/40 p-4">
                    <DraftCard
                      draft={draft}
                      stale={stale}
                      regenerating={generate.isPending}
                      onRegenerate={runGenerate}
                      saving={updateDraft.isPending}
                      onSave={(t) => updateDraft.mutate({ id: draft.id, patch: { edited_reply: t, status: 'editado' } })}
                      onDiscard={() => updateDraft.mutate({ id: draft.id, patch: { status: 'descartado' } })}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={send.isPending || !!stale}
                        onClick={() => runSend(draft.edited_reply || draft.proposed_reply)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar borrador ahora
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setText(draft.edited_reply || draft.proposed_reply)}
                      >
                        Pasar al cuadro de envío
                      </Button>
                    </div>
                  </div>
                )}

                {/* Composer */}
                <div className="border-t border-border/40 p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          runSend();
                        }
                      }}
                      placeholder="Escribí tu respuesta… (Enter envía, Shift+Enter salta línea)"
                      className="min-h-[60px] resize-none text-sm"
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={send.isPending || !text.trim()}
                      onClick={runSend}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Lo que enviés acá sale a Instagram de una vez, firmado como respuesta humana. El bot sigue en modo
                    borrador y no responde solo.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
