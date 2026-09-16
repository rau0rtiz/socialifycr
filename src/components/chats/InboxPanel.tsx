import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Inbox, Search, Sparkle, Send, Instagram, MessageCircle, ExternalLink, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useMsgRealtime,
  useOffersFingerprint,
  useSendMessage,
  useUpdateConversation,
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
  if (name) return name;
  return c.msg_contacts?.business_name || 'Sin nombre';
};

// Nombre principal: el nombre real del perfil si existe; si no, el @usuario.
const displayName = (c: InboxRow) => {
  const name = c.msg_contacts?.display_name;
  if (name && !name.startsWith('@')) return name;
  return null;
};

const displayLabel = (c: InboxRow) => displayName(c) ?? handle(c);

// Línea secundaria: el @usuario cuando ya mostramos el nombre real.
const subLabel = (c: InboxRow) => {
  const user = c.msg_contact_identities?.username;
  if (displayName(c) && user) return `@${user}`;
  return null;
};

const initials = (label: string) => label.replace('@', '').slice(0, 2).toUpperCase() || '??';

const hourOf = (iso: string) =>
  new Date(iso).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const shortHour = (iso: string) =>
  new Date(iso).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    minute: '2-digit',
  });

export const InboxPanel = () => {
  const [stage, setStage] = useState<Stage | 'todas'>('todas');
  const [channel, setChannel] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
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
  const updateConv = useUpdateConversation();
  const send = useSendMessage();
  const { toast } = useToast();

  useMsgRealtime(selected);

  const filtered = useMemo(() => {
    const list = conversations ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      `${displayLabel(c)} ${handle(c)}`.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  // Siempre dejamos un chat abierto.
  useEffect(() => {
    if (!filtered.length) return;
    if (!selected || !filtered.some((c) => c.id === selected)) {
      setSelected(filtered[0].id);
      setText('');
    }
  }, [filtered, selected]);

  const activeConv = conversations?.find((c) => c.id === selected);
  const stale = draft ? staleReason(draft, activeConv, fingerprint) : null;

  // Cada borrador nuevo arranca colapsado para no tapar el chat.
  useEffect(() => {
    setDraftOpen(false);
  }, [draft?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length, selected]);

  // Marcar como leída la conversación abierta.
  useEffect(() => {
    if (activeConv && activeConv.unread_count > 0) {
      updateConv.mutate({ id: activeConv.id, patch: { unread_count: 0 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id, activeConv?.unread_count]);

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

  const lastMessage = messages?.length ? messages[messages.length - 1] : null;

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
        <Skeleton className="h-[560px] w-full rounded-2xl" />
        <Skeleton className="h-[560px] w-full rounded-2xl" />
        <Skeleton className="hidden h-[560px] w-full rounded-2xl lg:block" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
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
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_280px]">
      {/* Columna 1: conversaciones */}
      <div className="agency-card flex h-[620px] flex-col rounded-2xl">
        <div className="space-y-2 border-b border-border/40 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-8 flex-1 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los canales</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={(v) => setStage(v as Stage | 'todas')}>
              <SelectTrigger className="h-8 flex-1 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las etapas</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Radio className="h-3 w-3 text-primary" />
            En vivo: los mensajes nuevos aparecen solos.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {!filtered.length && <p className="p-3 text-xs text-muted-foreground">Sin resultados.</p>}
          {filtered.map((c) => {
            const nm = displayLabel(c);
            const sub = subLabel(c);
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setSelected(c.id); setText(''); }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                  active ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/40'
                }`}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={c.msg_contacts?.avatar_url ?? undefined} alt={nm} />
                  <AvatarFallback className="text-[11px]">{initials(nm)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">{nm}</span>
                    {c.unread_count > 0 && (
                      <Badge className="ml-auto h-4 px-1.5 text-[10px]">{c.unread_count}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {sub ? <span className="truncate">{sub}</span> : <span className="capitalize">{c.channel}</span>}
                    <span>·</span>
                    <span className="truncate">{STAGES.find((s) => s.value === c.stage)?.label}</span>
                    {c.last_inbound_at && <span className="ml-auto shrink-0">{shortHour(c.last_inbound_at)}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Columna 2: chat */}
      <div className="agency-card flex h-[620px] flex-col rounded-2xl">
        {!activeConv ? (
          <p className="p-4 text-xs text-muted-foreground">Elegí una conversación.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border/40 p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={activeConv.msg_contacts?.avatar_url ?? undefined} alt={displayLabel(activeConv)} />
                <AvatarFallback className="text-[11px]">{initials(displayLabel(activeConv))}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayLabel(activeConv)}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Instagram className="h-3 w-3" />
                  <span className="truncate">{subLabel(activeConv) ?? activeConv.channel}</span>
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

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!messages?.length && <p className="text-xs text-muted-foreground">Sin mensajes registrados.</p>}
              {(messages ?? []).map((m) => {
                const mine = m.direction === 'outbound';
                const isTag = !!m.body && /^\[.+\]$/.test(m.body.trim());
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 ${
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

            {draft && draft.status !== 'descartado' && (
              <div className="border-t border-border/40 p-3">
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
                  className="min-h-[56px] resize-none text-sm"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={send.isPending || !text.trim()}
                  onClick={() => runSend()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Columna 3: ficha del contacto */}
      <div className="agency-card hidden h-[620px] flex-col overflow-y-auto rounded-2xl p-4 lg:flex">
        {!activeConv ? (
          <p className="text-xs text-muted-foreground">Sin conversación abierta.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={activeConv.msg_contacts?.avatar_url ?? undefined} alt={displayLabel(activeConv)} />
                <AvatarFallback>{initials(displayLabel(activeConv))}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-foreground">{displayLabel(activeConv)}</p>
              {subLabel(activeConv) && (
                <p className="text-[11px] text-muted-foreground">{subLabel(activeConv)}</p>
              )}
              {activeConv.msg_contacts?.business_name && (
                <p className="text-[11px] text-muted-foreground">{activeConv.msg_contacts.business_name}</p>
              )}
              {activeConv.msg_contacts?.profile_url && (
                <a
                  href={activeConv.msg_contacts.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
                >
                  Ver perfil <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Etapa</p>
              <Select
                value={activeConv.stage}
                onValueChange={(v) => updateConv.mutate({ id: activeConv.id, patch: { stage: v as Stage } })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Canal</span>
                <span className="capitalize text-foreground">{activeConv.channel}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Intención</span>
                <span className="capitalize text-foreground">{activeConv.intent}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Encaje</span>
                <span className="capitalize text-foreground">{activeConv.fit}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Bot</span>
                <span className="capitalize text-foreground">{activeConv.bot_mode}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Último mensaje</span>
                <span className="text-foreground">{lastMessage ? hourOf(lastMessage.occurred_at) : '—'}</span>
              </div>
              {activeConv.human_takeover_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Control humano</span>
                  <span className="text-foreground">{hourOf(activeConv.human_takeover_at)}</span>
                </div>
              )}
            </div>

            {!!draft?.facts?.length && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Datos detectados por Ari
                </p>
                <div className="space-y-1">
                  {draft.facts.map((f, i) => (
                    <div key={`${f.field}-${i}`} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.field}</p>
                      <p className="text-[11px] text-foreground">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="flex items-start gap-1.5 rounded-lg border border-border/40 bg-background/40 p-2 text-[10px] text-muted-foreground">
              <MessageCircle className="mt-0.5 h-3 w-3 shrink-0" />
              El bot sigue en modo borrador: nada sale a Instagram sin que vos lo mandés.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
