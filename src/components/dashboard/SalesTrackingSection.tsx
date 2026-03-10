import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, ShoppingCart, ChevronLeft, ChevronRight, Link2, Pencil, AlertTriangle } from 'lucide-react';
import { useSalesTracking, MessageSale } from '@/hooks/use-sales-tracking';
import { RegisterSaleDialog, SalePrefill } from './RegisterSaleDialog';
import { LinkAdDialog } from './LinkAdDialog';
import { CampaignInsights } from '@/hooks/use-ads-data';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth as endOfMonthFn } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SalesTrackingSectionProps {
  clientId: string;
  campaigns?: CampaignInsights[];
  adSpend?: number;
  adCurrency?: string;
  hasAdAccount?: boolean;
  salePrefill?: SalePrefill | null;
  showSaleDialog?: boolean;
  onSaleFromSetter?: (appointmentId?: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  story: 'Historia',
  ad: 'Publicidad',
  referral: 'Referencia',
  organic: 'Orgánico',
  other: 'Otro',
};

const SOURCE_COLORS: Record<string, string> = {
  story: 'hsl(280, 70%, 50%)',
  ad: 'hsl(210, 80%, 50%)',
  referral: 'hsl(150, 60%, 45%)',
  organic: 'hsl(40, 90%, 50%)',
  other: 'hsl(0, 0%, 60%)',
};

const CHART_CONFIG = {
  story: { label: 'Historia', color: SOURCE_COLORS.story },
  ad: { label: 'Publicidad', color: SOURCE_COLORS.ad },
  referral: { label: 'Referencia', color: SOURCE_COLORS.referral },
  organic: { label: 'Orgánico', color: SOURCE_COLORS.organic },
  other: { label: 'Otro', color: SOURCE_COLORS.other },
};

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export const SalesTrackingSection = ({ clientId, campaigns = [], adSpend = 0, adCurrency = 'USD', hasAdAccount = false, salePrefill, showSaleDialog, onSaleFromSetter }: SalesTrackingSectionProps) => {
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<MessageSale | null>(null);
  const [linkAdSaleId, setLinkAdSaleId] = useState<string | null>(null);
  const [currentPrefill, setCurrentPrefill] = useState<SalePrefill | null>(null);
  const [filterSetter, setFilterSetter] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');

  // Open dialog when triggered from setter
  useEffect(() => {
    if (showSaleDialog && salePrefill) {
      setEditingSale(null);
      setCurrentPrefill(salePrefill);
      setDialogOpen(true);
    }
  }, [showSaleDialog, salePrefill]);

  const { sales, isLoading, addSale, deleteSale, updateSale, summary } = useSalesTracking(clientId, month);

  const handleAddSale = (sale: any, appointmentId?: string) => {
    if (editingSale) {
      updateSale.mutate({ saleId: editingSale.id, updates: sale }, {
        onSuccess: () => {
          toast.success('Venta actualizada');
          setDialogOpen(false);
          setEditingSale(null);
          setCurrentPrefill(null);
        },
        onError: () => toast.error('Error al actualizar venta'),
      });
    } else {
      addSale.mutate(sale, {
        onSuccess: () => {
          toast.success('Venta registrada');
          setDialogOpen(false);
          setCurrentPrefill(null);
          if (onSaleFromSetter) onSaleFromSetter(appointmentId);
        },
        onError: () => toast.error('Error al registrar venta'),
      });
    }
  };

  const handleEdit = (sale: MessageSale) => {
    setEditingSale(sale);
    setDialogOpen(true);
  };

  // Build daily chart data
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonthFn(month),
    });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySales = sales.filter(s => s.sale_date === dateStr && s.status === 'completed');
      return {
        date: format(day, 'dd'),
        story: daySales.filter(s => s.source === 'story').reduce((sum, s) => sum + Number(s.amount), 0),
        ad: daySales.filter(s => s.source === 'ad').reduce((sum, s) => sum + Number(s.amount), 0),
        referral: daySales.filter(s => s.source === 'referral').reduce((sum, s) => sum + Number(s.amount), 0),
        organic: daySales.filter(s => s.source === 'organic').reduce((sum, s) => sum + Number(s.amount), 0),
        other: daySales.filter(s => s.source === 'other').reduce((sum, s) => sum + Number(s.amount), 0),
      };
    });
  }, [sales, month]);

  const handleDelete = (id: string) => {
    deleteSale.mutate(id, {
      onSuccess: () => toast.success('Venta eliminada'),
      onError: () => toast.error('Error al eliminar'),
    });
  };

  const handleLinkAd = (adData: { adId: string; adName: string; campaignId: string; campaignName: string }) => {
    if (!linkAdSaleId) return;
    updateSale.mutate({
      saleId: linkAdSaleId,
      updates: {
        ad_id: adData.adId,
        ad_name: adData.adName,
        ad_campaign_id: adData.campaignId,
        ad_campaign_name: adData.campaignName,
        source: 'ad',
      },
    }, {
      onSuccess: () => {
        toast.success('Anuncio vinculado');
        setLinkAdSaleId(null);
      },
      onError: () => toast.error('Error al vincular anuncio'),
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
              Ventas
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
            <Button size="sm" onClick={() => { setEditingSale(null); setCurrentPrefill(null); setDialogOpen(true); }}>
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

          {/* Daily Sales Chart */}
          {sales.length > 0 && (
            <ChartContainer config={CHART_CONFIG} className="h-[250px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="story" stackId="a" fill={SOURCE_COLORS.story} radius={[0, 0, 0, 0]} />
                <Bar dataKey="ad" stackId="a" fill={SOURCE_COLORS.ad} />
                <Bar dataKey="referral" stackId="a" fill={SOURCE_COLORS.referral} />
                <Bar dataKey="organic" stackId="a" fill={SOURCE_COLORS.organic} />
                <Bar dataKey="other" stackId="a" fill={SOURCE_COLORS.other} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}

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
                    <TableHead className="hidden md:table-cell">Anuncio</TableHead>
                    <TableHead className="hidden md:table-cell">Cliente</TableHead>
                    <TableHead className="w-20"></TableHead>
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
                        {sale.ad_name || sale.ad_campaign_name || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {sale.customer_name || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar venta"
                            onClick={() => handleEdit(sale)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {hasAdAccount && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Vincular anuncio"
                              onClick={() => setLinkAdSaleId(sale.id)}
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                                  <AlertTriangle className="h-6 w-6 text-destructive" />
                                </div>
                                <AlertDialogTitle className="text-center">¿Eliminar esta venta?</AlertDialogTitle>
                                <AlertDialogDescription className="text-center">
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="sm:justify-center gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(sale.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
        onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingSale(null); setCurrentPrefill(null); } }}
        onSubmit={handleAddSale}
        clientId={clientId}
        hasAdAccount={hasAdAccount}
        isSubmitting={addSale.isPending || updateSale.isPending}
        editingSale={editingSale}
        prefill={currentPrefill}
      />

      <LinkAdDialog
        open={!!linkAdSaleId}
        onOpenChange={(open) => { if (!open) setLinkAdSaleId(null); }}
        clientId={clientId}
        hasAdAccount={hasAdAccount}
        onSelectAd={handleLinkAd}
      />
    </>
  );
};
