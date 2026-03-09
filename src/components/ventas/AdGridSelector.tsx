import { AllAdItem } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Check } from 'lucide-react';

interface AdGridSelectorProps {
  ads: AllAdItem[];
  isLoading: boolean;
  selectedAd: AllAdItem | null;
  onSelect: (ad: AllAdItem | null) => void;
  currency?: string;
}

const formatSpend = (amount: number, currency: string) => {
  if (amount === 0) return null;
  return `${currency === 'USD' ? '$' : '₡'}${amount.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'Activo',
    PAUSED: 'Pausado',
    DELETED: 'Eliminado',
    ARCHIVED: 'Archivado',
  };
  return map[status] || status;
};

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'ACTIVE') return 'default';
  if (status === 'PAUSED') return 'secondary';
  return 'outline';
};

export const AdGridSelector = ({
  ads,
  isLoading,
  selectedAd,
  onSelect,
  currency = 'USD',
}: AdGridSelectorProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border p-2 space-y-2">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No hay anuncios disponibles</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Conecta una cuenta publicitaria para vincular anuncios</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
      {/* "None" option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-lg border-2 p-3 text-left transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-2 min-h-[120px]',
          !selectedAd ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
        )}
      >
        {!selectedAd && <Check className="h-5 w-5 text-primary" />}
        <span className="text-xs text-muted-foreground font-medium">Sin anuncio</span>
      </button>

      {ads.map((ad) => {
        const isSelected = selectedAd?.id === ad.id;
        const spend = formatSpend(ad.spend, currency);

        return (
          <button
            key={ad.id}
            type="button"
            onClick={() => onSelect(ad)}
            className={cn(
              'rounded-lg border-2 p-2 text-left transition-all hover:border-primary/50 relative group',
              isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
            )}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center z-10">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Thumbnail */}
            <div className="aspect-square w-full rounded-md overflow-hidden mb-2 bg-muted">
              {ad.thumbnailUrl ? (
                <img
                  src={ad.thumbnailUrl}
                  alt={ad.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <p className="text-xs font-medium truncate leading-tight">{ad.name}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ad.campaignName}</p>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant={statusVariant(ad.effectiveStatus)} className="text-[9px] px-1.5 py-0 h-4">
                {statusLabel(ad.effectiveStatus)}
              </Badge>
              {spend && (
                <span className="text-[10px] text-muted-foreground font-medium">{spend}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
