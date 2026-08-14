import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Loader2, MapPin, Monitor, Timer, Users, Link as LinkIcon } from 'lucide-react';
import { useDocumentViews, formatDuration } from '@/hooks/use-document-views';

const formatCR = (iso: string) =>
  new Date(iso).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

interface Props {
  proposalId: string | null;
  title?: string;
  onClose: () => void;
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/30 p-3">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

const DocumentViewsDialog = ({ proposalId, title, onClose }: Props) => {
  const { views, summary, isLoading } = useDocumentViews(proposalId);

  return (
    <Dialog open={!!proposalId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Vistas del documento
          </DialogTitle>
          <DialogDescription className="truncate">
            {title || 'Documento'} · registro anónimo (no confirma identidad)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat icon={Eye} label="Visitas" value={String(summary.total)} />
          <Stat icon={Users} label="Visitantes" value={String(summary.uniqueVisitors)} />
          <Stat icon={Timer} label="Promedio" value={formatDuration(summary.avgSeconds)} />
          <Stat icon={Timer} label="Más larga" value={formatDuration(summary.maxSeconds)} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : views.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía nadie abrió este enlace.
          </p>
        ) : (
          <ScrollArea className="max-h-[45vh] pr-3">
            <div className="space-y-2">
              {views.map((v) => {
                const place = [v.city, v.country].filter(Boolean).join(', ');
                return (
                  <div key={v.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">
                          {formatInTimeZone(new Date(v.created_at), TZ, "d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Monitor className="h-3.5 w-3.5 shrink-0" />
                          {[v.device, v.browser].filter(Boolean).join(' · ') || 'Dispositivo desconocido'}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {place || 'Ubicación no disponible'}
                        </p>
                        {v.referrer && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Abierto desde enlace compartido</span>
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Timer className="h-3 w-3" />
                        {formatDuration(v.duration_seconds ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewsDialog;
