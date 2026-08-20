import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Loader2, Send, Receipt, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  sheetId: string;
  defaultSubject?: string;
}

export function SendSummaryEmailDialog({ open, onClose, sheetId, defaultSubject }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [includeTech, setIncludeTech] = useState(false);
  const [format, setFormat] = useState<'receipt' | 'editorial'>('receipt');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const emails = email.split(',').map(s => s.trim()).filter(Boolean);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emails.length === 0 || emails.some(e => !re.test(e))) {
      toast.error('Ingresá uno o más correos válidos (separados por coma).');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-production-summary', {
        body: {
          sheetId,
          recipientEmail: email,
          recipientName: name || null,
          subject: subject || null,
          includeTechNotes: includeTech,
          format,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Correo enviado a ${emails.length} destinatario${emails.length !== 1 ? 's' : ''}`);
      onClose();
      setEmail(''); setName(''); setSubject(defaultSubject || ''); setIncludeTech(false);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo enviar el correo');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !sending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Enviar resumen por correo</DialogTitle>
          <DialogDescription>
            Elegí el formato: comprobante tipo recibo con los nombres de los videos, o resumen editorial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'receipt' as const, icon: Receipt, label: 'Recibo de entrega', desc: 'Lista tipo ticket con nombres' },
              { v: 'editorial' as const, icon: FileText, label: 'Resumen editorial', desc: 'Concepto, hook y CTA' },
            ]).map(({ v, icon: Icon, label, desc }) => (
              <button
                key={v}
                type="button"
                onClick={() => setFormat(v)}
                className={`rounded-xl border p-3 text-left transition ${format === v ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <Icon className={`h-4 w-4 mb-1.5 ${format === v ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-sm font-medium leading-tight">{label}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">Correo del destinatario *</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@empresa.com (o varios, separados por coma)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="name" className="text-xs">Nombre (opcional)</Label>
            <Input id="name" placeholder="Para el saludo" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="subject" className="text-xs">Asunto (opcional)</Label>
            <Input
              id="subject"
              placeholder={defaultSubject || 'Resumen de producción'}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {format === 'editorial' && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Incluir notas técnicas</div>
              <div className="text-xs text-muted-foreground">Normalmente esto es interno — dejalo apagado.</div>
            </div>
            <Switch checked={includeTech} onCheckedChange={setIncludeTech} />
          </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || !email.trim()}>
            {sending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enviando…</> : <><Send className="h-4 w-4 mr-1.5" /> Enviar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
