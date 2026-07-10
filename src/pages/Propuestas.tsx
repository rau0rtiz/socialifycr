import { useMemo, useState } from 'react';
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
  type AgencyProposal,
  type PackageType,
} from '@/hooks/use-agency-proposals';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Plus, Link as LinkIcon, Mail, Pencil, Trash2, ExternalLink, Copy, Loader2, Eye, EyeOff, Info, Package as PackageIcon, User as UserIcon, DollarSign } from 'lucide-react';
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

const buildShareUrl = (slug: string) => `${window.location.origin}/propuesta/${slug}`;

const Propuestas = () => {
  const { data: proposals = [], isLoading } = useAgencyProposals();
  const createMut = useCreateAgencyProposal();
  const updateMut = useUpdateAgencyProposal();
  const deleteMut = useDeleteAgencyProposal();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyProposal | null>(null);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [html, setHtml] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<AgencyProposal | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailToName, setEmailToName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AgencyProposal | null>(null);

  // Quick "Editar info" dialog state
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTarget, setInfoTarget] = useState<AgencyProposal | null>(null);
  const [infoClientName, setInfoClientName] = useState('');
  const [infoContact, setInfoContact] = useState('');
  const [infoAmount, setInfoAmount] = useState('');
  const [infoCurrency, setInfoCurrency] = useState<'USD' | 'CRC'>('USD');
  const [infoPackage, setInfoPackage] = useState<PackageType | ''>('');
  const [savingInfo, setSavingInfo] = useState(false);

  const openInfo = (p: AgencyProposal) => {
    setInfoTarget(p);
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
      await updateMut.mutateAsync({
        id: infoTarget.id,
        client_name: infoClientName.trim() || null,
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


  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setClientName('');
    setHtml('');
    setIsPublished(true);
    setEditorOpen(true);
  };

  const openEdit = (p: AgencyProposal) => {
    setEditing(p);
    setTitle(p.title);
    setClientName(p.client_name || '');
    setHtml(p.html_content || '');
    setIsPublished(p.is_published);
    setEditorOpen(true);
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
        });
        toast.success('Propuesta actualizada');
      } else {
        await createMut.mutateAsync({
          title: title.trim(),
          client_name: clientName.trim() || null,
          html_content: html,
          is_published: isPublished,
        });
        toast.success('Propuesta creada');
      }
      setEditorOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la propuesta');
    }
  };

  const copyLink = async (p: AgencyProposal) => {
    const url = buildShareUrl(p.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const openEmail = (p: AgencyProposal) => {
    setEmailTarget(p);
    setEmailTo('');
    setEmailToName('');
    setEmailSubject(`Propuesta: ${p.title}`);
    setEmailMessage(
      `Hola${p.client_name ? ' ' + p.client_name : ''},\n\nTe comparto la propuesta que preparamos para vos. Podés verla en el siguiente enlace:`,
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
    const url = buildShareUrl(emailTarget.slug);
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

  const sorted = useMemo(() => proposals, [proposals]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Propuestas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cargá HTML de una propuesta y compartila con un link o por correo.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva propuesta
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">Todavía no hay propuestas</p>
              <p className="text-sm mt-1">Creá tu primera propuesta pegando el HTML.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((p) => (
              <Card key={p.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">{p.title}</CardTitle>
                    {p.is_published ? (
                      <span title="Publicada" className="text-emerald-600 shrink-0"><Eye className="h-4 w-4" /></span>
                    ) : (
                      <span title="Oculta" className="text-muted-foreground shrink-0"><EyeOff className="h-4 w-4" /></span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.client_name || 'Sin cliente'} · {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                  <div className="rounded-md border bg-muted/30 h-28 overflow-hidden text-[10px] text-muted-foreground p-2 font-mono line-clamp-6">
                    {p.html_content?.slice(0, 280) || '<vacío>'}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyLink(p)}>
                      <Copy className="h-3.5 w-3.5" /> Link
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                      <a href={buildShareUrl(p.slug)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEmail(p)}>
                      <Mail className="h-3.5 w-3.5" /> Enviar
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive hover:text-destructive ml-auto"
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar propuesta' : 'Nueva propuesta'}</DialogTitle>
            <DialogDescription>
              Pegá el código HTML completo de la propuesta. Se mostrará tal cual en el link público.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Propuesta comercial" />
              </div>
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>HTML</Label>
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<html>...</html>"
                className="min-h-[280px] font-mono text-xs"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Publicada</Label>
                <p className="text-xs text-muted-foreground">Si se desactiva, el link público deja de funcionar.</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Guardar cambios' : 'Crear propuesta'}
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
                <span className="truncate">{buildShareUrl(emailTarget.slug)}</span>
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
    </DashboardLayout>
  );
};

export default Propuestas;
