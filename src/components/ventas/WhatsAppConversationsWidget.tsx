import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppCheck, useWhatsAppConversations } from '@/hooks/use-whatsapp-conversations';
import { MessageSquare, TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface WhatsAppConversationsWidgetProps {
  clientId: string;
}

type DateRange = 'last_7d' | 'last_30d' | 'last_90d';

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidad',
  AUTHENTICATION: 'Autenticación',
  SERVICE: 'Servicio',
};

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: 'hsl(var(--primary))',
  UTILITY: 'hsl(142, 71%, 45%)',
  AUTHENTICATION: 'hsl(45, 93%, 47%)',
  SERVICE: 'hsl(200, 98%, 39%)',
};

export const WhatsAppConversationsWidget = ({ clientId }: WhatsAppConversationsWidgetProps) => {
  const [dateRange, setDateRange] = useState<DateRange>('last_30d');
  const { data: checkResult, isLoading: checking } = useWhatsAppCheck(clientId);
  const hasAccess = checkResult?.hasAccess === true;

  const { data, isLoading, error } = useWhatsAppConversations(clientId, hasAccess, dateRange);

  // Parse conversation data into usable format
  const parsed = useMemo(() => {
    if (!data?.conversations?.data) return null;

    const dataPoints = data.conversations.data.flatMap((d: any) => d.data_points || []);
    
    // Aggregate by category
    const byCategory: Record<string, { count: number; cost: number }> = {};
    // Aggregate by day for the chart
    const byDay: Record<string, Record<string, number>> = {};
    let totalConversations = 0;
    let totalCost = 0;

    for (const dp of dataPoints) {
      const category = dp.conversation_category || 'OTHER';
      if (!byCategory[category]) byCategory[category] = { count: 0, cost: 0 };
      byCategory[category].count += dp.conversation || 0;
      byCategory[category].cost += dp.cost || 0;
      totalConversations += dp.conversation || 0;
      totalCost += dp.cost || 0;

      // Group by day
      const dayKey = new Date(dp.start * 1000).toISOString().split('T')[0];
      if (!byDay[dayKey]) byDay[dayKey] = {};
      byDay[dayKey][category] = (byDay[dayKey][category] || 0) + (dp.conversation || 0);
    }

    // Build chart data sorted by date
    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cats]) => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }),
        ...cats,
      }));

    const categories = Object.keys(byCategory).filter(k => byCategory[k].count > 0);

    return { byCategory, chartData, categories, totalConversations, totalCost };
  }, [data]);

  // Loading state
  if (checking) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">WhatsApp Conversations</CardTitle>
            <Badge variant="outline" className="text-[10px]">Beta</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <p>
              {checkResult?.reason === 'permission_missing'
                ? 'Se necesita reconectar Meta con el permiso whatsapp_business_management.'
                : checkResult?.reason === 'no_waba_linked'
                ? 'No se encontró una cuenta de WhatsApp Business vinculada.'
                : 'No se pudo verificar el acceso a WhatsApp Business.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">WhatsApp Conversations</CardTitle>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
              Beta
            </Badge>
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="last_7d">7 días</SelectItem>
              <SelectItem value="last_30d">30 días</SelectItem>
              <SelectItem value="last_90d">90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-6">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p>{(error as Error).message}</p>
          </div>
        ) : parsed ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard
                label="Total"
                value={parsed.totalConversations.toLocaleString()}
                icon={MessageSquare}
                iconColor="text-green-500"
              />
              {parsed.categories.slice(0, 3).map((cat) => (
                <SummaryCard
                  key={cat}
                  label={CATEGORY_LABELS[cat] || cat}
                  value={parsed.byCategory[cat].count.toLocaleString()}
                  icon={
                    cat === 'MARKETING' ? TrendingUp
                    : cat === 'SERVICE' ? Users
                    : DollarSign
                  }
                  iconColor={
                    cat === 'MARKETING' ? 'text-primary'
                    : cat === 'SERVICE' ? 'text-blue-500'
                    : 'text-amber-500'
                  }
                />
              ))}
            </div>

            {/* Chart */}
            {parsed.chartData.length > 0 && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parsed.chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    {parsed.categories.map((cat) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        name={CATEGORY_LABELS[cat] || cat}
                        fill={CATEGORY_COLORS[cat] || 'hsl(var(--muted-foreground))'}
                        radius={[4, 4, 0, 0]}
                        stackId="stack"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {parsed.totalConversations === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay conversaciones en este período.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No se pudieron cargar los datos.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
