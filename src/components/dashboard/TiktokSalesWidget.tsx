import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isInRange } from '@/lib/comfortex-leads';
import { DollarSign, Users, Package, Trash2, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTiktokSales, useDeleteTiktokSale } from '@/hooks/use-tiktok-sales';
import { parseFormSaleNotes } from '@/hooks/use-instant-form-leads';
import { TikTokSaleDialog } from '@/components/seller-crm/TikTokSaleDialog';

interface Props { clientId: string }

const RANGES = [
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo' },
];

const formatMoney = (n: number) => '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);
const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short' });
  } catch { return '—'; }
};

export const TiktokSalesWidget = ({ clientId }: Props) => {
  const { data: sales = [], isLoading } = useTiktokSales(clientId);
  const deleteSale = useDeleteTiktokSale(clientId);
  const [rangeDays, setRangeDays] = useState('month');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(
    () => sales.filter((s) => isInRange(s.sale_date, rangeDays)),
    [sales, rangeDays],
  );

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + Number(x.amount || 0), 0);
    const camisas = filtered.reduce((s, x) => s + (parseFormSaleNotes(x.notes).quantity || 0), 0);
    return { total, camisas, count: filtered.length };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await deleteSale.mutateAsync(id);
      toast.success('Venta eliminada');
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music2 className="h-5 w-5" />
            Ventas TikTok
            <Badge variant="secondary">{stats.count}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setDialogOpen(true)}>+ Venta</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success))] font-medium">
                <DollarSign className="h-3.5 w-3.5" /> Total
              </div>
              <div className="text-lg font-bold mt-1 tabular-nums text-[hsl(var(--success))]">{formatMoney(stats.total)}</div>
            </div>
            <div className="rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--info))] font-medium">
                <Users className="h-3.5 w-3.5" /> Ventas
              </div>
              <div className="text-lg font-bold mt-1 text-[hsl(var(--info))]">{stats.count}</div>
            </div>
            <div className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--warning))] font-medium">
                <Package className="h-3.5 w-3.5" /> Camisas
              </div>
              <div className="text-lg font-bold mt-1 tabular-nums text-[hsl(var(--warning))]">{stats.camisas}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Ventas recientes</div>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay ventas registradas de TikTok en este rango.
              </div>
            ) : (
              <div className="rounded-md border divide-y max-h-[320px] overflow-y-auto">
                {filtered.slice(0, 50).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.customer_name || 'Cliente'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatDate(s.sale_date)}</span>
                        {s.product && <span className="truncate">· {s.product}</span>}
                      </div>
                    </div>
                    <div className="font-semibold text-sm tabular-nums">{formatMoney(Number(s.amount))}</div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TikTokSaleDialog open={dialogOpen} onOpenChange={setDialogOpen} clientId={clientId} />
    </>
  );
};
