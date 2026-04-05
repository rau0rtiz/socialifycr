import { useState, useMemo } from 'react';
import { AllAdItem } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Check, Search, X } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const campaigns = useMemo(() => {
    const map = new Map<string, string>();
    ads.forEach((ad) => {
      if (!map.has(ad.campaignId)) {
        map.set(ad.campaignId, ad.campaignName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [ads]);

  const filteredAds = useMemo(() => {
    let result = ads;
    if (selectedCampaignId) {
      result = result.filter((ad) => ad.campaignId === selectedCampaignId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (ad) =>
          ad.name.toLowerCase().includes(q) ||
          ad.campaignName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [ads, search, selectedCampaignId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg border border-border p-1.5 space-y-1.5">
              <Skeleton className="aspect-[4/3] w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
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
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar anuncio o campaña..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 pr-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Campaign filter */}
      {campaigns.length > 1 && (
        <Select
          value={selectedCampaignId ?? 'all'}
          onValueChange={(v) => setSelectedCampaignId(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todas las campañas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las campañas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* "Sin anuncio" option — full width */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'w-full rounded-lg border-2 px-3 py-2 text-left transition-all hover:border-primary/50 flex items-center gap-2',
          !selectedAd ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
        )}
      >
        {!selectedAd && <Check className="h-4 w-4 text-primary shrink-0" />}
        <span className="text-xs text-muted-foreground font-medium">Sin anuncio</span>
      </button>

      {/* Ad grid */}
      <div className="grid grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto pr-0.5">
        {filteredAds.map((ad) => {
          const isSelected = selectedAd?.id === ad.id;
          const spend = formatSpend(ad.spend, currency);

          return (
            <button
              key={ad.id}
              type="button"
              onClick={() => onSelect(ad)}
              className={cn(
                'rounded-lg border-2 p-1.5 text-left transition-all hover:border-primary/50 relative group',
                isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
              )}
            >
              {isSelected && (
                <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center z-10">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}

              {/* Thumbnail 4:3 */}
              <div className="aspect-[4/3] w-full rounded-md overflow-hidden mb-1 bg-muted">
                {ad.thumbnailUrl ? (
                  <img
                    src={ad.thumbnailUrl}
                    alt={ad.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <p className="text-[10px] font-medium truncate leading-tight">{ad.name}</p>
              <p className="text-[9px] text-muted-foreground truncate">{ad.campaignName}</p>

              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <Badge variant={statusVariant(ad.effectiveStatus)} className="text-[8px] px-1 py-0 h-3.5 leading-none">
                  {statusLabel(ad.effectiveStatus)}
                </Badge>
                {spend && (
                  <span className="text-[10px] text-primary font-semibold">{spend}</span>
                )}
              </div>
            </button>
          );
        })}

        {filteredAds.length === 0 && (
          <div className="col-span-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">No se encontraron anuncios</p>
          </div>
        )}
      </div>
    </div>
  );
};