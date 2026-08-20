import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send, Upload, Code2, Link as LinkIcon, Copy, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useCreateAgencyProposal,
  useUpdateAgencyProposal,
  fetchProposalHtml,
  type AgencyProposalListItem,
} from '@/hooks/use-agency-proposals';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Documento de tipo "email" existente para editar */
  target?: AgencyProposalListItem | null;
  publicBaseUrl?: string;
}

const EmailPreviewDialog = ({ open, onOpenChange, target = null, publicBaseUrl = 'https://app.socialifycr.com' }: Props) => {
  const createMut = useCreateAgencyProposal();
  const updateMut = useUpdateAgencyProposal();

  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (target) {
      setTitle(target.title);
      setSubject(target.title);
      setSlug(target.slug);
      setDocId(target.id);
      setLoadingHtml(true);
      fetchProposalHtml(target.id)
        .then(setHtml)
        .catch(() => toast.error('No se pudo cargar el HTML'))
        .finally(() => setLoadingHtml(false));
    } else {
      setTitle('');
      setSubject('');
      setHtml('');
      setSlug(null);
      setDocId(null);
      setFileName(null);
      setTo('');
    }
  }, [open, target]);

  const shareUrl = slug ? `${publicBaseUrl}/correo/${slug}` : null;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setHtml(text);
    setFileName(file.name);
    if (!title.trim()) setTitle(file.name.replace(/\.html?$/i, ''));
    toast.success(`HTML cargado desde ${file.name}`);
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error('Ponele un título al correo');
      return;
    }
    if (!html.trim()) {
      toast.error('Pegá o cargá el HTML del correo');
      return;
    }
    setSaving(true);
    try {
      if (docId) {
        await updateMut.mutateAsync({ id: docId, title: title.trim(), html_content: html, kind: 'email' });
        toast.success('Correo actualizado');
      } else {
        const created = await createMut.mutateAsync({
          title: title.trim(),
          html_content: html,
          is_published: true,
          kind: 'email',
        });
        setDocId(created.id);
        setSlug(created.slug);
        toast.success('Correo guardado — ya tenés link para compartir');
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar el correo');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado');
    } catch {
      toast.error('Copialo manualmente: ' + shareUrl);
    }
  };

  const send = async () => {
    const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (recipients.length === 0 || recipients.some((e) => !re.test(e))) {
      toast.error('Ingresá uno o más correos válidos (separados por coma).');
      return;
    }
    if (!html.trim()) {
      toast.error('Pegá o cargá el HTML del correo.');
      return;
    }
    setSending(true);
    let ok = 0;
    const failed: string[] = [];
    for (const email of recipients) {
      try {
        const { error } = await supabase.functions.invoke('send-notification-email', {
          body: { to: email, subject: subject.trim() || title.trim() || '[Preview] Correo de prueba', html },
        });
        if (error) throw error;
        ok++;
      } catch (err) {
        console.error('email preview failed for', email, err);
        failed.push(email);
      }
    }
    setSending(false);
    if (ok > 0) toast.success(`Preview enviado a ${ok} destinatario${ok !== 1 ? 's' : ''}`);
    if (failed.length) toast.error(`No se pudo enviar a: ${failed.join(', ')}`);
  };

  const busy = sending || saving;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {target ? 'Correo' : 'Nuevo correo'}
          </DialogTitle>
          <DialogDescription>
            Cargá un .html o pegá el código: se guarda como documento con link público para ver online y también podés enviar el preview por correo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="prev-title" className="text-xs">Título del documento *</Label>
              <Input id="prev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Newsletter agosto" />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Cargar .html
              </Button>
              {fileName && <span className="text-xs text-muted-foreground truncate">{fileName}</span>}
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> HTML del correo</Label>
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<!doctype html> <html> ... </html>"
                className="font-mono text-xs h-52 mt-1"
                disabled={loadingHtml}
              />
            </div>

            {shareUrl && (
              <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1.5">
                <p className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                  <LinkIcon className="h-3 w-3" /> Link público
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={shareUrl} className="h-8 text-xs" />
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="prev-subject" className="text-xs">Asunto del envío</Label>
                <Input id="prev-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={title || '[Preview] Correo'} />
              </div>
              <div>
                <Label htmlFor="prev-to" className="text-xs">Correos de prueba</Label>
                <Input id="prev-to" placeholder="raul@socialifycr.com, otro@correo.com" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Vista previa (igual que se ve online)</Label>
            <div className="rounded-xl border overflow-hidden bg-white h-[60vh]">
              {loadingHtml ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : html.trim() ? (
                <iframe
                  srcDoc={html}
                  title="Preview del correo"
                  sandbox="allow-same-origin allow-popups allow-forms allow-scripts"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                  Pegá o cargá el HTML para ver la vista previa.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cerrar</Button>
          <Button variant="outline" onClick={save} disabled={busy || !title.trim() || !html.trim()} className="gap-1.5">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <><Save className="h-4 w-4" /> {docId ? 'Guardar cambios' : 'Guardar y crear link'}</>}
          </Button>
          <Button onClick={send} disabled={busy || !to.trim() || !html.trim()} className="gap-1.5">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <><Send className="h-4 w-4" /> Enviar preview</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewDialog;
