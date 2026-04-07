import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentCollections } from '@/hooks/use-payment-collections';
import { startOfMonth, subMonths, format, differenceInDays } from 'date-fns';

export interface MonthlyTrend {
  month: string; // 'YYYY-MM'
  label: string; // 'Ene', 'Feb', etc.
  revenue: number;
  students: number;
}

export interface OverdueCollection {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
}

export interface SpeakUpAnalyticsData {
  retentionRate: number | null;
  mrr: { CRC: number; USD: number };
  activeStudents: number;
  newStudents: number;
  monthlyTrend: MonthlyTrend[];
  overdueCollections: OverdueCollection[];
  overdueCount: number;
  isLoading: boolean;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const useSpeakUpAnalytics = (clientId: string | null): SpeakUpAnalyticsData => {
  const now = new Date();
  const sixMonthsAgo = format(subMonths(startOfMonth(now), 5), 'yyyy-MM-dd');
  const currentMonth = format(now, 'yyyy-MM');
  const previousMonth = format(subMonths(now, 1), 'yyyy-MM');

  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['speakup-analytics-sales', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('message_sales')
        .select('sale_date, amount, currency, customer_name, status')
        .eq('client_id', clientId)
        .gte('sale_date', sixMonthsAgo)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { collections, isLoading: collectionsLoading } = usePaymentCollections(clientId);

  // Group sales by month
  const salesByMonth = new Map<string, typeof salesData>();
  for (const sale of salesData) {
    const month = sale.sale_date.substring(0, 7); // 'YYYY-MM'
    const existing = salesByMonth.get(month) || [];
    existing.push(sale);
    salesByMonth.set(month, existing);
  }

  // Retention: students in both current and previous month
  const currentMonthNames = new Set(
    (salesByMonth.get(currentMonth) || [])
      .map(s => s.customer_name?.toLowerCase().trim())
      .filter(Boolean)
  );
  const prevMonthNames = new Set(
    (salesByMonth.get(previousMonth) || [])
      .map(s => s.customer_name?.toLowerCase().trim())
      .filter(Boolean)
  );

  let retentionRate: number | null = null;
  if (prevMonthNames.size > 0) {
    const retained = [...currentMonthNames].filter(n => prevMonthNames.has(n)).length;
    retentionRate = Math.round((retained / prevMonthNames.size) * 100);
  }

  // Active vs New
  const activeStudents = [...currentMonthNames].filter(n => prevMonthNames.has(n)).length;
  const newStudents = [...currentMonthNames].filter(n => !prevMonthNames.has(n)).length;

  // MRR: pending collections due this month
  const todayStr = format(now, 'yyyy-MM');
  const mrr = { CRC: 0, USD: 0 };
  for (const c of collections) {
    if (c.status === 'pending' && c.due_date.substring(0, 7) === todayStr) {
      if (c.currency === 'CRC') mrr.CRC += Number(c.amount);
      else mrr.USD += Number(c.amount);
    }
  }

  // Monthly trend (last 6 months)
  const monthlyTrend: MonthlyTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthKey = format(monthDate, 'yyyy-MM');
    const monthSales = salesByMonth.get(monthKey) || [];
    const revenue = monthSales.reduce((sum, s) => sum + Number(s.amount), 0);
    const students = new Set(monthSales.map(s => s.customer_name?.toLowerCase().trim()).filter(Boolean)).size;
    monthlyTrend.push({
      month: monthKey,
      label: MONTH_LABELS[monthDate.getMonth()],
      revenue,
      students,
    });
  }

  // Overdue collections
  const today = new Date();
  const todayDate = format(today, 'yyyy-MM-dd');
  const overdueCollections: OverdueCollection[] = collections
    .filter(c => c.status === 'pending' && c.due_date < todayDate)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      customerName: c.customer_name || 'Sin nombre',
      amount: Number(c.amount),
      currency: c.currency,
      dueDate: c.due_date,
      daysOverdue: differenceInDays(today, new Date(c.due_date)),
    }));

  const overdueCount = collections.filter(c => c.status === 'pending' && c.due_date < todayDate).length;

  return {
    retentionRate,
    mrr,
    activeStudents,
    newStudents,
    monthlyTrend,
    overdueCollections,
    overdueCount,
    isLoading: salesLoading || collectionsLoading,
  };
};
