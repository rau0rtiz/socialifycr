import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';

interface RecentSalesTickerProps {
  clientId: string;
  dateRange?: { start: Date; end: Date };
}

export const RecentSalesTicker = ({ clientId, dateRange }: RecentSalesTickerProps) => {
  const startDate = dateRange ? dateRange.start.toISOString().split('T')[0] : undefined;
  const endDate = dateRange ? dateRange.end.toISOString().split('T')[0] : undefined;

  const { data: recentSales = [] } = useQuery({
    queryKey: ['recent-sales-ticker', clientId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('message_sales')
        .select('id, amount, currency, customer_name, product, created_by, created_at, sale_date')
        .eq('client_id', clientId)
        .neq('status', 'cancelled');

      if (startDate) query = query.gte('sale_date', startDate);
      if (endDate) query = query.lte('sale_date', endDate);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;

      // Get creator names
      const creatorIds = [...new Set((data || []).map(s => s.created_by))];
      let profiles: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        if (profileData) {
          profiles = Object.fromEntries(profileData.map(p => [p.id, p.full_name || 'Alguien']));
        }
      }

      return (data || []).map(s => ({
        ...s,
        creator_name: profiles[s.created_by] || 'Alguien',
      }));
    },
    enabled: !!clientId,
    refetchInterval: 30000,
  });

  if (recentSales.length === 0) return null;

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Últimas ventas</span>
        </div>
        <div className="space-y-1.5">
          {recentSales.map(sale => (
            <p key={sale.id} className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{sale.creator_name}</span>
              {' vendió '}
              {sale.product && <span className="font-medium text-foreground">{sale.product}</span>}
              {sale.customer_name && (
                <> a <span className="font-medium text-foreground">{sale.customer_name}</span></>
              )}
              {' por '}
              <span className="font-semibold text-primary">{formatCurrency(sale.amount, sale.currency)}</span>
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
