import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send, Upload, Code2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EmailPreviewDialog = ({ open, onOpenChange }: Props) => {
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('[Preview] Correo de prueba');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setHtml(text);
    setFileName(file.name);
    toast.success(`HTML cargado desde ${file.name}`);
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
          body: { to: email, subject: subject.trim() || '[Preview] Correo de prueba', html },
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

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Preview de correo
          </DialogTitle>
          <DialogDescription>
            Cargá un archivo .html o pegá el código, revisá cómo se ve y envialo a los correos que quieras probar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
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
                className="font-mono text-xs h-64 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="prev-subject" className="text-xs">Asunto</Label>
              <Input id="prev-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="prev-to" className="text-xs">Correos de prueba *</Label>
              <Input
                id="prev-to"
                placeholder="raul@socialifycr.com, otro@correo.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Separá varios correos con coma.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Vista previa (igual que se ve online)</Label>
            <div className="rounded-xl border overflow-hidden bg-white h-[60vh]">
              {html.trim() ? (
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cerrar</Button>
          <Button onClick={send} disabled={sending || !to.trim() || !html.trim()} className="gap-1.5">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <><Send className="h-4 w-4" /> Enviar preview</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewDialog;
