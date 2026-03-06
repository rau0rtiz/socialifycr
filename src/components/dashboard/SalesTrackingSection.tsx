import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign, TrendingUp, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSalesTracking, MessageSale } from '@/hooks/use-sales-tracking';
import { RegisterSaleDialog } from './RegisterSaleDialog';
import { CampaignInsights } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesTrackingSectionProps {
  clientId: string;
  campaigns?: CampaignInsights[];
  adSpend?: number;
  adCurrency?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  story: 'Historia',
  ad: 'Publicidad',
  referral: 'Referencia',
  organic: 'Orgánico',
  other: 'Otro',
};


const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export const SalesTrackingSection = ({ clientId, campaigns = [], adSpend = 0, adCurrency = 'USD' }: SalesTrackingSectionProps) => {
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { sales, isLoading, addSale, deleteSale, summary } = useSalesTracking(clientId, month);

  const handleAddSale = (sale: any) => {
    addSale.mutate(sale, {
      onSuccess: () => {
        toast.success('Venta registrada');
        setDialogOpen(false);
      },
      onError: () => toast.error('Error al registrar venta'),
    });
  };

  const handleDelete = (id: string) => {
    deleteSale.mutate(id, {
      onSuccess: () => toast.success('Venta eliminada'),
      onError: () => toast.error('Error al eliminar'),
    });
  };

  // ROAS calculation: ad-attributed sales / ad spend
  const roas = adSpend > 0 && summary.adAttributedUSD > 0
    ? (summary.adAttributedUSD / adSpend).toFixed(2)
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ventas por Mensajes
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Month navigator */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center capitalize">
                {format(month, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Registrar Venta
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-xl font-bold">{summary.totalCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total ₡</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalCRC, 'CRC')}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total $</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalUSD, 'USD')}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ROAS</p>
              <p className="text-xl font-bold">{roas ? `${roas}x` : '—'}</p>
            </div>
          </div>

          {/* Source breakdown */}
          {Object.keys(summary.sourceBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.sourceBreakdown).map(([source, count]) => (
                <Badge key={source} variant="secondary">
                  {SOURCE_LABELS[source] || source}: {count}
                </Badge>
              ))}
            </div>
          )}

          {/* Sales Table */}
          {sales.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="hidden md:table-cell">Campaña</TableHead>
                    <TableHead className="hidden md:table-cell">Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm">{format(new Date(sale.sale_date), 'dd/MM')}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatCurrency(Number(sale.amount), sale.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABELS[sale.source] || sale.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {sale.ad_campaign_name || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {sale.customer_name || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {STATUS_LABELS[sale.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(sale.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay ventas registradas este mes
            </div>
          )}
        </CardContent>
      </Card>

      <RegisterSaleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddSale}
        campaigns={campaigns}
        isSubmitting={addSale.isPending}
      />
    </>
  );
};
