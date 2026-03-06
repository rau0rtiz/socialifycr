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

// Map date presets to approximate date ranges for filtering sales
const getDateRangeForPreset = (preset: DatePresetKey): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (preset) {
    case 'last_7d':
      start.setDate(now.getDate() - 7);
      break;
    case 'last_14d':
      start.setDate(now.getDate() - 14);
      break;
    case 'last_30d':
      start.setDate(now.getDate() - 30);
      break;
    case 'last_90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  return { start, end };
};

const MEDAL_COLORS = [
  'from-yellow-400 to-amber-500',   // Gold
  'from-slate-300 to-slate-400',     // Silver
  'from-orange-400 to-orange-600',   // Bronze
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

export const AdSalesRanking = ({ clientId, hasAdAccount }: AdSalesRankingProps) => {
  const [datePreset, setDatePreset] = useState<DatePresetKey>('last_30d');

  const { data: allAds, isLoading: adsLoading } = useAllAds(clientId, hasAdAccount, datePreset);

  // Get date range for filtering sales
  const dateRange = useMemo(() => getDateRangeForPreset(datePreset), [datePreset]);

  // Fetch all sales without month restriction - we filter by date range
  const { sales: allSales, isLoading: salesLoading } = useSalesTracking(clientId);

  // Filter sales by the selected date range
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
      if (existing) {
        existing.sales.push(sale);
      } else {
        adSalesMap.set(sale.ad_id, {
          sales: [sale],
          adName: sale.ad_name || sale.ad_id,
          campaignName: sale.ad_campaign_name || '—',
        });
      }
    }

    const items: AdRankItem[] = [];
    for (const [adId, { sales: adSales, adName, campaignName }] of adSalesMap) {
      const totalCRC = adSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
      const totalUSD = adSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

      // Get real spend from Meta API
      const adData = allAds?.find(a => a.id === adId);
      const adSpend = adData?.spend || 0;
      const thumbnailUrl = adData?.thumbnailUrl || null;

      // Manual ROAS: total sales (USD) / ad spend
      const roas = adSpend > 0 && totalUSD > 0 ? totalUSD / adSpend : null;

      items.push({
        adId,
        adName,
        campaignName,
        thumbnailUrl,
        salesCount: adSales.length,
        totalAmountCRC: totalCRC,
        totalAmountUSD: totalUSD,
        adSpend,
        roas,
      });
    }

    items.sort((a, b) => b.salesCount - a.salesCount || b.totalAmountUSD - a.totalAmountUSD);
    return items;
  }, [filteredSales, allAds]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay ventas vinculadas a anuncios en este período
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ranking.map((item, idx) => {
              const isTop3 = idx < 3;
              const roasColor = item.roas
                ? item.roas >= 3 ? 'text-green-500' : item.roas >= 1 ? 'text-yellow-500' : 'text-red-500'
                : 'text-muted-foreground';

              return (
                <div
                  key={item.adId}
                  className={`relative rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
                    idx === 0 ? 'ring-2 ring-yellow-400/50' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-muted">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.adName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Position badge */}
                    {isTop3 && (
                      <div className={`absolute top-2 left-2 h-8 w-8 rounded-full bg-gradient-to-br ${MEDAL_COLORS[idx]} flex items-center justify-center shadow-md`}>
                        {idx === 0 ? (
                          <Crown className="h-4 w-4 text-white" />
                        ) : (
                          <span className="text-xs font-bold text-white">{idx + 1}</span>
                        )}
                      </div>
                    )}

                    {!isTop3 && (
                      <div className="absolute top-2 left-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border">
                        <span className="text-xs font-semibold text-foreground">{idx + 1}</span>
                      </div>
                    )}

                    {/* Sales count badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-background/80 backdrop-blur-sm text-foreground border shadow-sm">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {item.salesCount} {item.salesCount === 1 ? 'venta' : 'ventas'}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold truncate">{item.adName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.campaignName}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Total ventas */}
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventas</p>
                        <p className="text-sm font-bold">
                          {item.totalAmountUSD > 0 ? formatCurrency(item.totalAmountUSD, 'USD') : formatCurrency(item.totalAmountCRC, 'CRC')}
                        </p>
                      </div>

                      {/* Gasto */}
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gasto</p>
                        <p className="text-sm font-bold text-muted-foreground">
                          {item.adSpend > 0 ? `$${item.adSpend.toFixed(2)}` : '—'}
                        </p>
                      </div>

                      {/* ROAS */}
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROAS</p>
                        <p className={`text-sm font-bold ${roasColor}`}>
                          {item.roas ? `${item.roas.toFixed(1)}x` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* ROAS bar */}
                    {item.roas && (
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.roas >= 3 ? 'bg-green-500' : item.roas >= 1 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(item.roas / 5 * 100, 100)}%` }}
                        />
                      </div>
                    )}
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
