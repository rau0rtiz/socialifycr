import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileBarChart, Loader2, Plus, Trash2, Upload, X, ArrowLeft, ArrowRight, Sparkles as _unused, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateAgencyProposal } from '@/hooks/use-agency-proposals';
import {
  PLATFORM_LABEL, parseDataFile, summarize, htmlToText, extractReportData,
  type Platform, type DatasetSummary,
} from '@/lib/report-data';
import { buildReportHtml, type ReportContent } from '@/lib/report-template';
import { cn } from '@/lib/utils';

void _unused;

interface DataFile { id: string; file: File; description: string; summary?: DatasetSummary; error?: string }
interface PlatformState { enabled: boolean; files: DataFile[]; goals: string; invoiceUrl: string }
interface EvidenceItem { id: string; file: File; description: string }
interface DraftResult { markdown: string; questions?: string[]; creatives?: { platform: Platform; name: string; kind: 'best' | 'worst' }[] }

const PLATFORMS: Platform[] = ['meta', 'tiktok', 'google'];
const STEPS = ['Básico', 'Plataformas', 'Resultados', 'Revisión', 'Generar'];
const uid = () => Math.random().toString(36).slice(2, 10);
const DATA_ACCEPT = '.xlsx,.xls,.csv,.xml';

const callAi = async (action: 'draft' | 'final', payload: unknown, attachments: unknown[]) => {
  const { data, error } = await supabase.functions.invoke('generate-client-report', { body: { action, payload, attachments } });
  if (error) {
    let msg = error.message;
    try { const b = await (error as any).context?.json?.(); if (b?.error) msg = typeof b.error === 'string' ? b.error : JSON.stringify(b.error); } catch { /* */ }
    throw new Error(msg);
  }
  if (data?.disabled) throw new Error(data.error);
  if (data?.error) throw new Error(data.error);
  return data.result;
};

const StepHeader = ({ step, setStep }: { step: number; setStep: (n: number) => void }) => (
  <div className="flex flex-wrap gap-2">
    {STEPS.map((s, i) => (
      <button key={s} type="button" onClick={() => i < step && setStep(i)}
        className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition',
          i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'border-primary/40 text-foreground hover:bg-muted' : 'text-muted-foreground')}>
        <span className="font-semibold">{i + 1}</span>{s}
      </button>
    ))}
  </div>
);

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="agency-card space-y-4 rounded-2xl border bg-card p-5">
    <div><h3 className="font-semibold">{title}</h3>{hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>
    {children}
  </div>
);

const Reportes = () => {
  const { user } = useAuth();
  const createProposal = useCreateAgencyProposal();
  const [step, setStep] = useState(0);

  // Paso 1
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [businessGoal, setBusinessGoal] = useState('');
  const [kpis, setKpis] = useState<string[]>([]);
  const [kpiInput, setKpiInput] = useState('');

  // Paso 2
  const [platforms, setPlatforms] = useState<Record<Platform, PlatformState>>({
    meta: { enabled: true, files: [], goals: '', invoiceUrl: '' },
    tiktok: { enabled: false, files: [], goals: '', invoiceUrl: '' },
    google: { enabled: false, files: [], goals: '', invoiceUrl: '' },
  });

  // Paso 3
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [compareId, setCompareId] = useState<string>('none');

  // Paso 4-5
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [html, setHtml] = useState<string | null>(null);
  const [content, setContent] = useState<ReportContent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['report-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id,name').order('name');
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: prevReports = [] } = useQuery({
    queryKey: ['report-previous', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('agency_proposals').select('id,title,created_at')
        .eq('client_id', clientId).eq('kind', 'report').order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!clientId,
  });

  const clientName = clients.find((c) => c.id === clientId)?.name ?? '';
  const activePlatforms = PLATFORMS.filter((p) => platforms[p].enabled);
  const periodLabel = from && to
    ? `${new Date(from + 'T12:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })} – ${new Date(to + 'T12:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  const updatePlatform = (p: Platform, patch: Partial<PlatformState>) =>
    setPlatforms((s) => ({ ...s, [p]: { ...s[p], ...patch } }));

  const addDataFiles = async (p: Platform, list: FileList | null) => {
    if (!list) return;
    const added: DataFile[] = Array.from(list).map((file) => ({ id: uid(), file, description: '' }));
    updatePlatform(p, { files: [...platforms[p].files, ...added] });
  };

  const addKpi = () => {
    const v = kpiInput.trim().replace(/,$/, '');
    if (v && !kpis.includes(v)) setKpis([...kpis, v]);
    setKpiInput('');
  };

  const exportThumbs = useMemo(() => {
    const m: Record<string, string> = {};
    activePlatforms.forEach((p) => platforms[p].files.forEach((f) =>
      Object.entries(f.summary?.thumbnails ?? {}).forEach(([n, u]) => { m[`${p}::${n}`] = u; })));
    return m;
  }, [platforms, activePlatforms]);

  const validStep = (s: number) => {
    if (s === 0) return !!clientId && !!title.trim() && !!from && !!to && !!businessGoal.trim();
    if (s === 1) return activePlatforms.length > 0 && activePlatforms.every((p) =>
      platforms[p].files.length > 0 && platforms[p].files.every((f) => f.description.trim()));
    return true;
  };

  /** Lee archivos, calcula cifras y sube adjuntos del cliente. */
  const buildPayload = async () => {
    const range = { from, to };
    const platformData: Record<string, unknown> = {};
    const nextPlatforms = { ...platforms };
    for (const p of activePlatforms) {
      const files: DataFile[] = [];
      for (const f of platforms[p].files) {
        try {
          const t = await parseDataFile(f.file);
          files.push({ ...f, summary: summarize(t, f.file.name, f.description, range), error: undefined });
        } catch (e: any) {
          files.push({ ...f, error: e.message ?? 'No se pudo leer' });
        }
      }
      nextPlatforms[p] = { ...platforms[p], files };
      platformData[p] = {
        campaign_goals: platforms[p].goals,
        datasets: files.filter((f) => f.summary).map(({ summary }) => ({ ...summary, thumbnails: undefined })),
      };
    }
    setPlatforms(nextPlatforms);

    const clientResults: unknown[] = [];
    const attachments: { kind: 'image' | 'pdf'; url: string; label: string }[] = [];
    for (const ev of evidence) {
      const n = ev.file.name.toLowerCase();
      if (/\.(xlsx|xls|csv|xml)$/.test(n)) {
        const t = await parseDataFile(ev.file);
        clientResults.push(summarize(t, ev.file.name, ev.description, range));
      } else if (/\.(txt|md)$/.test(n)) {
        clientResults.push({ file: ev.file.name, description: ev.description, text: (await ev.file.text()).slice(0, 20000) });
      } else if (ev.file.type.startsWith('image/') || n.endsWith('.pdf')) {
        const path = `reports/${clientId}/${Date.now()}-${uid()}-${ev.file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await supabase.storage.from('agency-private').upload(path, ev.file, { contentType: ev.file.type });
        if (error) throw error;
        const { data } = await supabase.storage.from('agency-private').createSignedUrl(path, 3600);
        if (data?.signedUrl) attachments.push({ kind: n.endsWith('.pdf') ? 'pdf' : 'image', url: data.signedUrl, label: ev.description });
      } else {
        clientResults.push({ file: ev.file.name, description: ev.description, note: 'formato no legible, solo descripción' });
      }
    }

    let previous: unknown = null;
    if (compareId !== 'none') {
      const { data: prevBuild } = await supabase.from('report_builds').select('content,computed').eq('proposal_id', compareId).maybeSingle();
      if (prevBuild?.content) previous = { structured: prevBuild.content };
      else {
        const { data } = await supabase.from('agency_proposals').select('html_content,title').eq('id', compareId).maybeSingle();
        const embedded = data?.html_content ? extractReportData(data.html_content) : null;
        previous = embedded ? { structured: embedded } : { title: data?.title, text: htmlToText(data?.html_content ?? '') };
      }
    }

    const payload = {
      client: clientName, report_title: title, period: { from, to },
      business_goal: businessGoal, kpis_requested: kpis,
      platforms: platformData, client_results: clientResults, previous_report: previous,
    };
    return { payload, attachments };
  };

  const [cache, setCache] = useState<{ payload: any; attachments: any[] } | null>(null);

  const runDraft = async (withFeedback = false) => {
    setBusy('Leyendo archivos y armando el borrador…');
    try {
      const c = cache && withFeedback ? cache : await buildPayload();
      setCache(c);
      const res = await callAi('draft', {
        ...c.payload,
        ...(withFeedback && draft ? { previous_draft: draft.markdown, corrections: feedback } : {}),
      }, c.attachments);
      setDraft(res);
      setFeedback('');
      setStep(3);
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo generar el borrador');
    } finally { setBusy(null); }
  };

  const uploadThumb = async (key: string, file: File) => {
    const path = `reports/thumbs/${clientId}/${Date.now()}-${uid()}.${file.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('content-images').upload(path, file, { contentType: file.type });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from('content-images').getPublicUrl(path);
    setThumbs((t) => ({ ...t, [key]: data.publicUrl }));
  };

  const runFinal = async () => {
    if (!cache || !draft) return;
    setBusy('Generando el reporte final…');
    try {
      const res: ReportContent = await callAi('final', { ...cache.payload, approved_draft: draft.markdown, corrections: feedback || null }, cache.attachments);
      res.platforms = (res.platforms ?? []).filter((p) => activePlatforms.includes(p.platform));
      const allThumbs = { ...exportThumbs, ...thumbs };
      const invoices = Object.fromEntries(activePlatforms.map((p) => [p, platforms[p].invoiceUrl]));
      const out = buildReportHtml({ content: res, clientName, periodLabel, invoices, thumbnails: allThumbs, data: res });
      setContent(res);
      setHtml(out);
      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo generar el reporte');
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (!html || !content || !cache) return;
    setBusy('Guardando en Documentación…');
    try {
      const prop = await createProposal.mutateAsync({ title, client_id: clientId, client_name: clientName, html_content: html, is_published: false, kind: 'report' });
      await supabase.from('report_builds').insert({
        client_id: clientId, title, period_start: from, period_end: to,
        config: { businessGoal, kpis, platforms: activePlatforms.map((p) => ({ platform: p, goals: platforms[p].goals, invoiceUrl: platforms[p].invoiceUrl })), compareId },
        computed: cache.payload.platforms, draft: draft as any, content: content as any,
        proposal_id: prop.id, created_by: user?.id ?? null,
      });
      setSavedId(prop.id);
      toast.success('Reporte guardado en Documentación (sin publicar)');
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
    } finally { setBusy(null); }
  };

  const creativesMissing = (draft?.creatives ?? []).filter((c) => !exportThumbs[`${c.platform}::${c.name}`]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileBarChart className="h-6 w-6 text-primary" />Reportes</h1>
          <p className="text-sm text-muted-foreground">Subí los exports de cada plataforma, revisá el borrador y generá el reporte animado.</p>
        </div>
        <StepHeader step={step} setStep={setStep} />

        {busy && (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />{busy}
          </div>
        )}

        {step === 0 && (
          <Section title="Datos básicos">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Cliente</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setCompareId('none'); }}>
                  <SelectTrigger><SelectValue placeholder="Elegí un cliente" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Nombre del reporte</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="KM | Reporte setiembre 2026" /></div>
              <div className="space-y-1.5"><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Meta general del negocio en este momento</Label>
              <Textarea rows={3} value={businessGoal} onChange={(e) => setBusinessGoal(e.target.value)}
                placeholder="Ej: llenar la agenda de valoraciones de octubre y bajar el costo por mensaje" /></div>
            <div className="space-y-1.5"><Label>KPIs a tomar en cuenta</Label>
              <div className="flex flex-wrap gap-2">
                {kpis.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1">{k}
                    <button type="button" onClick={() => setKpis(kpis.filter((x) => x !== k))}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={kpiInput} onChange={(e) => setKpiInput(e.target.value)} placeholder="CPL, costo por mensaje, agendas…"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKpi(); } }} />
                <Button type="button" variant="outline" onClick={addKpi}><Plus className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">No tiene que ser el nombre exacto de la columna, la IA lo interpreta.</p>
            </div>
          </Section>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox checked={platforms[p].enabled} onCheckedChange={(v) => updatePlatform(p, { enabled: !!v })} />{PLATFORM_LABEL[p]}
                </label>
              ))}
            </div>
            {activePlatforms.map((p) => (
              <Section key={p} title={PLATFORM_LABEL[p]} hint="Excel, CSV o XML. Describí qué es cada archivo para que la IA lo interprete bien.">
                <div className="space-y-3">
                  {platforms[p].files.map((f) => (
                    <div key={f.id} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center">
                      <span className="min-w-0 truncate text-sm font-medium md:w-56">{f.file.name}</span>
                      <Input value={f.description} placeholder="Ej: export de anuncios por día"
                        onChange={(e) => updatePlatform(p, { files: platforms[p].files.map((x) => x.id === f.id ? { ...x, description: e.target.value } : x) })} />
                      <Button size="icon" variant="ghost" onClick={() => updatePlatform(p, { files: platforms[p].files.filter((x) => x.id !== f.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/40">
                    <Upload className="h-4 w-4" />Subir archivos
                    <input type="file" multiple accept={DATA_ACCEPT} className="hidden" onChange={(e) => { addDataFiles(p, e.target.files); e.target.value = ''; }} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label>Meta de las campañas</Label>
                    <Textarea rows={2} value={platforms[p].goals} onChange={(e) => updatePlatform(p, { goals: e.target.value })} placeholder="Ej: campaña de mensajes para agendar; campaña de alcance para marca" /></div>
                  <div className="space-y-1.5"><Label>Link a las facturas del mes</Label>
                    <Input value={platforms[p].invoiceUrl} onChange={(e) => updatePlatform(p, { invoiceUrl: e.target.value })} placeholder="https://drive.google.com/…" /></div>
                </div>
              </Section>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Section title="Resultados del cliente (opcional)" hint="Fotos, hojas de cálculo o documentos con ventas u otros resultados. Indicá qué es cada uno.">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center">
                  <span className="min-w-0 truncate text-sm font-medium md:w-56">{ev.file.name}</span>
                  <Input value={ev.description} placeholder="Ej: ventas de setiembre desde su POS"
                    onChange={(e) => setEvidence(evidence.map((x) => x.id === ev.id ? { ...x, description: e.target.value } : x))} />
                  <Button size="icon" variant="ghost" onClick={() => setEvidence(evidence.filter((x) => x.id !== ev.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/40">
                <Upload className="h-4 w-4" />Subir resultados
                <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.csv,.xml,.txt,.md" className="hidden"
                  onChange={(e) => { setEvidence([...evidence, ...Array.from(e.target.files ?? []).map((file) => ({ id: uid(), file, description: '' }))]); e.target.value = ''; }} />
              </label>
            </Section>
            <Section title="Comparar con un reporte anterior (opcional)">
              <Select value={compareId} onValueChange={setCompareId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin comparación</SelectItem>
                  {prevReports.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {prevReports.length === 0 && <p className="text-xs text-muted-foreground">Este cliente todavía no tiene reportes en Documentación.</p>}
            </Section>
          </div>
        )}

        {step === 3 && draft && (
          <div className="space-y-4">
            {!!draft.questions?.length && (
              <Section title="La IA tiene estas preguntas">
                <ul className="list-disc space-y-1 pl-5 text-sm">{draft.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                <p className="text-xs text-muted-foreground">Respondelas abajo en correcciones y regenerá el borrador.</p>
              </Section>
            )}
            <Section title="Miniaturas de los creativos" hint="Subí la imagen o pegá el link de cada creativo destacado.">
              {creativesMissing.length === 0 && <p className="text-sm text-muted-foreground">Todos los creativos ya tienen miniatura del export.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {creativesMissing.map((c) => {
                  const key = `${c.platform}::${c.name}`;
                  return (
                    <div key={key} className="flex gap-3 rounded-xl border p-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {thumbs[key] && <img src={thumbs[key]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-xs text-muted-foreground">{PLATFORM_LABEL[c.platform]} · {c.kind === 'best' ? 'Mejor' : 'A mejorar'}</div>
                        <div className="truncate text-sm font-medium" title={c.name}>{c.name}</div>
                        <div className="flex gap-2">
                          <Input className="h-8" placeholder="Link de imagen" value={thumbs[key] ?? ''} onChange={(e) => setThumbs({ ...thumbs, [key]: e.target.value })} />
                          <label className="inline-flex h-8 cursor-pointer items-center rounded-md border px-2 hover:bg-muted">
                            <Upload className="h-3.5 w-3.5" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadThumb(key, e.target.files[0])} />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
            <Section title="Borrador del reporte">
              <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{draft.markdown}</ReactMarkdown></div>
            </Section>
            <Section title="Correcciones" hint="Opcional. Ej: no menciones la campaña X, resaltá las agendas.">
              <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!!busy || !feedback.trim()} onClick={() => runDraft(true)}>Regenerar borrador</Button>
                <Button disabled={!!busy} onClick={runFinal}><Check className="mr-1 h-4 w-4" />Aprobar y generar reporte</Button>
              </div>
            </Section>
          </div>
        )}

        {step === 4 && html && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={!!busy || !!savedId}>{savedId ? 'Guardado en Documentación' : 'Guardar en Documentación'}</Button>
              <Button variant="outline" onClick={() => { const w = window.open(); w?.document.write(html); w?.document.close(); }}>Abrir en pestaña</Button>
              <Button variant="ghost" disabled={!!busy} onClick={runFinal}>Regenerar</Button>
            </div>
            <iframe title="Vista previa" srcDoc={html} className="h-[80vh] w-full rounded-2xl border bg-background" />
          </div>
        )}

        {step < 3 && (
          <div className="flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Atrás</Button>
            {step < 2 ? (
              <Button disabled={!validStep(step)} onClick={() => setStep(step + 1)}>Siguiente<ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : (
              <Button disabled={!!busy || !validStep(0) || !validStep(1)} onClick={() => runDraft(false)}>Crear borrador con IA</Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reportes;
