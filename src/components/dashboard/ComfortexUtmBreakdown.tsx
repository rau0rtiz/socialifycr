import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';
import { filterByRange, cleanText } from '@/lib/comfortex-leads';

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

interface Props { clientId: string }

type Dim = 'campaign_name' | 'adset_name' | 'ad_name' | 'platform';

const TOP_LIMIT = 5;

export const ComfortexUtmBreakdown = ({ clientId }: Props) => {
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('month');
  const [expanded, setExpanded] = useState<Record<Dim, boolean>>({
    campaign_name: false, adset_name: false, ad_name: false, platform: false,
  });

  const filtered = useMemo(() => filterByRange(leads, rangeDays), [leads, rangeDays]);

  const buildBreakdown = (dim: Dim) => {
    const map = new Map<string, number>();
    filtered.forEach((l) => {
      let key = cleanText((l as any)[dim]);
      if (!key) key = dim === 'platform' ? 'Orgánico / sin plataforma' : '(sin asignar)';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = filtered.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  };

  const renderList = (dim: Dim) => {
    const rows = buildBreakdown(dim);
    if (rows.length === 0) {
      return <p className="text-xs text-muted-foreground py-4 text-center">Sin datos en este rango.</p>;
    }
    const isExpanded = expanded[dim];
    const visible = isExpanded ? rows : rows.slice(0, TOP_LIMIT);
    return (
      <div className="space-y-1.5">
        {visible.map((b) => (
          <div key={b.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate pr-2" title={b.name}>{b.name}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{b.count} · {b.pct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-primary" style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
        {rows.length > TOP_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((p) => ({ ...p, [dim]: !isExpanded }))}
            className="text-xs text-primary hover:underline pt-1"
          >
            {isExpanded ? 'Ver menos' : `Ver todos (${rows.length})`}
          </button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Atribución de leads
          <Badge variant="secondary">{filtered.length}</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <Tabs defaultValue="campaign_name">
          <TabsList className="h-8">
            <TabsTrigger value="campaign_name" className="text-xs h-6">Campaña</TabsTrigger>
            <TabsTrigger value="adset_name" className="text-xs h-6">Adset</TabsTrigger>
            <TabsTrigger value="ad_name" className="text-xs h-6">Anuncio</TabsTrigger>
            <TabsTrigger value="platform" className="text-xs h-6">Plataforma</TabsTrigger>
          </TabsList>
          <TabsContent value="campaign_name" className="mt-3">{renderList('campaign_name')}</TabsContent>
          <TabsContent value="adset_name" className="mt-3">{renderList('adset_name')}</TabsContent>
          <TabsContent value="ad_name" className="mt-3">{renderList('ad_name')}</TabsContent>
          <TabsContent value="platform" className="mt-3">{renderList('platform')}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
