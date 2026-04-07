import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { useSpeakUpAnalytics } from '@/hooks/use-speakup-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

interface SpeakUpAnalyticsProps {
  clientId: string;
}

export const SpeakUpAnalytics = ({ clientId }: SpeakUpAnalyticsProps) => {
  const {
    retentionRate,
    mrr,
    activeStudents,
    newStudents,
    monthlyTrend,
    overdueCollections,
    overdueCount,
    isLoading,
  } = useSpeakUpAnalytics(clientId);

  if (isLoading) return null;

  const hasMRR = mrr.CRC > 0 || mrr.USD > 0;
  const mrrDisplay = hasMRR
    ? [mrr.CRC > 0 && formatCurrency(mrr.CRC, 'CRC'), mrr.USD > 0 && formatCurrency(mrr.USD, 'USD')].filter(Boolean).join(' · ')
    : '$0';

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Retention Rate */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold">
                {retentionRate !== null ? `${retentionRate}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Tasa de retención</p>
            </div>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{mrrDisplay}</p>
              <p className="text-xs text-muted-foreground">MRR (cobros del mes)</p>
            </div>
          </CardContent>
        </Card>

        {/* Active vs New */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{activeStudents} activos</Badge>
                <Badge variant="outline" className="text-xs">{newStudents} nuevos</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estudiantes del mes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart + Overdue Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendencia mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Ingresos') return [`₡${value.toLocaleString()}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="revenue" name="Ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="students" name="Estudiantes" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cobros vencidos</CardTitle>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">{overdueCount}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overdueCount === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin cobros vencidos 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {overdueCollections.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.customerName}</p>
                      <p className="text-xs text-destructive">
                        {c.daysOverdue} día{c.daysOverdue !== 1 ? 's' : ''} de atraso
                      </p>
                    </div>
                    <p className="font-semibold text-sm whitespace-nowrap">
                      {formatCurrency(c.amount, c.currency)}
                    </p>
                  </div>
                ))}
                {overdueCount > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{overdueCount - 5} más
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
