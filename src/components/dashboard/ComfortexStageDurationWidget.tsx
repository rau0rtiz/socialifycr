import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isInRange } from '@/lib/comfortex-leads';

interface Props {
  clientId: string;
}

interface HistoryRow {
  id: string;
  lead_id: string;
  client_id: string;
  from_status: string | null;
  to_status: string | null;
  changed_at: string;
}

const RANGES = [
  { value: 'all', label: 'Todo' },
  { value: 'today', label: 'Hoy' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

// Only track meaningful pipeline transitions
const TRACKED_TRANSITIONS: { from: string; to: string; label: string }[] = [
  { from: 'new', to: 'contactado', label: 'Nuevo → Contactado' },
  { from: 'contactado', to: 'seguimiento', label: 'Contactado → Seguimiento' },
  { from: 'seguimiento', to: 'venta', label: 'Seguimiento → Venta' },
  { from: 'contactado', to: 'venta', label: 'Contactado → Venta' },
  { from: 'seguimiento', to: 'perdido', label: 'Seguimiento → Perdido' },
  { from: 'contactado', to: 'perdido', label: 'Contactado → Perdido' },
];

const STATUS_LABEL: Record<string, string> = {
  new: 'Nuevo',
  contactado: 'Contactado',
  seguimiento: 'Seguimiento',
  venta: 'Venta',
  perdido: 'Perdido',
};

const formatDuration = (hours: number): string => {
  if (!isFinite(hours) || hours < 0) return '—';
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return `${m} min`;
  }
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
};

const useLeadStatusHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['instant-form-lead-status-history', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instant_form_lead_status_history' as any)
        .select('id, lead_id, client_id, from_status, to_status, changed_at')
        .eq('client_id', clientId)
        .order('changed_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as HistoryRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const ComfortexStageDurationWidget = ({ clientId }: Props) => {
  const { data: history = [], isLoading } = useLeadStatusHistory(clientId);
  const [rangeDays, setRangeDays] = useState('all');

  const transitions = useMemo(() => {
    // Group by lead, chronologically ordered
    const byLead = new Map<string, HistoryRow[]>();
    history.forEach((h) => {
      if (!byLead.has(h.lead_id)) byLead.set(h.lead_id, []);
      byLead.get(h.lead_id)!.push(h);
    });

    // Compute deltas between consecutive events per lead
    const perTransition = new Map<string, number[]>();
    byLead.forEach((rows) => {
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const curr = rows[i];
        if (!curr.from_status || !curr.to_status) continue;
        if (!isInRange(curr.changed_at, rangeDays)) continue;
        const start = new Date(prev.changed_at).getTime();
        const end = new Date(curr.changed_at).getTime();
        if (!isFinite(start) || !isFinite(end) || end < start) continue;
        const key = `${curr.from_status}→${curr.to_status}`;
        const hrs = (end - start) / (1000 * 60 * 60);
        if (!perTransition.has(key)) perTransition.set(key, []);
        perTransition.get(key)!.push(hrs);
      }
    });

    const rows = TRACKED_TRANSITIONS.map((t) => {
      const arr = (perTransition.get(`${t.from}→${t.to}`) || []).sort((a, b) => a - b);
      const n = arr.length;
      if (n === 0) return { ...t, n: 0, avg: 0, median: 0 };
      const avg = arr.reduce((a, b) => a + b, 0) / n;
      const median = n % 2 === 1 ? arr[(n - 1) / 2] : (arr[n / 2 - 1] + arr[n / 2]) / 2;
      return { ...t, n, avg, median };
    });

    const maxAvg = Math.max(...rows.map((r) => r.avg), 1);
    return { rows, maxAvg };
  }, [history, rangeDays]);

  const anyData = transitions.rows.some((r) => r.n > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Duración por etapa
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Tiempo promedio entre cambios de estado</p>
        </div>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : !anyData ? (
          <div className="py-8 text-center text-sm text-muted-foreground space-y-1">
            <p>Empezamos a medir desde hoy.</p>
            <p className="text-xs">Volvé en unos días — cada cambio de estado se registra automáticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transitions.rows.map((r) => (
              <div key={r.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{STATUS_LABEL[r.from] || r.from}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>{STATUS_LABEL[r.to] || r.to}</span>
                    <span className="text-muted-foreground font-normal ml-1">({r.n})</span>
                  </div>
                  <div className="tabular-nums">
                    <span className="font-semibold">{r.n > 0 ? formatDuration(r.avg) : '—'}</span>
                    {r.n > 0 && (
                      <span className="text-muted-foreground ml-2">med. {formatDuration(r.median)}</span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted/40 rounded overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--primary))]/70 rounded transition-all"
                    style={{ width: r.n > 0 ? `${(r.avg / transitions.maxAvg) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
