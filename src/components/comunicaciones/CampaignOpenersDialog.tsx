import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Eye, MailX, AlertCircle, Search, Download, Info } from 'lucide-react';
import { useCampaignOpeners } from '@/hooks/use-campaign-openers';

interface Props {
  campaignId: string | null;
  campaignName?: string;
  onOpenChange: (open: boolean) => void;
}

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

export const CampaignOpenersDialog = ({ campaignId, campaignName, onOpenChange }: Props) => {
  const { data: rows = [], isLoading } = useCampaignOpeners(campaignId);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'opened' | 'not_opened' | 'failed'>('opened');

  const stats = useMemo(() => {
    const sent = rows.filter(r => r.status === 'sent');
    const opened = sent.filter(r => !!r.opened_at);
    const failed = rows.filter(r => r.status === 'failed');
    const rate = sent.length > 0 ? Math.round((opened.length / sent.length) * 100) : 0;
    return { total: rows.length, sent: sent.length, opened: opened.length, failed: failed.length, rate };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = rows;
    if (tab === 'opened') base = rows.filter(r => r.status === 'sent' && r.opened_at);
    else if (tab === 'not_opened') base = rows.filter(r => r.status === 'sent' && !r.opened_at);
    else base = rows.filter(r => r.status === 'failed');

    if (!q) return base;
    return base.filter(r =>
      r.recipient_email.toLowerCase().includes(q) ||
      (r.recipient_name || '').toLowerCase().includes(q)
    );
  }, [rows, tab, search]);

  const exportCsv = () => {
    const header = ['Nombre', 'Email', 'Estado', 'Enviado', 'Abierto', 'Error'];
    const lines = filtered.map(r => [
      `"${(r.recipient_name || '').replace(/"/g, '""')}"`,
      r.recipient_email,
      r.opened_at ? 'abierto' : r.status,
      fmt(r.created_at),
      fmt(r.opened_at),
      `"${(r.error_message || '').replace(/"/g, '""')}"`,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aperturas-${(campaignName || 'campana').replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!campaignId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Aperturas — {campaignName || 'Campaña'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quién abrió este correo. Datos basados en pixel de seguimiento.
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b bg-muted/30">
          <Stat label="Enviados" value={stats.sent} />
          <Stat label="Abiertos" value={stats.opened} accent="text-emerald-600 dark:text-emerald-400" />
          <Stat label="Tasa apertura" value={`${stats.rate}%`} accent="text-primary" />
          <Stat label="Fallidos" value={stats.failed} accent={stats.failed > 0 ? 'text-destructive' : undefined} />
        </div>

        {/* Controls */}
        <div className="px-6 py-3 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-3 self-start">
            <TabsTrigger value="opened" className="gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Abiertos ({stats.opened})
            </TabsTrigger>
            <TabsTrigger value="not_opened" className="gap-1.5 text-xs">
              <MailX className="h-3.5 w-3.5" /> No abiertos ({stats.sent - stats.opened})
            </TabsTrigger>
            <TabsTrigger value="failed" className="gap-1.5 text-xs">
              <AlertCircle className="h-3.5 w-3.5" /> Fallidos ({stats.failed})
            </TabsTrigger>
          </TabsList>

          {(['opened', 'not_opened', 'failed'] as const).map(t => (
            <TabsContent key={t} value={t} className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[50vh] px-6 pb-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    {tab === 'opened' ? 'Aún no hay aperturas registradas.' :
                     tab === 'not_opened' ? 'Todos los enviados han sido abiertos 🎉' :
                     'Sin fallidos.'}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filtered.map(r => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.recipient_name || r.recipient_email}
                          </p>
                          {r.recipient_name && (
                            <p className="text-xs text-muted-foreground truncate">{r.recipient_email}</p>
                          )}
                          {r.error_message && (
                            <p className="text-xs text-destructive truncate mt-0.5">{r.error_message}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {r.opened_at ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                              Abrió {fmt(r.opened_at)}
                            </Badge>
                          ) : r.status === 'failed' ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                              Fallido
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Enviado {fmt(r.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="px-6 py-3 border-t bg-muted/20 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            El tracking depende de que el cliente cargue imágenes. Apple Mail Privacy Protection puede inflar aperturas
            y algunos Outlook empresariales pueden bloquearlas. Tómalo como tendencia, no como número exacto.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold ${accent || ''}`}>{value}</p>
  </div>
);
