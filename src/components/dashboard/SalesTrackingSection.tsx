import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, ShoppingCart, ChevronLeft, ChevronRight, Link2, Pencil, AlertTriangle, Filter, Wallet, Megaphone, CreditCard, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesTracking, MessageSale } from '@/hooks/use-sales-tracking';
import { usePaymentCollections, CollectionFrequency } from '@/hooks/use-payment-collections';
import { RegisterSaleDialog, SalePrefill } from './RegisterSaleDialog';
import { LinkAdDialog } from './LinkAdDialog';
import { useBrand } from '@/contexts/BrandContext';
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
  onSaleFromSetter?: (appointmentId?: string, saleId?: string) => void;
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
  const { selectedClient } = useBrand();
  const isMindCoach = selectedClient?.name?.toLowerCase().includes('mind coach');
  const salesLabel = isMindCoach ? 'Pipeline' : 'Ventas';
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<MessageSale | null>(null);
  const [linkAdSaleId, setLinkAdSaleId] = useState<string | null>(null);
  const [currentPrefill, setCurrentPrefill] = useState<SalePrefill | null>(null);
  const [filterSetter, setFilterSetter] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterCloser, setFilterCloser] = useState<string>('all');

  // Open dialog when triggered from setter
  useEffect(() => {
    if (showSaleDialog && salePrefill) {
      setEditingSale(null);
      setCurrentPrefill(salePrefill);
      setDialogOpen(true);
    }
  }, [showSaleDialog, salePrefill]);

  const { sales: allSales, isLoading, addSale, deleteSale, updateSale, summary } = useSalesTracking(clientId, month);
  const { generateCollections } = usePaymentCollections(clientId);

  // Extract unique setters and products for filters
  const uniqueSetters = useMemo(() => {
    const names = new Set<string>();
    allSales.forEach(s => { if (s.customer_name) names.add(s.customer_name); });
    return Array.from(names).sort();
  }, [allSales]);

  const uniqueClosers = useMemo(() => {
    const names = new Set<string>();
    allSales.forEach(s => { if ((s as any).closer_name) names.add((s as any).closer_name); });
    return Array.from(names).sort();
  }, [allSales]);

  const uniqueProducts = useMemo(() => {
    const names = new Set<string>();
    allSales.forEach(s => { if (s.product) names.add(s.product); });
    return Array.from(names).sort();
  }, [allSales]);

  // Apply filters
  const sales = useMemo(() => {
    return allSales.filter(s => {
      if (filterSetter !== 'all' && s.customer_name !== filterSetter) return false;
      if (filterProduct !== 'all' && s.product !== filterProduct) return false;
      if (filterCloser !== 'all' && (s as any).closer_name !== filterCloser) return false;
      return true;
    });
  }, [allSales, filterSetter, filterProduct, filterCloser]);

  const handleAddSale = (sale: any, appointmentId?: string, collectionMeta?: { frequency: string; startInstallment: number; totalInstallments: number; installmentAmount: number; currency: string; customDates?: string[]; startDate?: string }) => {
    if (editingSale) {
      updateSale.mutate({ saleId: editingSale.id, updates: sale }, {
        onSuccess: async () => {
          toast.success('Venta actualizada');
          setDialogOpen(false);
          setEditingSale(null);
          setCurrentPrefill(null);

          // Generate collections if scheme was added/changed during edit
          if (collectionMeta) {
            try {
              // First remove any existing collections for this sale
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.from('payment_collections').delete().eq('sale_id', editingSale.id);

              await generateCollections.mutateAsync({
                saleId: editingSale.id,
                clientId,
                installmentAmount: collectionMeta.installmentAmount,
                currency: collectionMeta.currency,
                startDate: collectionMeta.startDate || sale.sale_date || new Date().toISOString().split('T')[0],
                frequency: collectionMeta.frequency as CollectionFrequency,
                startInstallment: collectionMeta.startInstallment,
                totalInstallments: collectionMeta.totalInstallments,
                customDates: collectionMeta.customDates,
              });
              toast.success(`${collectionMeta.totalInstallments - collectionMeta.startInstallment + 1} cobros generados`);
            } catch {
              toast.error('Error generando cobros pendientes');
            }
          }
        },
        onError: () => toast.error('Error al actualizar venta'),
      });
    } else {
      addSale.mutate(sale, {
        onSuccess: async (saleId) => {
          toast.success('Venta registrada');
          setDialogOpen(false);
          setCurrentPrefill(null);
          if (onSaleFromSetter) onSaleFromSetter(appointmentId, saleId);

          // Generate collection records for remaining installments
          if (collectionMeta && saleId) {
            try {
              await generateCollections.mutateAsync({
                saleId,
                clientId,
                installmentAmount: collectionMeta.installmentAmount,
                currency: collectionMeta.currency,
                startDate: collectionMeta.startDate || sale.sale_date || new Date().toISOString().split('T')[0],
                frequency: collectionMeta.frequency as CollectionFrequency,
                startInstallment: collectionMeta.startInstallment,
                totalInstallments: collectionMeta.totalInstallments,
                customDates: collectionMeta.customDates,
              });
              toast.success(`${collectionMeta.totalInstallments - collectionMeta.startInstallment + 1} cobros generados`);
            } catch {
              toast.error('Error generando cobros pendientes');
            }
          }
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
              {salesLabel}
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

        {/* Filters */}
        {(uniqueSetters.length > 0 || uniqueProducts.length > 0 || uniqueClosers.length > 0) && (
          <div className="px-6 pb-2 flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {uniqueClosers.length > 0 && (
              <Select value={filterCloser} onValueChange={setFilterCloser}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Closer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos los closers</SelectItem>
                  {uniqueClosers.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {uniqueSetters.length > 0 && (
              <Select value={filterSetter} onValueChange={setFilterSetter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos los clientes</SelectItem>
                  {uniqueSetters.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {uniqueProducts.length > 0 && (
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos los productos</SelectItem>
                  {uniqueProducts.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(filterSetter !== 'all' || filterProduct !== 'all' || filterCloser !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterSetter('all'); setFilterProduct('all'); setFilterCloser('all'); }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        <CardContent className="space-y-4">
          {/* Summary Cards */}
          {(() => {
            const cashCollectedCRC = sales.filter(s => s.status === 'completed' && s.currency === 'CRC').reduce((sum, s) => sum + Number(s.amount), 0);
            const cashCollectedUSD = sales.filter(s => s.status === 'completed' && s.currency === 'USD').reduce((sum, s) => sum + Number(s.amount), 0);
            const totalContractCRC = sales.filter(s => s.status === 'completed' && s.currency === 'CRC').reduce((sum, s) => sum + Number(s.total_sale_amount || s.amount), 0);
            const totalContractUSD = sales.filter(s => s.status === 'completed' && s.currency === 'USD').reduce((sum, s) => sum + Number(s.total_sale_amount || s.amount), 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Ventas */}
                <div className="rounded-xl border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Total {salesLabel}
                  </p>
                  <p className="text-2xl font-bold">{summary.totalCount}</p>
                </div>
                {/* Cash Collected */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> Cash Collected
                  </p>
                  <div className="flex items-baseline gap-3">
                    {cashCollectedCRC > 0 && <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cashCollectedCRC, 'CRC')}</span>}
                    {cashCollectedUSD > 0 && <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cashCollectedUSD, 'USD')}</span>}
                    {cashCollectedCRC === 0 && cashCollectedUSD === 0 && <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">$0</span>}
                  </div>
                  {(totalContractCRC > cashCollectedCRC || totalContractUSD > cashCollectedUSD) && (
                    <p className="text-[10px] text-muted-foreground">
                      {totalContractCRC > cashCollectedCRC && `₡${(totalContractCRC - cashCollectedCRC).toLocaleString()} pendiente`}
                      {totalContractCRC > cashCollectedCRC && totalContractUSD > cashCollectedUSD && ' · '}
                      {totalContractUSD > cashCollectedUSD && `$${(totalContractUSD - cashCollectedUSD).toLocaleString()} pendiente`}
                    </p>
                  )}
                </div>
                {/* ROAS */}
                <div className="rounded-xl border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> ROAS
                  </p>
                  <p className="text-2xl font-bold">{roas ? `${roas}x` : '—'}</p>
                </div>
              </div>
            );
          })()}

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

          {/* Sales Grid */}
          {sales.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {sales.map((sale) => {
                const isInstallment = sale.num_installments && sale.num_installments > 1;
                const allPaid = isInstallment && sale.installments_paid === sale.num_installments;
                const borderColor = isInstallment
                  ? allPaid
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-amber-500/40 bg-amber-500/5'
                  : 'border-emerald-500/40 bg-emerald-500/5';

                return (
                <div
                  key={sale.id}
                  className={cn(
                    'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border hover:shadow-sm transition-all group cursor-pointer',
                    borderColor,
                  )}
                  onClick={() => handleEdit(sale)}
                >
                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 z-10"
                        onClick={(e) => e.stopPropagation()}
                        title="Eliminar venta"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará la venta de {sale.customer_name || 'Sin nombre'} por {formatCurrency(Number(sale.amount), sale.currency)}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
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

                  <div className="flex items-center justify-between w-full pr-5">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {SOURCE_LABELS[sale.source] || sale.source}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(sale.sale_date), 'dd/MM')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold truncate w-full">
                    {sale.customer_name || 'Sin nombre'}
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(Number(sale.amount), sale.currency)}
                  </span>
                  {isInstallment && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[8px] px-1 py-0 gap-0.5',
                        allPaid ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      <CreditCard className="h-2.5 w-2.5" />
                      {sale.installments_paid || 1}/{sale.num_installments}
                    </Badge>
                  )}
                  {!isInstallment && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 gap-0.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Pago único
                    </Badge>
                  )}
                  {sale.ad_name && (
                    <span className="text-[9px] text-muted-foreground truncate w-full flex items-center gap-1">
                      <Megaphone className="h-2.5 w-2.5 shrink-0" />
                      {sale.ad_name}
                    </span>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay {isMindCoach ? 'registros' : 'ventas registradas'} este mes
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
