import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp, Image as ImageIcon, DollarSign, ShoppingCart, Crown } from 'lucide-react';
import { MessageSale, useSalesTracking } from '@/hooks/use-sales-tracking';
import { useAllAds, AllAdItem, DatePresetKey } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';

interface AdSalesRankingProps {
  clientId: string;
  hasAdAccount: boolean;
  datePreset?: DatePresetKey;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

const PERIOD_OPTIONS = [
  { value: 'last_7d', label: 'Últimos 7 días' },
  { value: 'last_14d', label: 'Últimos 14 días' },
  { value: 'last_30d', label: 'Últimos 30 días' },
  { value: 'last_90d', label: 'Últimos 90 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
];

const getDateRangeForPreset = (preset: DatePresetKey): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  switch (preset) {
    case 'last_7d': start.setDate(now.getDate() - 7); break;
    case 'last_14d': start.setDate(now.getDate() - 14); break;
    case 'last_30d': start.setDate(now.getDate() - 30); break;
    case 'last_90d': start.setDate(now.getDate() - 90); break;
    case 'this_month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0);
      break;
    default: start.setDate(now.getDate() - 30);
  }
  return { start, end };
};

const MEDAL_COLORS = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-slate-400',
  'from-orange-400 to-orange-600',
];

interface AdRankItem {
  adId: string;
  adName: string;
  campaignName: string;
  thumbnailUrl: string | null;
  salesCount: number;
  totalAmountCRC: number;
  totalAmountUSD: number;
  adSpend: number;
  roas: number | null;
}

export const AdSalesRanking = ({ clientId, hasAdAccount, datePreset: externalPreset }: AdSalesRankingProps) => {
  const [internalPreset, setInternalPreset] = useState<DatePresetKey>('last_30d');
  const datePreset = externalPreset ?? internalPreset;
  const { data: allAdsResult, isLoading: adsLoading } = useAllAds(clientId, hasAdAccount, datePreset);
  const allAds = allAdsResult?.ads || [];
  const adCurrency = allAdsResult?.currency || 'USD';
  const dateRange = useMemo(() => getDateRangeForPreset(datePreset), [datePreset]);
  const { sales: allSales, isLoading: salesLoading } = useSalesTracking(clientId);

  const filteredSales = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    return allSales.filter(s => s.sale_date >= startStr && s.sale_date <= endStr);
  }, [allSales, dateRange]);

  const ranking = useMemo(() => {
    const adSalesMap = new Map<string, { sales: MessageSale[]; adName: string; campaignName: string }>();
    for (const sale of filteredSales) {
      if (sale.status !== 'completed' || !sale.ad_id) continue;
      const existing = adSalesMap.get(sale.ad_id);
      if (existing) { existing.sales.push(sale); }
      else { adSalesMap.set(sale.ad_id, { sales: [sale], adName: sale.ad_name || sale.ad_id, campaignName: sale.ad_campaign_name || '—' }); }
    }
    const items: AdRankItem[] = [];
    for (const [adId, { sales: adSales, adName, campaignName }] of adSalesMap) {
      const totalCRC = adSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
      const totalUSD = adSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
      const adData = allAds.find(a => a.id === adId);
      const adSpend = adData?.spend || 0;
      const thumbnailUrl = adData?.thumbnailUrl || null;
      const salesInAdCurrency = adCurrency === 'CRC' ? totalCRC : totalUSD;
      const roas = adSpend > 0 && salesInAdCurrency > 0 ? salesInAdCurrency / adSpend : null;
      items.push({ adId, adName, campaignName, thumbnailUrl, salesCount: adSales.length, totalAmountCRC: totalCRC, totalAmountUSD: totalUSD, adSpend, roas });
    }
    items.sort((a, b) => b.salesCount - a.salesCount || b.totalAmountUSD - a.totalAmountUSD);
    return items;
  }, [filteredSales, allAds, adCurrency]);

  const isLoading = adsLoading || salesLoading;
  if (!hasAdAccount) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking de Anuncios por Ventas
        </CardTitle>
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePresetKey)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay ventas vinculadas a anuncios en este período
          </div>
        ) : (
          <div className="space-y-3">
            {ranking.map((item, idx) => {
              const isTop3 = idx < 3;
              const roasColor = item.roas
                ? item.roas >= 3 ? 'text-green-500' : item.roas >= 1 ? 'text-yellow-500' : 'text-red-500'
                : 'text-muted-foreground';

              return (
                <div
                  key={item.adId}
                  className={`flex items-stretch gap-3 rounded-lg border overflow-hidden transition-all hover:shadow-md ${
                    idx === 0 ? 'ring-2 ring-yellow-400/50' : ''
                  }`}
                >
                  {/* Position badge + Thumbnail */}
                  <div className="relative flex-shrink-0 w-20 h-28 bg-muted">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.adName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Position */}
                    <div className={`absolute top-1 left-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                      isTop3
                        ? `bg-gradient-to-br ${MEDAL_COLORS[idx]} text-white`
                        : 'bg-background/80 backdrop-blur-sm border text-foreground'
                    }`}>
                      {idx === 0 ? <Crown className="h-3 w-3" /> : idx + 1}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 py-2 pr-3 flex flex-col justify-center min-w-0">
                    <p className="text-sm font-semibold truncate">{item.adName}</p>
                    <p className="text-xs text-muted-foreground truncate mb-2">{item.campaignName}</p>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{item.salesCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ventas: </span>
                        <span className="font-medium">
                          {item.totalAmountCRC > 0 ? formatCurrency(item.totalAmountCRC, 'CRC') : ''}
                          {item.totalAmountCRC > 0 && item.totalAmountUSD > 0 ? ' + ' : ''}
                          {item.totalAmountUSD > 0 ? formatCurrency(item.totalAmountUSD, 'USD') : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs mt-1">
                      <div>
                        <span className="text-muted-foreground">Gasto: </span>
                        <span className="font-medium">{item.adSpend > 0 ? formatCurrency(item.adSpend, adCurrency) : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ROAS: </span>
                        <span className={`font-bold ${roasColor}`}>
                          {item.roas ? `${item.roas.toFixed(1)}x` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};