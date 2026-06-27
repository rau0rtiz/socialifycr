import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';
import { filterByRange, cleanText } from '@/lib/comfortex-leads';

const RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

interface Props { clientId: string }

type Dim = 'campaign_name' | 'adset_name' | 'ad_name' | 'platform';

export const ComfortexUtmBreakdown = ({ clientId }: Props) => {
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('30');

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
      return <p className="text-sm text-muted-foreground py-6 text-center">Sin datos en este rango.</p>;
    }
    return (
      <div className="space-y-2">
        {rows.map((b) => (
          <div key={b.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate pr-2" title={b.name}>{b.name}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{b.count} · {b.pct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary" style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          Atribución de leads
          <Badge variant="secondary">{filtered.length}</Badge>
        </CardTitle>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="campaign_name">
          <TabsList>
            <TabsTrigger value="campaign_name">Campaña</TabsTrigger>
            <TabsTrigger value="adset_name">Adset</TabsTrigger>
            <TabsTrigger value="ad_name">Anuncio</TabsTrigger>
            <TabsTrigger value="platform">Plataforma</TabsTrigger>
          </TabsList>
          <TabsContent value="campaign_name" className="mt-4">{renderList('campaign_name')}</TabsContent>
          <TabsContent value="adset_name" className="mt-4">{renderList('adset_name')}</TabsContent>
          <TabsContent value="ad_name" className="mt-4">{renderList('ad_name')}</TabsContent>
          <TabsContent value="platform" className="mt-4">{renderList('platform')}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
