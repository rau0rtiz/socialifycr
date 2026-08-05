import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Megaphone, X } from 'lucide-react';
import { useAgencyMetaCampaigns, useAgencyMetaStatus, useUpdateFunnelCampaign } from '@/hooks/use-agency-meta';

interface Props {
  funnel: {
    id: string;
    meta_campaign_id?: string | null;
    meta_campaign_name?: string | null;
  };
}

export const FunnelCampaignSelector = ({ funnel }: Props) => {
  const [open, setOpen] = useState(false);
  const { data: status } = useAgencyMetaStatus();
  const { data, isFetching } = useAgencyMetaCampaigns(open && !!status);
  const update = useUpdateFunnelCampaign();

  if (!status?.ad_account_id) return null;

  const linked = !!funnel.meta_campaign_id;

  return (
    <>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Badge
          variant={linked ? 'default' : 'outline'}
          className="text-xs cursor-pointer gap-1 rounded-full"
          onClick={() => setOpen(true)}
        >
          <Megaphone className="h-3 w-3" />
          {linked ? funnel.meta_campaign_name : 'Vincular campaña'}
        </Badge>
        {linked && (
          <button
            className="text-muted-foreground hover:text-destructive"
            title="Desvincular campaña"
            onClick={() =>
              update.mutate({ funnelId: funnel.id, adAccountId: null, campaignId: null, campaignName: null })
            }
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Campaña de Meta para este funnel</DialogTitle>
            <DialogDescription>
              Elegí la campaña que dirige tráfico a este funnel para comparar inversión vs. leads.
            </DialogDescription>
          </DialogHeader>
          {isFetching ? (
            <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando campañas…
            </div>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {(data?.campaigns || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    update.mutate(
                      {
                        funnelId: funnel.id,
                        adAccountId: data?.adAccountId || null,
                        campaignId: c.id,
                        campaignName: c.name,
                      },
                      { onSuccess: () => setOpen(false) },
                    )
                  }
                  className={`w-full text-left rounded-xl border p-3 transition-colors hover:bg-muted/50 ${
                    funnel.meta_campaign_id === c.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · ${(c.spend || 0).toLocaleString()} · {(c.leads || 0)} leads
                  </p>
                </button>
              ))}
              {(data?.campaigns || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No hay campañas disponibles.</p>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
