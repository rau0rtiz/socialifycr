import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CalendarPlus } from 'lucide-react';
import { SetPaymentScheduleDialog } from './SetPaymentScheduleDialog';

interface Props { clientId: string; }

interface PendingSale {
  id: string;
  client_id: string;
  customer_name: string | null;
  product: string | null;
  total_sale_amount: number | null;
  amount: number;
  currency: string;
}

export const PendingSchedulesSection = ({ clientId }: Props) => {
  const [selected, setSelected] = useState<PendingSale | null>(null);

  const { data: pending = [] } = useQuery({
    queryKey: ['pending-schedules', clientId],
    queryFn: async (): Promise<PendingSale[]> => {
      const { data, error } = await supabase
        .from('message_sales')
        .select('id, client_id, customer_name, product, total_sale_amount, amount, currency')
        .eq('client_id', clientId)
        .eq('payment_schedule_pending' as any, true)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!clientId,
    staleTime: 1000 * 30,
  });

  if (pending.length === 0) return null;

  return (
    <>
      <Card className="p-3 border-amber-500/40 bg-amber-500/5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold">Necesitan fechas de pago ({pending.length})</h3>
        </div>
        <div className="space-y-2">
          {pending.map(p => {
            const symbol = p.currency === 'CRC' ? '₡' : '$';
            const balance = Math.max(Number(p.total_sale_amount || 0) - Number(p.amount || 0), 0);
            return (
              <div key={p.id} className="flex items-center justify-between bg-background rounded-md p-2 border border-amber-500/20">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{p.customer_name || 'Sin nombre'}{p.product ? ` — ${p.product}` : ''}</div>
                  <div className="text-[11px] text-muted-foreground">Saldo: <span className="font-semibold text-foreground">{symbol}{balance.toLocaleString()}</span></div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-8 ml-2" onClick={() => setSelected(p)}>
                  <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Establecer fechas
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <SetPaymentScheduleDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} sale={selected} />
    </>
  );
};
