import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react';
import { useInstantFormSales } from '@/hooks/use-instant-form-leads';
import { isInRange } from '@/lib/comfortex-leads';

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

const TOP_LIMIT = 8;

interface Props { clientId: string }

const fmtCrc = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`;

export const ComfortexSalesByAdWidget = ({ clientId }: Props) => {
  const { data: sales = [], isLoading } = useInstantFormSales(clientId);
  const [rangeDays, setRangeDays] = useState('30');
  const [expanded, setExpanded] = useState(false);

  const { rows, totalAmount, totalCount, orphanCount } = useMemo(() => {
    const filtered = sales.filter((s) => isInRange(s.sale_date || s.created_at, rangeDays));
    const map = new Map<string, { name: string; count: number; amount: number }>();
    let orphan = 0;
    filtered.forEach((s) => {
      const name = (s.ad_name || '').trim();
      if (!name) { orphan += 1; return; }
      const cur = map.get(name) || { name, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += Number(s.amount) || 0;
      map.set(name, cur);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    const total = filtered.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return { rows: arr, totalAmount: total, totalCount: filtered.length, orphanCount: orphan };
  }, [sales, rangeDays]);

  const visible = expanded ? rows : rows.slice(0, TOP_LIMIT);
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5" />
            Ventas por anuncio
            <Badge variant="secondary">{totalCount}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ventas cerradas desde leads de Instant Form, agrupadas por nombre de anuncio.
          </p>
        </div>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : totalCount === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sin ventas en este rango.
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs text-muted-foreground">Total facturado</span>
              <span className="text-xl font-semibold tabular-nums">{fmtCrc(totalAmount)}</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Ninguna venta tiene anuncio asignado.
              </p>
            ) : (
              <div className="space-y-2.5">
                {visible.map((r) => (
                  <div key={r.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate font-medium" title={r.name}>{r.name}</span>
                      <div className="shrink-0 tabular-nums">
                        <span className="font-semibold">{fmtCrc(r.amount)}</span>
                        <span className="text-muted-foreground ml-2">
                          {r.count} venta{r.count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/40 rounded overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))]/70 rounded transition-all"
                        style={{ width: `${(r.amount / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {rows.length > TOP_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-xs text-primary hover:underline pt-1"
                  >
                    {expanded ? 'Ver menos' : `Ver todos (${rows.length})`}
                  </button>
                )}
              </div>
            )}
            {orphanCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-3">
                {orphanCount} venta{orphanCount === 1 ? '' : 's'} sin anuncio (orgánico o sin UTM).
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
