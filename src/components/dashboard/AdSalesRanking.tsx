import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Image as ImageIcon } from 'lucide-react';
import { MessageSale } from '@/hooks/use-sales-tracking';
import { AdInsights } from '@/hooks/use-ads-data';

interface AdSalesRankingProps {
  sales: MessageSale[];
  allAds?: AdInsights[];
  currency?: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

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

export const AdSalesRanking = ({ sales, allAds = [], currency = 'USD' }: AdSalesRankingProps) => {
  const ranking = useMemo(() => {
    // Group completed sales by ad_id
    const adSalesMap = new Map<string, { sales: MessageSale[]; adName: string; campaignName: string }>();
    
    for (const sale of sales) {
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
      
      // Find ad spend from allAds
      const adData = allAds.find(a => a.id === adId);
      const adSpend = adData?.spend || 0;
      const thumbnailUrl = adData?.thumbnailUrl || null;
      
      // ROAS = total sales USD / ad spend (both in USD)
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

    // Sort by sales count desc, then by total USD desc
    items.sort((a, b) => b.salesCount - a.salesCount || b.totalAmountUSD - a.totalAmountUSD);
    return items;
  }, [sales, allAds]);

  if (ranking.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking de Anuncios por Ventas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Anuncio</TableHead>
                <TableHead className="text-center">Ventas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden md:table-cell">Gasto</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((item, idx) => (
                <TableRow key={item.adId}>
                  <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]">{item.adName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.campaignName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{item.salesCount}</TableCell>
                  <TableCell className="text-right text-sm">
                    {item.totalAmountUSD > 0 && <div>{formatCurrency(item.totalAmountUSD, 'USD')}</div>}
                    {item.totalAmountCRC > 0 && <div>{formatCurrency(item.totalAmountCRC, 'CRC')}</div>}
                  </TableCell>
                  <TableCell className="text-right text-sm hidden md:table-cell text-muted-foreground">
                    {item.adSpend > 0 ? `$${item.adSpend.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {item.roas ? `${item.roas.toFixed(2)}x` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
