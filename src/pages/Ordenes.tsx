import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Package, MapPin, Search, Trash2, Building2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '@/contexts/BrandContext';
import { useOrders } from '@/hooks/use-orders';
import { OrderWizardDialog } from '@/components/ventas/orders/OrderWizardDialog';
import { SalesGoalBar } from '@/components/ventas/SalesGoalBar';
import { RecentSalesTicker } from '@/components/ventas/RecentSalesTicker';
import { StoryRevenueTracker } from '@/components/ventas/StoryRevenueTracker';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'all', label: 'Todas' },
  { value: 'paid', label: 'Pagada' },
  { value: 'shipped', label: 'Enviada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagada', shipped: 'Enviada', cancelled: 'Cancelada',
};

const Ordenes = () => {
  const navigate = useNavigate();
  const { selectedClient, clientsLoading } = useBrand();
  const clientId = selectedClient?.id || null;
  const isAlmaBendita = selectedClient?.name?.toLowerCase().includes('alma bendita');
  const { orders, isLoading, deleteOrder, updateOrderStatus } = useOrders(clientId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ordenes');

  // Range for "Resumen" widgets — current month
  const summaryRange = useMemo(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfDay(now) };
  }, []);

  // Sales totals (CRC) for goal bar — current month, non-cancelled
  const monthSalesCRC = useMemo(() => {
    return orders
      .filter(o => o.status !== 'cancelled' && new Date(o.order_date) >= summaryRange.start)
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
  }, [orders, summaryRange.start]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(o.customer_name || '').toLowerCase().includes(q) &&
            !(o.customer_phone || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const totalRevenue = useMemo(() =>
    filtered.filter(o => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0),
    [filtered]
  );

  if (clientsLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div></DashboardLayout>;
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Selecciona un cliente</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Órdenes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestión de pedidos y estados de envío
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Nueva orden
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="ordenes" className="text-xs sm:text-sm">
              <Package className="h-3.5 w-3.5 mr-1.5" />Órdenes
            </TabsTrigger>
            <TabsTrigger value="resumen" className="text-xs sm:text-sm">
              Resumen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ordenes" className="space-y-4 md:space-y-6 mt-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Órdenes ({STATUSES.find(s => s.value === statusFilter)?.label})</div>
                  <div className="text-2xl font-bold">{filtered.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Ingresos (sin canceladas)</div>
                  <div className="text-2xl font-bold">₡{totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Pagadas</div>
                  <div className="text-2xl font-bold text-blue-600">{counts.paid || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Enviadas</div>
                  <div className="text-2xl font-bold text-purple-600">{counts.shipped || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className="grid grid-cols-4 w-full h-auto">
                    {STATUSES.map(s => (
                      <TabsTrigger key={s.value} value={s.value} className="text-xs flex flex-col py-1.5">
                        <span>{s.label}</span>
                        <span className="text-[10px] text-muted-foreground">({counts[s.value] || 0})</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Orders list */}
            <Card>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-10">Cargando órdenes...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">No hay órdenes en este filtro.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(o => (
                      <div key={o.id} className="border rounded-lg p-3 hover:bg-accent/40 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{o.customer_name || 'Sin nombre'}</span>
                              {o.customer_phone && (
                                <span className="text-xs text-muted-foreground">{o.customer_phone}</span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                · {format(new Date(o.order_date), 'dd MMM yyyy', { locale: es })}
                              </span>
                            </div>
                            {o.shipping_address && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {o.shipping_address.state}, {o.shipping_address.city}, {o.shipping_address.district}
                                {o.shipping_address.address_line_1 && ` — ${o.shipping_address.address_line_1}`}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {(o.items?.length || 0)} item(s) · {o.payment_method || '—'}
                              {o.items && o.items.length > 0 && (
                                <span className="ml-1">
                                  · {o.items.slice(0, 3).map(i => i.product_name).filter(Boolean).join(', ')}
                                  {o.items.length > 3 && '…'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-bold">{o.currency} {Number(o.total_amount).toLocaleString()}</div>
                            </div>
                            <Select
                              value={o.status}
                              onValueChange={(v) => {
                                updateOrderStatus.mutate({ orderId: o.id, status: v });
                                toast.success(`Estado: ${STATUS_LABELS[v]}`);
                              }}
                            >
                              <SelectTrigger className={`h-8 w-32 text-xs ${STATUS_COLORS[o.status] || ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.filter(s => s.value !== 'all').map(s => (
                                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm('¿Eliminar esta orden y sus ventas asociadas?')) {
                                  deleteOrder.mutate(o.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumen" className="space-y-4 md:space-y-6 mt-4">
            <SalesGoalBar
              clientId={selectedClient.id}
              currentSalesUSD={0}
              currentSalesCRC={monthSalesCRC}
              primaryColor={selectedClient.primary_color || undefined}
              accentColor={selectedClient.accent_color || undefined}
            />
            {isAlmaBendita && (
              <StoryRevenueTracker clientId={selectedClient.id} dateRange={summaryRange} />
            )}
            <RecentSalesTicker clientId={selectedClient.id} dateRange={summaryRange} />
          </TabsContent>

        </Tabs>
      </div>

      <OrderWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} clientId={selectedClient.id} />
    </DashboardLayout>
  );
};

export default Ordenes;
