import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAgencyProposals,
  useCreateAgencyProposal,
  useUpdateAgencyProposal,
  useDeleteAgencyProposal,
  fetchProposalHtml,
  type AgencyProposalListItem,
  type PackageType,
  type ProposalKind,
} from '@/hooks/use-agency-proposals';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { renderDocumentSource } from '@/lib/jsx-document';
import { FileText, Plus, Link as LinkIcon, Mail, Pencil, Trash2, ExternalLink, Copy, Loader2, Eye, EyeOff, Info, Package as PackageIcon, User as UserIcon, DollarSign, Monitor, Code2, BarChart3, ClipboardList, Sparkles, Inbox, ListChecks } from 'lucide-react';
import FormResponsesDialog from '@/components/propuestas/FormResponsesDialog';
import { useFormResponseCounts } from '@/hooks/use-form-responses';
import { buildFormDocument } from '@/lib/form-runtime';
import cuestionarioCursoTemplate from '@/templates/cuestionario-curso.html?raw';
import cuestionarioCursoV2Template from '@/templates/cuestionario-curso-v2.html?raw';

const FORM_TEMPLATES: { id: string; label: string; description: string; html: string }[] = [
  {
    id: 'cuestionario-curso-v2',
    label: 'Cuestionario paginado · Curso online',
    description: 'Formato por pasos (una sección por pantalla), barra de progreso y envío al final. Recomendado.',
    html: cuestionarioCursoV2Template,
  },
  {
    id: 'cuestionario-curso',
    label: 'Cuestionario clásico · Producción de curso online',
    description: 'Documento largo tipo impresión: negocio, instructor, inventario, alcance y presupuesto.',
    html: cuestionarioCursoTemplate,
  },
  {
    id: 'blank',
    label: 'En blanco (pegar HTML)',
    description: 'Pegá tu propio HTML. Las cajas .box-write, .lines, .fill, ul.opts, .cb y .scale se vuelven interactivas.',
    html: '',
  },
];

import { AddPlanToSheetDialog } from '@/components/producciones/AddPlanToSheetDialog';
import DocumentViewsDialog from '@/components/propuestas/DocumentViewsDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PACKAGE_LABELS: Record<PackageType, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  one_time: 'Pago único',
};

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount == null) return null;
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString('es-CR')}`;
  }
};

const PUBLIC_BASE_URL = 'https://app.socialifycr.com';
const KIND_PATH: Record<ProposalKind, string> = { proposal: 'propuesta', report: 'reporte', content_plan: 'plan', form: 'formulario' };
const KIND_LABEL: Record<ProposalKind, string> = { proposal: 'propuesta', report: 'reporte', content_plan: 'plan de contenido', form: 'formulario' };
const buildShareUrl = (slug: string, kind: ProposalKind = 'proposal') =>
  `${PUBLIC_BASE_URL}/${KIND_PATH[kind] ?? 'propuesta'}/${slug}`;

const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

const Propuestas = () => {
  const { data: proposals = [], isLoading } = useAgencyProposals();
  const createMut = useCreateAgencyProposal();
  const updateMut = useUpdateAgencyProposal();
  const deleteMut = useDeleteAgencyProposal();

  const [kindFilter, setKindFilter] = useState<'all' | ProposalKind>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyProposalListItem | null>(null);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [html, setHtml] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [kind, setKind] = useState<ProposalKind>('proposal');
  const [planTarget, setPlanTarget] = useState<AgencyProposalListItem | null>(null);
  const [responsesTargetId, setResponsesTargetId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>('cuestionario-curso-v2');
  const { data: responseCounts = {} } = useFormResponseCounts();

  const { data: clientsList = [] } = useQuery({
    queryKey: ['doc-clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<AgencyProposalListItem | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AgencyProposalListItem | null>(null);
  const [viewsTargetId, setViewsTargetId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AgencyProposalListItem | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editorPreview, setEditorPreview] = useState(false);
  const [editorHtmlLoading, setEditorHtmlLoading] = useState(false);


  // Quick "Editar info" dialog state
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTarget, setInfoTarget] = useState<AgencyProposalListItem | null>(null);
  const [infoClientId, setInfoClientId] = useState<string>('');
  const [infoClientName, setInfoClientName] = useState('');
  const [infoContact, setInfoContact] = useState('');
  const [infoAmount, setInfoAmount] = useState('');
  const [infoCurrency, setInfoCurrency] = useState<'USD' | 'CRC'>('USD');
  const [infoPackage, setInfoPackage] = useState<PackageType | ''>('');
  const [savingInfo, setSavingInfo] = useState(false);

  const openInfo = (p: AgencyProposalListItem) => {
    setInfoTarget(p);
    setInfoClientId((p as any).client_id || '');
    setInfoClientName(p.client_name || '');
    setInfoContact(p.contact_point || '');
    setInfoAmount(p.amount != null ? String(p.amount) : '');
    setInfoCurrency((p.currency as 'USD' | 'CRC') || 'USD');
    setInfoPackage((p.package_type as PackageType) || '');
    setInfoOpen(true);
  };

  const saveInfo = async () => {
    if (!infoTarget) return;
    setSavingInfo(true);
    try {
      const matchedClient = clientsList.find((c) => c.id === infoClientId);
      await updateMut.mutateAsync({
        id: infoTarget.id,
        client_id: infoClientId || null,
        client_name: matchedClient?.name || infoClientName.trim() || null,
        contact_point: infoContact.trim() || null,
        amount: infoAmount.trim() === '' ? null : Number(infoAmount),
        currency: infoCurrency,
        package_type: infoPackage || null,
      });
      toast.success('Información actualizada');
      setInfoOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar');
    } finally {
      setSavingInfo(false);
    }
  };


  const openCreate = (initialKind: ProposalKind = 'proposal') => {
    setEditing(null);
    setTitle('');
    setClientName('');
    setClientId('');
    setHtml(initialKind === 'form' ? FORM_TEMPLATES[0].html : '');
    setTemplateId('cuestionario-curso-v2');
    setIsPublished(true);
    setKind(initialKind);
    setEditorPreview(false);
    setEditorOpen(true);
  };

  const openEdit = async (p: AgencyProposalListItem) => {
    setEditing(p);
    setTitle(p.title);
    setClientId((p as any).client_id || '');
    setClientName(p.client_name || '');
    setHtml('');
    setIsPublished(p.is_published);
    setKind((p.kind as ProposalKind) || 'proposal');
    setEditorPreview(false);
    setEditorOpen(true);
    setEditorHtmlLoading(true);
    try {
      const content = await fetchProposalHtml(p.id);
      setHtml(content);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el HTML');
    } finally {
      setEditorHtmlLoading(false);
    }
  };



  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    try {
      const matched = clientsList.find((c) => c.id === clientId);
      const resolvedName = matched?.name || clientName.trim() || null;
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          title: title.trim(),
          client_id: clientId || null,
          client_name: resolvedName,
          html_content: html,
          is_published: isPublished,
          kind,
        });
        toast.success(`Se actualizó el ${KIND_LABEL[kind]}`);
      } else {
        await createMut.mutateAsync({
          title: title.trim(),
          client_id: clientId || null,
          client_name: resolvedName,
          html_content: html,
          is_published: isPublished,
          kind,
        });
        toast.success(`Se creó el ${KIND_LABEL[kind]}`);
      }
      setEditorOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la propuesta');
    }
  };

  const copyLink = async (p: AgencyProposalListItem) => {
    const url = buildShareUrl(p.slug, (p.kind as ProposalKind) || 'proposal');
    const ok = await copyToClipboard(url);
    if (ok) {
      toast.success('Link copiado al portapapeles');
    } else {
      toast.error('No se pudo copiar. Copialo manualmente: ' + url);
    }
  };

  const openEmail = (p: AgencyProposalListItem) => {
    const isReport = p.kind === 'report';
    setEmailTarget(p);
    setEmailTo('');
    setEmailToName('');
    setEmailSubject(`${isReport ? 'Reporte' : 'Propuesta'}: ${p.title}`);
    setEmailMessage(
      `Hola${p.client_name ? ' ' + p.client_name : ''},\n\nTe comparto ${isReport ? 'el reporte' : 'la propuesta'} que preparamos para vos. Podés ver${isReport ? 'lo' : 'la'} en el siguiente enlace:`,
    );
    setEmailOpen(true);
  };

  const sendEmail = async () => {
    if (!emailTarget) return;
    if (!emailTo.trim()) {
      toast.error('Ingresá un email destinatario');
      return;
    }
    setSendingEmail(true);
    const url = buildShareUrl(emailTarget.slug, (emailTarget.kind as ProposalKind) || 'proposal');
    const safeMessage = emailMessage
      .split('\n')
      .map((line) => `<p style="margin:0 0 12px 0;color:#334155;font-size:15px;line-height:1.55;">${line || '&nbsp;'}</p>`)
      .join('');

    const emailHtml = `
      <!doctype html>
      <html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
          <div style="background:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">${emailTarget.title}</h1>
            ${safeMessage}
            <div style="margin:24px 0 8px 0;">
              <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;">Ver propuesta</a>
            </div>
            <p style="margin:20px 0 0 0;color:#64748b;font-size:13px;">O copiá este enlace en tu navegador:<br/><a href="${url}" style="color:#334155;">${url}</a></p>
          </div>
        </div>
      </body></html>
    `;

    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailTo.trim(),
          toName: emailToName.trim() || null,
          subject: emailSubject.trim() || `Propuesta: ${emailTarget.title}`,
          html: emailHtml,
        },
      });
      if (error) throw error;
      if ((data as any)?.skipped) {
        toast.warning('El destinatario está en lista de exclusión');
      } else {
        toast.success('Email enviado');
      }
      setEmailOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo enviar el email');
    } finally {
      setSendingEmail(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Propuesta eliminada');
      setDeleteTarget(null);
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  useEffect(() => {
    if (!previewTarget) {
      setPreviewHtml('');
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    fetchProposalHtml(previewTarget.id)
      .then((content) => {
        if (!cancelled) setPreviewHtml(content);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error('No se pudo cargar la vista previa');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewTarget]);

  const sorted = useMemo(
    () => (kindFilter === 'all' ? proposals : proposals.filter((p) => ((p.kind as ProposalKind) || 'proposal') === kindFilter)),
    [proposals, kindFilter],
  );

  const counts = useMemo(() => {
    const c: Record<'all' | ProposalKind, number> = { all: proposals.length, proposal: 0, report: 0, content_plan: 0, form: 0 };
    for (const p of proposals) {
      const k = ((p.kind as ProposalKind) || 'proposal');
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [proposals]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Documentación
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Propuestas, reportes y planes de contenido compartibles con link o correo.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => openCreate('form')} className="gap-2">
              <ListChecks className="h-4 w-4" /> Nuevo formulario
            </Button>
            <Button variant="outline" onClick={() => openCreate('content_plan')} className="gap-2">
              <ClipboardList className="h-4 w-4" /> Nuevo plan
            </Button>
            <Button variant="outline" onClick={() => openCreate('report')} className="gap-2">
              <BarChart3 className="h-4 w-4" /> Nuevo reporte
            </Button>
            <Button variant="outline" onClick={() => openCreate('proposal')} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva propuesta
            </Button>
          </div>
        </div>

        <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as 'all' | ProposalKind)}>
          <TabsList>
            <TabsTrigger value="all">Todo ({counts.all})</TabsTrigger>
            <TabsTrigger value="proposal" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Propuestas ({counts.proposal})
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Reportes ({counts.report})
            </TabsTrigger>
            <TabsTrigger value="content_plan" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Planes ({counts.content_plan})
            </TabsTrigger>
            <TabsTrigger value="form" className="gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Formularios ({counts.form})
            </TabsTrigger>
          </TabsList>
        </Tabs>


        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">Todavía no hay {kindFilter === 'report' ? 'reportes' : kindFilter === 'proposal' ? 'propuestas' : kindFilter === 'content_plan' ? 'planes de contenido' : 'nada acá'}</p>
              <p className="text-sm mt-1">Creá tu primer {kindFilter === 'report' ? 'reporte' : kindFilter === 'content_plan' ? 'plan de contenido' : 'propuesta'} pegando el HTML.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((p) => (
              <Card key={p.id} className="group flex flex-col overflow-hidden rounded-xl border-border/70 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <button type="button" onClick={() => setPreviewTarget(p)} className="text-left flex-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${p.kind === 'report' ? 'bg-blue-500/10 text-blue-600' : p.kind === 'content_plan' ? 'bg-amber-500/10 text-amber-600' : p.kind === 'form' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                        {p.kind === 'report' ? <BarChart3 className="h-3 w-3" /> : p.kind === 'content_plan' ? <ClipboardList className="h-3 w-3" /> : p.kind === 'form' ? <ListChecks className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {p.kind === 'report' ? 'Reporte' : p.kind === 'content_plan' ? 'Plan' : p.kind === 'form' ? 'Formulario' : 'Propuesta'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          title={
                            p.last_viewed_at
                              ? `Última vista: ${format(new Date(p.last_viewed_at), "d MMM yyyy HH:mm", { locale: es })}`
                              : 'Sin vistas todavía'
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {p.view_count ?? 0} {(p.view_count ?? 0) === 1 ? 'vista' : 'vistas'}
                        </span>
                        {p.kind === 'form' && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${(responseCounts[p.id] ?? 0) > 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                            title="Respuestas recibidas"
                          >
                            <Inbox className="h-3 w-3" />
                            {responseCounts[p.id] ?? 0}
                          </span>
                        )}
                        {p.is_published ? (
                          <span title="Publicada" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ) : (
                          <span title="Oculta" className="text-muted-foreground"><EyeOff className="h-3.5 w-3.5" /></span>
                        )}
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold leading-tight line-clamp-2 pt-2">{p.title}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {p.client_name ? `Cliente: ${p.client_name}` : 'Sin cliente'}
                      {p.contact_point ? ` · ${p.contact_point}` : ''}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/60">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Fecha</p>
                        <p className="text-sm font-medium">{format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Monto / Paquete</p>
                        <p className="text-sm font-medium truncate">
                          {p.amount != null ? formatMoney(p.amount, p.currency) : '—'}
                          {p.package_type ? ` · ${PACKAGE_LABELS[p.package_type]}` : ''}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </button>

                <div className="mt-auto border-t bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs font-semibold" onClick={() => setPreviewTarget(p)}>
                      <Monitor className="h-3.5 w-3.5" /> Vista previa
                    </Button>
                    {p.kind === 'form' ? (
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5 text-xs font-semibold border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10" onClick={() => setResponsesTargetId(p.id)}>
                        <Inbox className="h-3.5 w-3.5" /> Respuestas ({responseCounts[p.id] ?? 0})
                      </Button>
                    ) : p.kind === 'content_plan' ? (
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5 text-xs font-semibold border-primary/60 text-primary hover:bg-primary/10" onClick={() => setPlanTarget(p)}>
                        <Sparkles className="h-3.5 w-3.5" /> Producción
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5 text-xs font-semibold" onClick={() => openEmail(p)}>
                        <Mail className="h-3.5 w-3.5" /> Enviar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Editar info" onClick={() => openInfo(p)}>
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Copiar link" onClick={() => copyLink(p)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Enviar por correo" onClick={() => openEmail(p)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Ver vistas" onClick={() => setViewsTargetId(p.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Editar HTML" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Borrar" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

            ))}
          </div>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-5xl max-h-[92dvh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
            <DialogTitle>
              {editing ? `Editar ${KIND_LABEL[kind]}` : `Nuevo ${KIND_LABEL[kind]}`}
            </DialogTitle>
            <DialogDescription>
              {kind === 'form'
                ? 'Elegí una plantilla, ponele nombre y compartila por link o correo. El cliente la llena y le da Enviar.'
                : 'Pegá el código HTML completo. Se mostrará tal cual en el link público.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as ProposalKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal">Propuesta</SelectItem>
                      <SelectItem value="report">Reporte</SelectItem>
                      <SelectItem value="content_plan">Plan de contenido</SelectItem>
                      <SelectItem value="form">Formulario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'report' ? 'Reporte mensual' : kind === 'content_plan' ? 'Plan de contenido - Mes' : 'Propuesta comercial'} />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={clientId || '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        setClientId('');
                      } else {
                        setClientId(v);
                        const found = clientsList.find((c) => c.id === v);
                        if (found) setClientName(found.name);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin cliente</SelectItem>
                      {clientsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {kind === 'form' && !editing && (
                <div className="space-y-2">
                  <Label>Plantilla</Label>
                  <Select
                    value={templateId}
                    onValueChange={(v) => {
                      setTemplateId(v);
                      const t = FORM_TEMPLATES.find((x) => x.id === v);
                      setHtml(t?.html ?? '');
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORM_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {FORM_TEMPLATES.find((t) => t.id === templateId)?.description}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>HTML o JSX</Label>
                  <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setEditorPreview(false)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${!editorPreview ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                    >
                      <Code2 className="h-3.5 w-3.5" /> Código
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorPreview(true)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${editorPreview ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                    >
                      <Monitor className="h-3.5 w-3.5" /> Vista previa
                    </button>
                  </div>
                </div>
                {editorPreview ? (
                  html.trim() ? (
                    <iframe
                      title="Vista previa propuesta"
                      srcDoc={kind === 'form' ? buildFormDocument(html, title || 'Formulario') : renderDocumentSource(html, title || 'Documento')}
                      sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
                      className="w-full h-[50dvh] min-h-[280px] rounded-md border bg-white"
                    />
                  ) : (
                    <div className="w-full h-[50dvh] min-h-[280px] rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                      Pegá HTML o JSX en la pestaña "Código" para ver la vista previa.
                    </div>
                  )
                ) : (
                  <Textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder={'<html>...</html>  ó  export default function App() { return <div className="p-8">Hola</div>; }'}
                    className="h-[50dvh] min-h-[280px] font-mono text-xs"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <Label className="text-sm">Publicada</Label>
                  <p className="text-xs text-muted-foreground">Si se desactiva, el link público deja de funcionar.</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </div>
          </div>
          <DialogFooter className="px-4 sm:px-6 py-3 border-t shrink-0 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Guardar cambios' : `Crear ${KIND_LABEL[kind]}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Enviar propuesta por email</DialogTitle>
            <DialogDescription>
              Se envía un correo con un botón que abre el link de la propuesta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email destinatario</Label>
                <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="cliente@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre (opcional)</Label>
                <Input value={emailToName} onChange={(e) => setEmailToName(e.target.value)} placeholder="Juan Pérez" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Asunto</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <Textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} className="min-h-[120px]" />
            </div>
            {emailTarget && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                <span className="truncate">{buildShareUrl(emailTarget.slug, (emailTarget.kind as ProposalKind) || 'proposal')}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={sendEmail} disabled={sendingEmail}>
              {sendingEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      {/* Quick edit info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="h-4 w-4" /> Editar información</DialogTitle>
            <DialogDescription>
              Datos que se muestran en la tarjeta de la propuesta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={infoClientId || '__none__'}
                onValueChange={(v) => {
                  if (v === '__none__') {
                    setInfoClientId('');
                  } else {
                    setInfoClientId(v);
                    const found = clientsList.find((c) => c.id === v);
                    if (found) setInfoClientName(found.name);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cliente</SelectItem>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Punto de contacto</Label>
              <Input value={infoContact} onChange={(e) => setInfoContact(e.target.value)} placeholder="Ej: Juan Pérez — juan@empresa.com" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5 col-span-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={infoAmount}
                  onChange={(e) => setInfoAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={infoCurrency} onValueChange={(v) => setInfoCurrency(v as 'USD' | 'CRC')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CRC">CRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de paquete</Label>
              <Select value={infoPackage} onValueChange={(v) => setInfoPackage(v as PackageType)}>
                <SelectTrigger><SelectValue placeholder="Seleccioná una opción" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="one_time">Pago único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>Cancelar</Button>
            <Button onClick={saveInfo} disabled={savingInfo}>
              {savingInfo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propuesta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El link público dejará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview dialog */}
      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-6xl h-[92dvh] max-h-[92dvh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 sm:px-5 py-3 border-b space-y-0 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 pr-8 sm:pr-4">
              <DialogTitle className="truncate text-base">{previewTarget?.title}</DialogTitle>
              <DialogDescription className="truncate text-xs">
                {previewTarget?.client_name || 'Sin cliente'} · {previewTarget ? buildShareUrl(previewTarget.slug, (previewTarget.kind as ProposalKind) || 'proposal') : ''}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {previewTarget && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyLink(previewTarget)}>
                    <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Link</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(buildShareUrl(previewTarget.slug, (previewTarget.kind as ProposalKind) || 'proposal'), '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Abrir</span>
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const t = previewTarget;
                      setPreviewTarget(null);
                      if (t) openEdit(t);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Editar</span>
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {previewTarget && (
              previewLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : previewHtml ? (
                <iframe
                  title={`Vista previa ${previewTarget.title}`}
                  srcDoc={previewTarget.kind === 'form' ? buildFormDocument(previewHtml, previewTarget.title) : renderDocumentSource(previewHtml, previewTarget.title)}
                  sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
                  className="w-full h-full bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Esta propuesta todavía no tiene HTML cargado.
                </div>
              )
            )}
          </div>

        </DialogContent>
      </Dialog>

      <AddPlanToSheetDialog
        open={!!planTarget}
        onOpenChange={(v) => { if (!v) setPlanTarget(null); }}
        planId={planTarget?.id ?? null}
        planTitle={planTarget?.title ?? ''}
        defaultClientName={planTarget?.client_name ?? null}
      />

      <FormResponsesDialog
        proposalId={responsesTargetId}
        title={proposals.find((p) => p.id === responsesTargetId)?.title}
        onClose={() => setResponsesTargetId(null)}
      />

      <DocumentViewsDialog
        proposalId={viewsTargetId}
        title={proposals.find((p) => p.id === viewsTargetId)?.title}
        onClose={() => setViewsTargetId(null)}
      />
    </DashboardLayout>
  );
};

export default Propuestas;
