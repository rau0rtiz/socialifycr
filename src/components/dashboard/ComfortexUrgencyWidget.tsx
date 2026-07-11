import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';
import {
  getUrgencyFromLead,
  URGENCY_LABELS,
  URGENCY_ORDER,
  URGENCY_STYLE,
  type UrgencyBucket,
} from '@/lib/comfortex-urgency';
import { isInRange } from '@/lib/comfortex-leads';

interface Props {
  clientId: string;
}

const RANGES = [
  { key: '7', label: '7d' },
  { key: '30', label: '30d' },
  { key: 'month', label: 'Mes' },
  { key: 'all', label: 'Todo' },
];

export const ComfortexUrgencyWidget = ({ clientId }: Props) => {
  const { data: leads = [], isLoading } = useInstantFormLeads(clientId);
  const [range, setRange] = useState('30');

  const { counts, total } = useMemo(() => {
    // Only include leads whose form actually captures urgency data.
    const formsWithUrgency = new Set<string>();
    for (const l of leads) {
      if (l.form_id && getUrgencyFromLead(l.custom_answers)) {
        formsWithUrgency.add(l.form_id);
      }
    }
    const c: Record<UrgencyBucket, number> = { '24h': 0, '1-3d': 0, '4-7d': 0, cotizar: 0 };
    let t = 0;
    for (const l of leads) {
      if (!l.form_id || !formsWithUrgency.has(l.form_id)) continue;
      if (!isInRange(l.created_time || l.created_at, range)) continue;
      const b = getUrgencyFromLead(l.custom_answers);
      if (!b) continue;
      c[b]++;
      t++;
    }
    return { counts: c, total: t };
  }, [leads, range]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Leads por Urgencia
          </CardTitle>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={range === r.key ? 'default' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Sin leads en este rango.</p>
        ) : (
          <>
            {URGENCY_ORDER.map((b) => {
              const count = counts[b];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={b} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${URGENCY_STYLE[b]}`}>
                      {URGENCY_LABELS[b]}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        b === '24h'
                          ? 'bg-red-500'
                          : b === '1-3d'
                          ? 'bg-orange-500'
                          : b === '4-7d'
                          ? 'bg-muted-foreground/40'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {unknown > 0 && (
              <p className="text-[11px] text-muted-foreground pt-1">
                {unknown} lead{unknown === 1 ? '' : 's'} sin dato de urgencia
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
