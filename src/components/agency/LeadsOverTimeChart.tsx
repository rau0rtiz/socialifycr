import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Leads created per day over the last N days (Costa Rica time, UTC-6). */
const useLeadsSeries = (days: number) =>
  useQuery({
    queryKey: ['agency-leads-series', days],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [funnel, crm] = await Promise.all([
        supabase.from('funnel_leads').select('created_at').gte('created_at', since),
        supabase.from('agency_crm_leads').select('created_at').gte('created_at', since),
      ]);
      const buckets = new Map<string, { funnel: number; crm: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000);
        buckets.set(d.toISOString().slice(0, 10), { funnel: 0, crm: 0 });
      }
      const put = (iso: string | null, key: 'funnel' | 'crm') => {
        if (!iso) return;
        const day = new Date(new Date(iso).getTime() - 6 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const b = buckets.get(day);
        if (b) b[key] += 1;
      };
      (funnel.data || []).forEach((r: any) => put(r.created_at, 'funnel'));
      (crm.data || []).forEach((r: any) => put(r.created_at, 'crm'));
      return Array.from(buckets.entries()).map(([day, v]) => ({
        day,
        label: day.slice(5).replace('-', '/'),
        total: v.funnel + v.crm,
        funnel: v.funnel,
        crm: v.crm,
      }));
    },
  });

export const LeadsOverTimeChart = ({ days = 30 }: { days?: number }) => {
  const { data, isLoading } = useLeadsSeries(days);

  const total = useMemo(() => (data || []).reduce((s, d) => s + d.total, 0), [data]);

  return (
    <section className="agency-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
            Leads en el tiempo
          </p>
          <h2
            data-agency-display
            className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums"
          >
            {isLoading ? '—' : total.toLocaleString('es-CR')}
          </h2>
          <p className="text-xs text-muted-foreground">Últimos {days} días · CRM + funnels</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Tendencia</span>
        </div>
      </div>

      <div className="mt-5 h-56">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'hsl(var(--popover-foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(v: number) => [v, 'Leads']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#leadsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};
