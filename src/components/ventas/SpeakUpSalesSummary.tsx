import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Wallet, Clock, GraduationCap } from 'lucide-react';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { usePaymentCollections } from '@/hooks/use-payment-collections';

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

interface SpeakUpSalesSummaryProps {
  clientId: string;
  dateRange?: { start: Date; end: Date };
}

export const SpeakUpSalesSummary = ({ clientId, dateRange }: SpeakUpSalesSummaryProps) => {
  const { sales, summary } = useSalesTracking(clientId, dateRange ? { start: dateRange.start, end: dateRange.end } : undefined);

  const activeSales = sales.filter(s => s.status !== 'cancelled');
  const cashCRC = activeSales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
  const cashUSD = activeSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);

  const pendingCollections = collections.filter(c => c.status === 'pending');
  const pendingCRC = pendingCollections.filter(c => c.currency === 'CRC').reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingUSD = pendingCollections.filter(c => c.currency === 'USD').reduce((sum, c) => sum + Number(c.amount), 0);

  // Unique students = unique customer names this month
  const uniqueStudents = new Set(activeSales.map(s => s.customer_name).filter(Boolean)).size;

  const kpis = [
    {
      label: 'Ventas del mes',
      value: summary.totalCount.toString(),
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Ingresos',
      value: cashCRC > 0 || cashUSD > 0
        ? [cashCRC > 0 && formatCurrency(cashCRC, 'CRC'), cashUSD > 0 && formatCurrency(cashUSD, 'USD')].filter(Boolean).join(' · ')
        : '$0',
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Por cobrar',
      value: pendingCRC > 0 || pendingUSD > 0
        ? [pendingCRC > 0 && formatCurrency(pendingCRC, 'CRC'), pendingUSD > 0 && formatCurrency(pendingUSD, 'USD')].filter(Boolean).join(' · ')
        : '$0',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Nuevos estudiantes',
      value: uniqueStudents.toString(),
      icon: GraduationCap,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
