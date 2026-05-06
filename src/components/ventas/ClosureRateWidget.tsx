import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SetterAppointment } from '@/hooks/use-setter-appointments';
import { PieChart as PieChartIcon, User } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Sale {
  id: string;
  closer_name?: string | null;
  status?: string;
}

interface ClosureRateWidgetProps {
  appointments: SetterAppointment[];
  sales?: Sale[];
}

export const ClosureRateWidget = ({ appointments, sales = [] }: ClosureRateWidgetProps) => {
  const closerClosureData = useMemo(() => {
    // Build a map from sale_id → closer_name
    const saleCloserMap = new Map<string, string>();
    sales.forEach(s => {
      if (s.closer_name) saleCloserMap.set(s.id, s.closer_name);
    });

    // Track which sale_ids are already counted via appointments
    const countedSaleIds = new Set<string>();

    const closerMap = new Map<string, { sold: number; notSold: number }>();

    // 1. Process appointments (leads with sold/not_sold status)
    appointments.forEach(a => {
      if (a.status !== 'sold' && (a.status as string) !== 'not_sold') return;

      let closer = 'Sin asignar';

      // Priority 1: explicit closer_name on the appointment (set when marking no-sale or sale)
      if ((a as any).closer_name) {
        closer = (a as any).closer_name;
      }

      // Priority 2: get closer from linked sale
      if (closer === 'Sin asignar' && a.sale_id) {
        const saleCloser = saleCloserMap.get(a.sale_id);
        if (saleCloser) closer = saleCloser;
      }
      if (a.sale_id && a.status === 'sold') countedSaleIds.add(a.sale_id);

      // Priority 3: extract closer from notes
      if (closer === 'Sin asignar' && a.notes) {
        const match = a.notes.match(/[Cc]loser[:\s]+([^\n,]+)/);
        if (match) closer = match[1].trim();
      }

      const entry = closerMap.get(closer) || { sold: 0, notSold: 0 };
      if (a.status === 'sold') entry.sold++;
      else entry.notSold++;
      closerMap.set(closer, entry);
    });

    // 2. Also count sales that are NOT linked to any appointment (standalone sales)
    sales.forEach(s => {
      if (countedSaleIds.has(s.id)) return;
      if (s.status !== 'completed') return;
      const closer = s.closer_name || 'Sin asignar';
      const entry = closerMap.get(closer) || { sold: 0, notSold: 0 };
      entry.sold++;
      closerMap.set(closer, entry);
    });

    return Array.from(closerMap.entries())
      .map(([name, data]) => ({
        name,
        rate: data.sold + data.notSold > 0 ? Math.round((data.sold / (data.sold + data.notSold)) * 100) : 0,
        sold: data.sold,
        total: data.sold + data.notSold,
      }))
      .sort((a, b) => b.sold - a.sold);
  }, [appointments, sales]);

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2.5 text-foreground">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <PieChartIcon className="h-4 w-4 text-amber-500" />
          </div>
          Tasa de Cierre por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {closerClosureData.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <PieChartIcon className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">Sin datos de cierre</p>
            <p className="text-xs mt-1 max-w-[200px] mx-auto">Marca leads como vendidos o no vendidos para ver las tasas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {closerClosureData.map((closer) => (
              <div key={closer.name} className="p-3 rounded-xl border border-border/50 bg-muted/20 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-16 h-16 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: 'Vendido', value: closer.sold },
                          { name: 'No vendido', value: closer.total - closer.sold },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={16}
                        outerRadius={28}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill="hsl(142, 70%, 45%)" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> {closer.name}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-2xl font-bold text-foreground">{closer.rate}%</p>
                    <p className="text-[11px] text-muted-foreground">{closer.sold}/{closer.total} cerrados</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
