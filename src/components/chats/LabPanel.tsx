import { useState } from 'react';
import { Check, FlaskConical, Play, Sparkle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useGenerateDraft,
  useMsgTestCases,
  useMsgTestRuns,
  useRunTests,
  useSetHumanVerdict,
  type MsgDraft,
  type TestResult,
} from '@/hooks/use-messaging';
import { DraftCard } from './DraftCard';

const resultBadge = (r: string) =>
  r === 'pass'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : r === 'fail'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : r === 'error'
        ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
        : 'border-sky-500/40 bg-sky-500/10 text-sky-300';

const RESULT_LABEL: Record<string, string> = {
  pass: 'Pasó',
  fail: 'Falló',
  error: 'Error',
  requiere_humano: 'Revisión humana',
};

export const LabPanel = () => {
  const { data: cases, isLoading } = useMsgTestCases();
  const { data: pastRuns } = useMsgTestRuns();
  const generate = useGenerateDraft();
  const runTests = useRunTests();
  const verdict = useSetHumanVerdict();
  const { toast } = useToast();

  const [useDraftKnowledge, setUseDraftKnowledge] = useState(true);
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [script, setScript] = useState('Hola, quiero más información');
  const [draft, setDraft] = useState<MsgDraft | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  const simulate = () => {
    const messages = script
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(contacto|bot|humano)\s*:\s*(.*)$/i);
        return m ? { author: m[1].toLowerCase() === 'contacto' ? 'externo' : m[1].toLowerCase(), body: m[2] } : { author: 'externo', body: line };
      });
    if (!messages.length) {
      toast({ title: 'Escribí al menos un mensaje', variant: 'destructive' });
      return;
    }
    generate.mutate(
      {
        simulation: { messages, contact: { display_name: name || null, business_name: business || null } },
        useDraftKnowledge,
      },
      {
        onSuccess: (d) => setDraft(d.draft),
        onError: (e) => toast({ title: 'No se pudo generar', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  };

  const run = () =>
    runTests.mutate(
      { useDraftKnowledge },
      {
        onSuccess: (d) => {
          setResults(d.results);
          setSummary(d.summary as unknown as Record<string, unknown>);
        },
        onError: (e) => toast({ title: 'No se pudieron correr las pruebas', description: (e as Error).message, variant: 'destructive' }),
      },
    );

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const resultFor = (id: string) => results?.find((r) => r.test_case_id === id);
  // Última corrida guardada (persiste aunque recargues la página)
  const lastRunFor = (id: string) =>
    (pastRuns ?? []).find((r) => r.test_case_id === id) as
      | {
          id: string;
          auto_result: string;
          human_verdict: string | null;
          notes: string | null;
          reply: string | null;
          created_at: string;
          knowledge_version: number | null;
        }
      | undefined;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-4">
      <div className="agency-card flex items-start gap-3 rounded-2xl p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Laboratorio</p>
          <p className="text-xs text-muted-foreground">
            Usa el mismo motor que la bandeja, con datos aislados: nada de acá toca conversaciones reales ni los indicadores.
            Acá sí podés probar el manual en borrador; en conversaciones reales se exige una versión publicada.
          </p>
        </div>
      </div>

      <div className="agency-card space-y-3 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Simular una conversación</p>
          <div className="flex items-center gap-2">
            <Switch checked={useDraftKnowledge} onCheckedChange={setUseDraftKnowledge} />
            <Label className="text-xs">Usar manual en borrador</Label>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del contacto (opcional)" className="h-9 text-xs" />
          <Input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Negocio (opcional)" className="h-9 text-xs" />
        </div>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={5}
          className="text-sm"
          placeholder={'Una línea por mensaje. Podés prefijar con "contacto:", "bot:" o "humano:".'}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-9 gap-1 text-xs" disabled={generate.isPending} onClick={simulate}>
            <Sparkle className="h-3.5 w-3.5" /> {generate.isPending ? 'Generando…' : 'Generar borrador'}
          </Button>
          <span className="text-[11px] text-muted-foreground">Una línea por mensaje. El último debe ser del contacto.</span>
        </div>
        {draft && <DraftCard draft={draft} stale={null} onRegenerate={simulate} regenerating={generate.isPending} />}
      </div>

      <div className="agency-card space-y-3 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Casos de prueba ({cases?.length ?? 0})</p>
            <p className="text-xs text-muted-foreground">
              Los casos de conversación se evalúan automáticamente. Los de infraestructura (webhooks, citas, permisos) quedan
              marcados para revisión humana.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="text-red-300">Crítico</span> = si ese caso falla, el bot no debería usarse (por ejemplo dar
              precio sin que lo pidan). Los de <span className="text-sky-300">revisión humana</span> no se pueden medir solos:
              leé la nota, comprobá que eso sea cierto y marcalo Correcto o Con problema.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-1 text-xs" disabled={runTests.isPending} onClick={run}>
            <Play className="h-3.5 w-3.5" /> {runTests.isPending ? 'Corriendo…' : 'Correr los casos'}
          </Button>
        </div>

        {summary && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Badge variant="outline" className={resultBadge('pass')}>Pasaron: {String(summary.pass)}</Badge>
            <Badge variant="outline" className={resultBadge('fail')}>Fallaron: {String(summary.fail)}</Badge>
            <Badge variant="outline" className={resultBadge('requiere_humano')}>Revisión humana: {String(summary.requiere_humano)}</Badge>
            <Badge variant="outline" className={resultBadge('error')}>Errores: {String(summary.error)}</Badge>
            <Badge variant="outline">Críticos fallidos: {String(summary.criticos_fallidos)}</Badge>
            <Badge variant="outline">{String(summary.model)} · manual v{String(summary.knowledge_version)}</Badge>
          </div>
        )}

        <div className="space-y-2">
          {(cases ?? []).map((c) => {
            const r = resultFor(c.id);
            const past = lastRunFor(c.id);
            return (
              <div key={c.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">{c.expectation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.is_critical && (
                      <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300 text-[10px]">Crítico</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${r ? resultBadge(r.auto_result) : past ? resultBadge(past.auto_result) : ''}`}
                    >
                      {r ? RESULT_LABEL[r.auto_result] : past ? RESULT_LABEL[past.auto_result] ?? past.auto_result : 'Sin correr'}
                    </Badge>
                  </div>
                </div>
                {(() => {
                  const msgs = ((c.inputs as { messages?: { author?: string; body?: string }[] } | null)?.messages ?? []) as {
                    author?: string;
                    body?: string;
                  }[];
                  if (!msgs.length) return null;
                  return (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                        Ver conversación de prueba ({msgs.length} mensajes)
                      </summary>
                      <div className="mt-1 space-y-1 rounded-lg border border-border/30 bg-background/60 p-2">
                        {msgs.map((m, i) => (
                          <p key={i} className="text-[11px] text-foreground">
                            <span className="font-semibold text-muted-foreground">
                              {m.author === 'externo' ? 'Contacto' : m.author === 'bot' ? 'Bot' : 'Humano'}:
                            </span>{' '}
                            {m.body}
                          </p>
                        ))}
                      </div>
                    </details>
                  );
                })()}
                {(r?.reply ?? past?.reply) && (
                  <div className="mt-2 rounded-lg border border-border/30 bg-background/60 p-2">
                    <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Respuesta del bot:</p>
                    <p className="whitespace-pre-wrap text-[11px] text-foreground">{r?.reply ?? past?.reply}</p>
                  </div>
                )}
                {!!r?.failures?.length && (
                  <p className="mt-1 text-[11px] text-red-300">{r.failures.join(' · ')}</p>
                )}
                {r?.notes && r.auto_result !== 'fail' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{r.notes}</p>
                )}
                {r?.latency_ms != null && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {r.latency_ms} ms{r.usage?.total_tokens ? ` · ${r.usage.total_tokens} tokens` : ''} · acción {r.suggested_action}
                  </p>
                )}
                {!r && past && (
                  <div className="mt-1 space-y-1">
                    {past.auto_result === 'requiere_humano' && past.notes && (
                      <p className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2 text-[11px] text-sky-200">
                        Qué revisar: {past.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Última corrida: {fmt(past.created_at)}
                      {past.knowledge_version ? ` · manual v${past.knowledge_version}` : ''}
                      {past.auto_result !== 'requiere_humano' && past.notes ? ` · ${past.notes}` : ''}
                    </p>
                  </div>
                )}
                {past && (r ? r.auto_result === 'requiere_humano' : past.auto_result === 'requiere_humano') && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/30 pt-2">
                    <span className="text-[10px] text-muted-foreground">Tu revisión:</span>
                    <Button
                      size="sm"
                      variant={past.human_verdict === 'aprobado' ? 'default' : 'outline'}
                      className="h-7 gap-1 text-[10px]"
                      disabled={verdict.isPending}
                      onClick={() =>
                        verdict.mutate({
                          runId: past.id,
                          verdict: past.human_verdict === 'aprobado' ? null : 'aprobado',
                        })
                      }
                    >
                      <Check className="h-3 w-3" /> Correcto
                    </Button>
                    <Button
                      size="sm"
                      variant={past.human_verdict === 'rechazado' ? 'destructive' : 'outline'}
                      className="h-7 gap-1 text-[10px]"
                      disabled={verdict.isPending}
                      onClick={() =>
                        verdict.mutate({
                          runId: past.id,
                          verdict: past.human_verdict === 'rechazado' ? null : 'rechazado',
                        })
                      }
                    >
                      <X className="h-3 w-3" /> Con problema
                    </Button>
                    {past.human_verdict && (
                      <span className="text-[10px] text-muted-foreground">
                        Marcado como {past.human_verdict === 'aprobado' ? 'correcto' : 'con problema'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
