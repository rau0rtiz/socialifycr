import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Trash2, MapPin } from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { OrderWizardDialog } from './OrderWizardDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  paid: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagada', shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
};

interface Props {
  clientId: string;
}

export const OrdersWidget = ({ clientId }: Props) => {
  const { orders, isLoading, deleteOrder } = useOrders(clientId);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Órdenes</CardTitle>
            <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Nueva orden
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-6">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
              No hay órdenes aún. Crea la primera con "Nueva orden".
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {orders.map(o => (
                <div key={o.id} className="border rounded-lg p-3 hover:bg-accent/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{o.customer_name || 'Sin nombre'}</span>
                        <Badge className={STATUS_COLORS[o.status] || ''} variant="outline">
                          {STATUS_LABELS[o.status] || o.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(o.order_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      {o.shipping_address && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {o.shipping_address.state}, {o.shipping_address.city}, {o.shipping_address.district}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(o.items?.length || 0)} item(s) · {o.payment_method || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{o.currency} {Number(o.total_amount).toLocaleString()}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 mt-1"
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

      <OrderWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} clientId={clientId} />
    </>
  );
};
