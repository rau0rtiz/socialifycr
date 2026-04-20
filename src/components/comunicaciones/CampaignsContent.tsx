import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, Send, CheckCircle2, AlertCircle, Trash2, X, FileText, Users, Plus, Eye } from 'lucide-react';
import { useEmailCampaigns, useCancelScheduledCampaign, useDeleteCampaign, type EmailCampaign } from '@/hooks/use-email-campaigns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SendCampaignDialog } from './SendCampaignDialog';

const statusConfig: Record<EmailCampaign['status'], { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Borrador',  color: 'bg-muted text-muted-foreground border-border',           icon: FileText },
  scheduled: { label: 'Programada',color: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400', icon: CalendarClock },
  sending:   { label: 'Enviando',  color: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',     icon: Send },
  sent:      { label: 'Enviada',   color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400', icon: CheckCircle2 },
  failed:    { label: 'Fallida',   color: 'bg-destructive/10 text-destructive border-destructive/30',               icon: AlertCircle },
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const CampaignsContent = () => {
  const { data: campaigns, isLoading } = useEmailCampaigns();
  const cancelMut = useCancelScheduledCampaign();
  const deleteMut = useDeleteCampaign();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const sorted = campaigns ? (() => {
    const order: Record<EmailCampaign['status'], number> = { scheduled: 0, sending: 1, draft: 2, failed: 3, sent: 4 };
    return [...campaigns].sort((a, b) => {
      const oa = order[a.status] ?? 9;
      const ob = order[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  })() : [];

  const scheduled = sorted.filter(c => c.status === 'scheduled');

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Campañas
          </h2>
          <p className="text-sm text-muted-foreground">
            Histórico de envíos masivos y campañas programadas
            {scheduled.length > 0 && (
              <> · <span className="text-amber-600 dark:text-amber-400 font-medium">{scheduled.length} programada{scheduled.length === 1 ? '' : 's'}</span></>
            )}
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Nueva campaña
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">No hay campañas todavía</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Empieza con <strong>Nueva campaña</strong> arriba o usa una <strong>Plantilla</strong>.
            </p>
          </CardContent>
        </Card>
      ) : (

      <div className="space-y-2.5">
        {sorted.map((c) => {
          const cfg = statusConfig[c.status];
          const Icon = cfg.icon;
          return (
            <Card
              key={c.id}
              className="hover:shadow-sm hover:border-primary/40 transition-all cursor-pointer"
              onClick={() => setPreviewCampaign(c)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      <span className="font-medium text-foreground/70">Asunto:</span> {c.subject}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.total_recipients ?? 0} destinatarios
                      </span>
                      {c.status === 'scheduled' && c.scheduled_for && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <CalendarClock className="h-3 w-3" />
                          Sale el {formatDate(c.scheduled_for)}
                        </span>
                      )}
                      {c.status === 'sent' && c.sent_at && (
                        <span>Enviada el {formatDate(c.sent_at)}</span>
                      )}
                      {c.status === 'sent' && (
                        <span>
                          ✓ {c.sent_count ?? 0}
                          {(c.failed_count ?? 0) > 0 && <span className="text-destructive"> · ✕ {c.failed_count}</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setPreviewCampaign(c); }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                    {c.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); setCancelId(c.id); }}
                      >
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    )}
                    {(c.status === 'draft' || c.status === 'failed' || c.status === 'sent') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* Composer for standalone (no-template) campaigns */}
      <SendCampaignDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        template={null}
        blankCompose
      />

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar programación?</AlertDialogTitle>
            <AlertDialogDescription>
              La campaña no se enviará automáticamente. Quedará como borrador y podrás volver a programarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelId) cancelMut.mutate(cancelId, { onSuccess: () => setCancelId(null) });
              }}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de la campaña. Los emails ya enviados no se borran del log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignsContent;
