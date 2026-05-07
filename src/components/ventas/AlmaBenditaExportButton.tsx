import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  range: { start: Date; end: Date };
}

const escapeCsv = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename: string, rows: (string | number | null | undefined)[][]) => {
  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const AlmaBenditaExportButton = ({ clientId, range }: Props) => {
  const [loading, setLoading] = useState(false);

  const startStr = format(range.start, 'yyyy-MM-dd');
  const endStr = format(range.end, 'yyyy-MM-dd');
  const stamp = `${startStr}_${endStr}`;

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('message_sales')
      .select('sale_date, customer_name, amount, currency, status')
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .gte('sale_date', startStr)
      .lte('sale_date', endStr)
      .order('sale_date', { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from('archived_stories')
      .select('timestamp')
      .eq('client_id', clientId)
      .gte('timestamp', `${startStr}T00:00:00`)
      .lte('timestamp', `${endStr}T23:59:59`);
    if (error) throw error;
    return data || [];
  };

  const handleDaily = async () => {
    setLoading(true);
    try {
      const [sales, stories] = await Promise.all([fetchSales(), fetchStories()]);
      const map: Record<string, { stories: number; count: number; total: number }> = {};
      stories.forEach((s: any) => {
        const day = format(new Date(s.timestamp), 'yyyy-MM-dd');
        map[day] = map[day] || { stories: 0, count: 0, total: 0 };
        map[day].stories += 1;
      });
      sales.forEach((s: any) => {
        const day = s.sale_date;
        map[day] = map[day] || { stories: 0, count: 0, total: 0 };
        map[day].count += 1;
        map[day].total += Number(s.amount || 0);
      });
      const rows: (string | number)[][] = [['Fecha', 'Historias subidas', 'Cantidad de ventas', 'Monto total (CRC)']];
      Object.keys(map).sort().forEach(day => {
        rows.push([day, map[day].stories, map[day].count, map[day].total]);
      });
      downloadCsv(`alma-bendita-ventas-por-dia_${stamp}.csv`, rows);
      toast.success('CSV exportado');
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'no se pudo exportar'));
    } finally {
      setLoading(false);
    }
  };

  const handleDetail = async () => {
    setLoading(true);
    try {
      const sales = await fetchSales();
      const rows: (string | number | null)[][] = [['Fecha de venta', 'Nombre de cliente', 'Monto', 'Moneda']];
      sales.forEach((s: any) => {
        rows.push([s.sale_date, s.customer_name || '', Number(s.amount || 0), s.currency || 'CRC']);
      });
      downloadCsv(`alma-bendita-reporte-ventas_${stamp}.csv`, rows);
      toast.success('CSV exportado');
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'no se pudo exportar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm gap-1.5" disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Exportar CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Período: {startStr} → {endStr}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDaily} className="flex flex-col items-start gap-0.5">
          <span className="font-medium">Ventas por día</span>
          <span className="text-xs text-muted-foreground">Fecha, historias, ventas, monto</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDetail} className="flex flex-col items-start gap-0.5">
          <span className="font-medium">Reporte de ventas</span>
          <span className="text-xs text-muted-foreground">Fecha, cliente, monto</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
