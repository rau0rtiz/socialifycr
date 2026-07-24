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
import { FileText, Plus, Link as LinkIcon, Mail, Pencil, Trash2, ExternalLink, Copy, Loader2, Eye, EyeOff, Info, Package as PackageIcon, User as UserIcon, DollarSign, Monitor, Code2, BarChart3, ClipboardList, Sparkles } from 'lucide-react';
import { AddPlanToSheetDialog } from '@/components/producciones/AddPlanToSheetDialog';
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
const KIND_PATH: Record<ProposalKind, string> = { proposal: 'propuesta', report: 'reporte', content_plan: 'plan' };
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
    setHtml('');
    setIsPublished(true);
    setKind(initialKind);
    setEditorPreview(false);
    setEditorOpen(true);
  };

  const openEdit = async (p: AgencyProposalListItem) => {
    setEditing(p);
    setTitle(p.title);
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
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          title: title.trim(),
          client_name: clientName.trim() || null,
          html_content: html,
          is_published: isPublished,
          kind,
        });
        toast.success(kind === 'report' ? 'Reporte actualizado' : kind === 'content_plan' ? 'Plan actualizado' : 'Propuesta actualizada');
      } else {
        await createMut.mutateAsync({
          title: title.trim(),
          client_name: clientName.trim() || null,
          html_content: html,
          is_published: isPublished,
          kind,
        });
        toast.success(kind === 'report' ? 'Reporte creado' : kind === 'content_plan' ? 'Plan creado' : 'Propuesta creada');
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
    const c: Record<'all' | ProposalKind, number> = { all: proposals.length, proposal: 0, report: 0, content_plan: 0 };
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
              <Card key={p.id} className="flex flex-col hover:shadow-md hover:border-primary/40 transition-all">
                <button
                  type="button"
                  onClick={() => setPreviewTarget(p)}
                  className="text-left"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug line-clamp-2">{p.title}</CardTitle>
                      {p.is_published ? (
                        <span title="Publicada" className="text-emerald-600 shrink-0"><Eye className="h-4 w-4" /></span>
                      ) : (
                        <span title="Oculta" className="text-muted-foreground shrink-0"><EyeOff className="h-4 w-4" /></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${p.kind === 'report' ? 'bg-blue-500/10 text-blue-600' : p.kind === 'content_plan' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                        {p.kind === 'report' ? <BarChart3 className="h-3 w-3" /> : p.kind === 'content_plan' ? <ClipboardList className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {p.kind === 'report' ? 'Reporte' : p.kind === 'content_plan' ? 'Plan' : 'Propuesta'}
                      </span>
                      <span>·</span>
                      <span>{format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="grid grid-cols-1 gap-1.5 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{p.client_name || 'Sin cliente'}</span>
                      </div>
                      {p.contact_point && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{p.contact_point}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {p.amount != null ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            {formatMoney(p.amount, p.currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin monto</span>
                        )}
                        {p.package_type && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            <PackageIcon className="h-3 w-3" />
                            {PACKAGE_LABELS[p.package_type]}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>
                <CardContent className="pt-0 pb-4 mt-auto">
                  <div className="flex flex-wrap gap-1.5 border-t pt-3">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setPreviewTarget(p)}>
                      <Monitor className="h-3.5 w-3.5" /> Vista previa
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openInfo(p)}>
                      <Info className="h-3.5 w-3.5" /> Editar info
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => copyLink(p)}>
                      <Copy className="h-3.5 w-3.5" /> Link
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openEmail(p)}>
                      <Mail className="h-3.5 w-3.5" /> Enviar
                    </Button>
                    {p.kind === 'content_plan' && (
                      <Button size="sm" className="gap-1.5 h-8 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setPlanTarget(p)}>
                        <Sparkles className="h-3.5 w-3.5" /> A hoja de producción
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => openEdit(p)} title="Editar HTML">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 h-8 text-destructive hover:text-destructive ml-auto"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
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
              {(() => {
                const label = kind === 'report' ? 'reporte' : kind === 'content_plan' ? 'plan de contenido' : 'propuesta';
                return editing ? `Editar ${label}` : `Nuevo ${label}`;
              })()}
            </DialogTitle>
            <DialogDescription>
              Pegá el código HTML completo. Se mostrará tal cual en el link público.
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'report' ? 'Reporte mensual' : kind === 'content_plan' ? 'Plan de contenido - Mes' : 'Propuesta comercial'} />
                </div>
                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>HTML</Label>
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
                      srcDoc={html}
                      sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
                      className="w-full h-[50dvh] min-h-[280px] rounded-md border bg-white"
                    />
                  ) : (
                    <div className="w-full h-[50dvh] min-h-[280px] rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                      Pegá HTML en la pestaña "Código" para ver la vista previa.
                    </div>
                  )
                ) : (
                  <Textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder="<html>...</html>"
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
              {editing ? 'Guardar cambios' : (kind === 'report' ? 'Crear reporte' : kind === 'content_plan' ? 'Crear plan' : 'Crear propuesta')}
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
              <Label>Nombre del cliente</Label>
              <Input value={infoClientName} onChange={(e) => setInfoClientName(e.target.value)} placeholder="Ej: Comfortex" />
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
                  srcDoc={previewHtml}
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
    </DashboardLayout>
  );
};

export default Propuestas;
