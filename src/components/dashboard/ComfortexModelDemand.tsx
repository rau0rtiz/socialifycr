import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shirt } from 'lucide-react';
import { useInstantFormLeads } from '@/hooks/use-instant-form-leads';
import {
  filterByRange,
  getModelFromLead,
  parseYesNo,
  titleCase,
  type ModelType,
} from '@/lib/comfortex-leads';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Mapea los valores normalizados (lowercase, sin puntuación) que vienen del sheet
// al nombre real de display tal como aparece en el Instant Form de Comfortex.
const MODEL_DISPLAY_MAP: { match: RegExp; label: string }[] = [
  { match: /polo/, label: 'Camisa Tipo Polo' },
  { match: /columbia|pescador/, label: 'Camisa Tipo Columbia/Pescador' },
  { match: /vestir|manga\s*corta/, label: 'Camisa de vestir manga corta' },
  { match: /cuello\s*redondo|redonda|redondo/, label: 'Camisa de Cuello Redondo' },
];

const toDisplayModel = (normalized: string): string => {
  const lower = normalized.toLowerCase();
  for (const m of MODEL_DISPLAY_MAP) if (m.match.test(lower)) return m.label;
  return titleCase(normalized);
};

const RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

interface Props { clientId: string }

export const ComfortexModelDemand = ({ clientId }: Props) => {
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('month');
  const [modelType, setModelType] = useState<ModelType | 'all'>('all');

  const filtered = useMemo(() => filterByRange(leads, rangeDays), [leads, rangeDays]);

  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((l) => {
      const m = getModelFromLead(l, modelType);
      if (!m) return;
      counts.set(m, (counts.get(m) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name: toDisplayModel(name), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered, modelType]);

  const bordadoStats = useMemo(() => {
    let yes = 0, no = 0, unknown = 0;
    filtered.forEach((l) => {
      const v = parseYesNo(l.custom_answers?.bordado);
      if (v === 'yes') yes++;
      else if (v === 'no') no++;
      else unknown++;
    });
    const known = yes + no;
    const pctYes = known ? Math.round((yes / known) * 100) : 0;
    return { yes, no, unknown, pctYes };
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shirt className="h-5 w-5" />
            Modelos más cotizados
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Bordado: {bordadoStats.pctYes}% sí ({bordadoStats.yes}/{bordadoStats.yes + bordadoStats.no})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={modelType} onValueChange={(v) => setModelType(v as any)}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="polo">Polo</SelectItem>
              <SelectItem value="cuello_redondo">Cuello redondo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin datos.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={160} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
