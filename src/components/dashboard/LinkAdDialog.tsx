import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useCampaigns, useAdSets, useAds, AdInsights } from '@/hooks/use-ads-data';

interface LinkAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  hasAdAccount: boolean;
  onSelectAd: (ad: { adId: string; adName: string; campaignId: string; campaignName: string; thumbnailUrl: string | null }) => void;
}

type Step = 'campaign' | 'adset' | 'ad';

export const LinkAdDialog = ({ open, onOpenChange, clientId, hasAdAccount, onSelectAd }: LinkAdDialogProps) => {
  const [step, setStep] = useState<Step>('campaign');
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string; objective: string } | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<{ id: string; name: string } | null>(null);

  const { data: campaignsResult, isLoading: loadingCampaigns } = useCampaigns(clientId, hasAdAccount, 'last_30d');
  const { data: adSets, isLoading: loadingAdSets } = useAdSets(clientId, selectedCampaign?.id || null, selectedCampaign?.objective || '', 'last_30d');
  const { data: ads, isLoading: loadingAds } = useAds(clientId, selectedAdSet?.id || null, selectedCampaign?.objective || '', 'last_30d');

  const campaigns = campaignsResult?.campaigns || [];

  const handleSelectCampaign = (c: typeof campaigns[0]) => {
    setSelectedCampaign({ id: c.id, name: c.name, objective: c.objective });
    setSelectedAdSet(null);
    setStep('adset');
  };

  const handleSelectAdSet = (as: { id: string; name: string }) => {
    setSelectedAdSet(as);
    setStep('ad');
  };

  const handleSelectAd = (ad: AdInsights) => {
    onSelectAd({
      adId: ad.id,
      adName: ad.name,
      campaignId: selectedCampaign!.id,
      campaignName: selectedCampaign!.name,
      thumbnailUrl: ad.thumbnailUrl,
    });
    handleClose();
  };

  const handleClose = () => {
    setStep('campaign');
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    onOpenChange(false);
  };

  const goBack = () => {
    if (step === 'ad') {
      setSelectedAdSet(null);
      setStep('adset');
    } else if (step === 'adset') {
      setSelectedCampaign(null);
      setStep('campaign');
    }
  };

  const title = step === 'campaign' ? 'Seleccionar Campaña' :
    step === 'adset' ? `Conjuntos: ${selectedCampaign?.name}` :
    `Anuncios: ${selectedAdSet?.name}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'campaign' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-sm md:text-base truncate">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {/* Campaigns */}
          {step === 'campaign' && (
            loadingCampaigns ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay campañas activas</p>
            ) : (
              campaigns.map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => handleSelectCampaign(c)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.resultType} · {c.effectiveStatus}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )
          )}

          {/* Ad Sets */}
          {step === 'adset' && (
            loadingAdSets ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (adSets || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay conjuntos de anuncios</p>
            ) : (
              (adSets || []).map(as => (
                <button
                  key={as.id}
                  className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => handleSelectAdSet(as)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{as.name}</p>
                    <p className="text-xs text-muted-foreground">{as.effectiveStatus}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )
          )}

          {/* Ads */}
          {step === 'ad' && (
            loadingAds ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (ads || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay anuncios</p>
            ) : (
              (ads || []).map(ad => (
                <button
                  key={ad.id}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => handleSelectAd(ad)}
                >
                  {ad.thumbnailUrl ? (
                    <img src={ad.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ad.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gasto: ${ad.spend.toFixed(2)} · {ad.results} {ad.resultType}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{ad.effectiveStatus}</Badge>
                </button>
              ))
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
