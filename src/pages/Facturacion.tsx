import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useUserRole } from '@/hooks/use-user-role';
import { useBrand } from '@/contexts/BrandContext';
import {
  useSubscriptionPlans,
  useAllSubscriptions,
  usePaymentTransactions,
  useClientSubscription,
  useMutatePlan,
  SubscriptionPlan,
} from '@/hooks/use-billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Package, Plus, Building2, Pencil, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { PlanFormDialog } from '@/components/billing/PlanFormDialog';
import { AssignPlanDialog } from '@/components/billing/AssignPlanDialog';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  past_due: 'bg-yellow-500/10 text-yellow-500',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive',
  trialing: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-green-500/10 text-green-500',
  pending: 'bg-yellow-500/10 text-yellow-500',
  processing: 'bg-blue-500/10 text-blue-500',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Activa',
  past_due: 'Vencida',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  trialing: 'Prueba',
  completed: 'Completado',
  pending: 'Pendiente',
  processing: 'Procesando',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

const providerLabels: Record<string, string> = {
  tilopay: 'Tilopay',
  onvopay: 'OnvoPay',
  bac_compra_click: 'BAC Compra Click',
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: currency === 'CRC' ? 'CRC' : 'USD',
  }).format(amount);
};

const Facturacion = () => {
  const { isAgency, loading: roleLoading } = useUserRole();
  const { selectedClient, clients } = useBrand();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: allSubscriptions = [] } = useAllSubscriptions();
  const { data: transactions = [] } = usePaymentTransactions(selectedClient?.id ?? null);
  const { data: currentSub } = useClientSubscription(selectedClient?.id ?? null);
  const { remove } = useMutatePlan();

  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignClientId, setAssignClientId] = useState<string | null>(null);

  const handleOpenAssignDialog = (clientId?: string) => {
    setAssignClientId(clientId || selectedClient?.id || null);
    setShowAssignDialog(true);
  };

  const handleCloseAssignDialog = (open: boolean) => {
    setShowAssignDialog(open);
    if (!open) setAssignClientId(null);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setShowPlanDialog(true);
  };

  const handleClosePlanDialog = (open: boolean) => {
    setShowPlanDialog(open);
    if (!open) setEditingPlan(null);
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(`¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await remove.mutateAsync(plan.id);
      toast.success('Plan eliminado');
    } catch {
      toast.error('Error al eliminar. Verifica que no tenga suscripciones asociadas.');
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-semibold text-foreground">Facturación</h1>
        </div>

        <Tabs defaultValue={isAgency ? "plans" : "subscription"}>
          <TabsList>
            {isAgency && <TabsTrigger value="plans">Planes</TabsTrigger>}
            {isAgency && <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>}
            <TabsTrigger value="subscription">Mi Suscripción</TabsTrigger>
            <TabsTrigger value="transactions">Historial de Pagos</TabsTrigger>
          </TabsList>

          {/* Admin: Plans Management */}
          {isAgency && (
            <TabsContent value="plans" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Administra los planes de suscripción disponibles.</p>
                <Button size="sm" onClick={() => { setEditingPlan(null); setShowPlanDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nuevo Plan
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge variant={plan.is_active ? "default" : "secondary"}>
                            {plan.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                      {plan.description && <CardDescription>{plan.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(plan.price_amount, plan.currency)}
                        <span className="text-sm font-normal text-muted-foreground">/{plan.billing_interval === 'monthly' ? 'mes' : 'año'}</span>
                      </div>
                      {plan.features && (plan.features as string[]).length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {(plan.features as string[]).map((f, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {f}</li>
                          ))}
                        </ul>
                      )}
                      {plan.max_clients && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Hasta {plan.max_clients} clientes · {plan.max_users || '∞'} usuarios
                        </p>
                      )}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditPlan(plan)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeletePlan(plan)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {plans.length === 0 && !plansLoading && (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay planes creados aún.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowPlanDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Crear primer plan
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* Admin: All Subscriptions */}
          {isAgency && (
            <TabsContent value="subscriptions" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Vista general de suscripciones de todos los clientes.</p>
                <Button size="sm" onClick={() => handleOpenAssignDialog()}>
                  <UserPlus className="h-4 w-4 mr-1" /> Asignar Plan
                </Button>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pasarela</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSubscriptions.map((sub) => {
                      const client = clients.find((c) => c.id === sub.client_id);
                      const plan = plans.find((p) => p.id === sub.plan_id);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">{client?.name || 'Cliente'}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {plan?.name || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[sub.status] || ''} variant="outline">
                              {statusLabels[sub.status] || sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub.payment_provider ? providerLabels[sub.payment_provider] : 'Manual'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setAssignClientId(sub.client_id);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allSubscriptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay suscripciones activas aún. Usa "Asignar Plan" para empezar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          )}

          {/* My Subscription */}
          <TabsContent value="subscription" className="space-y-4">
            {!selectedClient ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Selecciona un cliente para ver su suscripción.</p>
                </CardContent>
              </Card>
            ) : currentSub ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Suscripción de {selectedClient.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Plan:</span>
                    <span className="text-sm font-medium text-foreground">
                      {plans.find(p => p.id === currentSub.plan_id)?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge className={statusColors[currentSub.status] || ''} variant="outline">
                      {statusLabels[currentSub.status] || currentSub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Pasarela:</span>
                    <span className="text-sm text-foreground">
                      {currentSub.payment_provider ? providerLabels[currentSub.payment_provider] : 'Manual'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Período actual:</span>
                    <span className="text-sm text-foreground">
                      {format(new Date(currentSub.current_period_start), 'dd MMM', { locale: es })} — {format(new Date(currentSub.current_period_end), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Este cliente no tiene suscripción activa.</p>
                  {isAgency && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAssignDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Asignar Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="transactions" className="space-y-4">
            {!selectedClient ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Selecciona un cliente para ver sus transacciones.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {providerLabels[tx.provider]}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[tx.status] || ''} variant="outline">
                            {statusLabels[tx.status] || tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No hay transacciones registradas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PlanFormDialog open={showPlanDialog} onOpenChange={handleClosePlanDialog} editPlan={editingPlan} />
      <AssignPlanDialog open={showAssignDialog} onOpenChange={setShowAssignDialog} clients={clients} preselectedClientId={selectedClient?.id} />
    </DashboardLayout>
  );
};

export default Facturacion;
