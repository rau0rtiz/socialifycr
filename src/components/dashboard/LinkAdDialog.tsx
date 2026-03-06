import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon } from 'lucide-react';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';

interface LinkAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  hasAdAccount: boolean;
  onSelectAd: (ad: { adId: string; adName: string; campaignId: string; campaignName: string; thumbnailUrl: string | null }) => void;
}

export const LinkAdDialog = ({ open, onOpenChange, clientId, hasAdAccount, onSelectAd }: LinkAdDialogProps) => {
  const { data: ads, isLoading } = useAllAds(clientId, hasAdAccount && open);

  const handleSelectAd = (ad: AllAdItem) => {
    onSelectAd({
      adId: ad.id,
      adName: ad.name,
      campaignId: ad.campaignId,
      campaignName: ad.campaignName,
      thumbnailUrl: ad.thumbnailUrl,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm md:text-base">Vincular Anuncio</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !ads || ads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay anuncios en campañas activas</p>
          ) : (
            ads.map(ad => (
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
                  <p className="text-xs text-muted-foreground truncate">
                    {ad.campaignName} · Gasto: ${ad.spend.toFixed(2)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{ad.effectiveStatus}</Badge>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
