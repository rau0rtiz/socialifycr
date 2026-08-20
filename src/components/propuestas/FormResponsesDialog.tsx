import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Inbox, Mail, User as UserIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useFormResponses, fetchResponseHtml, type FormResponseListItem } from '@/hooks/use-form-responses';

interface Props {
  proposalId: string | null;
  title?: string;
  onClose: () => void;
}

const FormResponsesDialog = ({ proposalId, title, onClose }: Props) => {
  const { data: responses = [], isLoading } = useFormResponses(proposalId);
  const [selected, setSelected] = useState<FormResponseListItem | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (r: FormResponseListItem) => {
    setDownloading(r.id);
    try {
      const html = await fetchResponseHtml(r.id);
      if (!html) {
        toast.error('Esta respuesta no tiene copia HTML guardada');
        return;
      }
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'formulario').replace(/[^\w-]+/g, '-')}-${(r.respondent_name || 'respuesta').replace(/[^\w-]+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('No se pudo descargar');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={!!proposalId} onOpenChange={(o) => { if (!o) { setSelected(null); onClose(); } }}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[90dvh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            {selected ? (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7 -ml-1" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selected.respondent_name || 'Respuesta'}
              </>
            ) : (
              <>
                <Inbox className="h-4 w-4 text-primary" />
                Respuestas · {title}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selected
              ? `Enviado el ${format(new Date(selected.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}`
              : `${responses.length} ${responses.length === 1 ? 'envío recibido' : 'envíos recibidos'}. Cada envío se guarda por separado.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selected ? (
            <div className="divide-y">
              {selected.answers.filter((a) => a.value).length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Este envío llegó sin respuestas completadas.</p>
              )}
              {selected.answers.filter((a) => a.value).map((a) => (
                <div key={a.id} className="px-5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{a.label}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{a.value}</p>
                </div>
              ))}
              <div className="p-5">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => download(selected)} disabled={downloading === selected.id}>
                  {downloading === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Descargar HTML con respuestas
                </Button>
              </div>
            </div>
          ) : responses.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground px-6">
              <Inbox className="h-9 w-9 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">Todavía nadie llenó este formulario</p>
              <p className="text-sm mt-1">Compartí el link y las respuestas van a aparecer acá.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {responses.map((r) => {
                const filled = r.answers.filter((a) => a.value).length;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setSelected(r)}>
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {r.respondent_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-3 mt-0.5">
                        {r.respondent_email && (
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.respondent_email}</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(r.created_at), "d MMM yyyy HH:mm", { locale: es })}
                        </span>
                        <span>{filled} campos</span>
                      </p>
                    </button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Descargar HTML" onClick={() => download(r)} disabled={downloading === r.id}>
                      {downloading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormResponsesDialog;
