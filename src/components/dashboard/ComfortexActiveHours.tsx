import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useInstantFormLeads, type InstantFormLead } from '@/hooks/use-instant-form-leads';
import { filterByRange } from '@/lib/comfortex-leads';

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'Todo' },
];

// L, M, X, J, V, S, D — orden lunes→domingo
const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// JS getDay(): 0=Dom..6=Sab → mapear a 0=Lun..6=Dom
const toMondayIndex = (jsDay: number) => (jsDay + 6) % 7;

// Costa Rica = UTC-6 (sin DST)
const CR_OFFSET_MS = -6 * 60 * 60 * 1000;
const toCR = (iso: string) => new Date(new Date(iso).getTime() + CR_OFFSET_MS);

interface Props { clientId: string }

export const ComfortexActiveHours = ({ clientId }: Props) => {
  const { data: leads = [] } = useInstantFormLeads(clientId);
  const [rangeDays, setRangeDays] = useState('month');

  const filtered = useMemo(() => filterByRange(leads, rangeDays), [leads, rangeDays]);

  const { grid, byDay, byHour, maxCell, maxDay, maxHour } = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const byDay = Array(7).fill(0);
    const byHour = Array(24).fill(0);
    filtered.forEach((l: InstantFormLead) => {
      const ts = l.created_time || l.created_at;
      if (!ts) return;
      const d = toCR(ts);
      const day = toMondayIndex(d.getUTCDay());
      const hour = d.getUTCHours();
      grid[day][hour] += 1;
      byDay[day] += 1;
      byHour[hour] += 1;
    });
    let maxCell = 0;
    for (const row of grid) for (const v of row) if (v > maxCell) maxCell = v;
    return {
      grid,
      byDay,
      byHour,
      maxCell,
      maxDay: Math.max(1, ...byDay),
      maxHour: Math.max(1, ...byHour),
    };
  }, [filtered]);

  const empty = filtered.length === 0;

  const intensity = (count: number) => {
    if (!maxCell || count === 0) return 0;
    return Math.max(0.1, count / maxCell);
  };

  const renderHeatmap = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* rows */}
          {grid.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1 mb-1 last:mb-0">
              <span className="text-[10px] text-muted-foreground w-4 shrink-0 tabular-nums">
                {DAY_INITIALS[dayIdx]}
              </span>
              <div className="grid grid-cols-24 gap-[2px] flex-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                {row.map((count, hourIdx) => (
                  <div
                    key={hourIdx}
                    title={`${DAY_LABELS[dayIdx]} ${String(hourIdx).padStart(2, '0')}:00 · ${count} lead${count === 1 ? '' : 's'}`}
                    className="aspect-square rounded-sm bg-muted relative"
                  >
                    {count > 0 && (
                      <div
                        className="absolute inset-0 rounded-sm bg-primary"
                        style={{ opacity: intensity(count) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* x-axis */}
          <div className="flex items-center gap-1 mt-1">
            <span className="w-4 shrink-0" />
            <div className="flex-1 flex justify-between text-[10px] text-muted-foreground px-[1px]">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>
        </div>
      </div>
      {/* legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>menos</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((o) => (
          <div key={o} className="w-3 h-3 rounded-sm bg-primary" style={{ opacity: o }} />
        ))}
        <span>más</span>
      </div>
    </div>
  );

  const renderBars = (values: number[], labels: string[], max: number) => (
    <div className="space-y-1.5">
      {values.map((count, i) => {
        const pct = max ? Math.round((count / max) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{labels[i]}</span>
              <span className="tabular-nums">{count}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Horarios más activos
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
        {empty ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Sin datos en este rango.</p>
        ) : (
          <Tabs defaultValue="day_hour">
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs h-6">Día</TabsTrigger>
              <TabsTrigger value="day_hour" className="text-xs h-6">Día y hora</TabsTrigger>
              <TabsTrigger value="hour" className="text-xs h-6">Hora</TabsTrigger>
            </TabsList>
            <TabsContent value="day" className="mt-3">
              {renderBars(byDay, DAY_LABELS, maxDay)}
            </TabsContent>
            <TabsContent value="day_hour" className="mt-3">
              {renderHeatmap()}
            </TabsContent>
            <TabsContent value="hour" className="mt-3">
              {renderBars(
                byHour,
                HOURS.map((h) => `${String(h).padStart(2, '0')}:00`),
                maxHour,
              )}
            </TabsContent>
          </Tabs>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-right">Hora Costa Rica (UTC-6)</p>
      </CardContent>
    </Card>
  );
};
