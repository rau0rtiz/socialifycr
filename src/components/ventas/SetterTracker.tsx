import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useSetterAppointments, SetterAppointment, AppointmentStatus } from '@/hooks/use-setter-appointments';
import { useClientProducts } from '@/hooks/use-client-products';
import { AppointmentFormDialog } from './AppointmentFormDialog';

import { toast } from 'sonner';
import {
  UserPlus, User, DollarSign,
  Trash2, Pencil, TrendingUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, ShoppingCart, Package, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetterTrackerProps {
  clientId: string;
  hasAdAccount?: boolean;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: CheckCircle2 },
  completed: { label: 'Realizada', color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30', icon: CheckCircle2 },
  no_show: { label: 'No Show', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: XCircle },
  sold: { label: 'Venta', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: DollarSign },
  cancelled: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-border', icon: AlertTriangle },
};

export const SetterTracker = ({ clientId, hasAdAccount }: SetterTrackerProps) => {
  const [period, setPeriod] = useState('last_30d');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SetterAppointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [salePrompt, setSalePrompt] = useState<SetterAppointment | null>(null);
  const [saleAmount, setSaleAmount] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [saleProduct, setSaleProduct] = useState('');
  const [showNewSaleProduct, setShowNewSaleProduct] = useState(false);
  const [newSaleProductName, setNewSaleProductName] = useState('');

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useSetterAppointments(clientId, period);
  const { products, addProduct } = useClientProducts(clientId);

  // Extract unique setter names for the dropdown
  const existingSetters = useMemo(() => {
    const names = new Set<string>();
    appointments.forEach(a => { if (a.setter_name) names.add(a.setter_name); });
    return Array.from(names).sort();
  }, [appointments]);

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const scheduled = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed' || a.status === 'sold').length;
    const noShows = appointments.filter(a => a.status === 'no_show').length;
    const sold = appointments.filter(a => a.status === 'sold').length;
    const soldValue = appointments.filter(a => a.status === 'sold').reduce((sum, a) => {
      const val = a.currency === 'USD' ? (a.estimated_value || 0) : (a.estimated_value || 0) / 520;
      return sum + val;
    }, 0);
    const showRate = total > 0 ? ((completed + sold) / (completed + sold + noShows)) * 100 : 0;
    const closeRate = (completed + sold) > 0 ? (sold / (completed + sold)) * 100 : 0;

    return { total, scheduled, completed, noShows, sold, soldValue, showRate, closeRate };
  }, [appointments]);

  const handleSubmit = async (input: any) => {
    try {
      if (editing) {
        await updateAppointment.mutateAsync({ id: editing.id, ...input });
        toast.success('Lead actualizado');
      } else {
        await addAppointment.mutateAsync(input);
        toast.success('Lead registrado');
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error('Error guardando lead');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment.mutateAsync(id);
      toast.success('Lead eliminado');
      setConfirmDelete(null);
    } catch {
      toast.error('Error eliminando lead');
    }
  };

  const handleStatusChange = async (appointment: SetterAppointment, newStatus: AppointmentStatus) => {
    if (newStatus === 'sold') {
      openSaleDialog(appointment);
      return;
    }
    try {
      await updateAppointment.mutateAsync({ id: appointment.id, status: newStatus } as any);
      toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  const openSaleDialog = (appointment: SetterAppointment) => {
    setSalePrompt(appointment);
    setSaleAmount('');
    setSaleCurrency(appointment.currency as 'CRC' | 'USD' || 'CRC');
    setSaleProduct((appointment as any).product || '');
    setShowNewSaleProduct(false);
    setNewSaleProductName('');
  };

  const handleAddSaleProduct = async () => {
    if (!newSaleProductName.trim()) return;
    try {
      const result = await addProduct.mutateAsync({ name: newSaleProductName.trim() });
      setSaleProduct(result.name);
      setShowNewSaleProduct(false);
      setNewSaleProductName('');
      toast.success('Producto creado');
    } catch {
      toast.error('Error creando producto');
    }
  };

  const handleConfirmSale = async () => {
    if (!salePrompt || !saleAmount) return;
    try {
      await updateAppointment.mutateAsync({
        id: salePrompt.id,
        status: 'sold',
        estimated_value: parseFloat(saleAmount),
        currency: saleCurrency,
        product: saleProduct || undefined,
      } as any);
      toast.success('Venta registrada');
      setSalePrompt(null);
    } catch {
      toast.error('Error registrando venta');
    }
  };

  const productNames = products.map(p => p.name);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Setter & Pipeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7d" className="text-xs">Últimos 7 días</SelectItem>
                  <SelectItem value="last_30d" className="text-xs">Últimos 30 días</SelectItem>
                  <SelectItem value="this_month" className="text-xs">Este mes</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" onClick={() => { setEditing(null); setShowForm(true); }}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Nuevo Lead
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="Leads" value={stats.total} sub={`${stats.scheduled} pendientes`} icon={UserPlus} />
            <StatsCard label="Show Rate" value={`${stats.showRate.toFixed(0)}%`} sub={`${stats.noShows} no shows`} icon={TrendingUp} />
            <StatsCard label="Close Rate" value={`${stats.closeRate.toFixed(0)}%`} sub={`${stats.sold} ventas`} icon={CheckCircle2} />
            <StatsCard
              label="Ventas Cerradas"
              value={`$${stats.soldValue.toLocaleString('en', { maximumFractionDigits: 0 })}`}
              sub={`${stats.sold} ventas`}
              icon={DollarSign}
            />
          </div>

          {/* Leads list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">Cargando...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin leads registrados</p>
              <p className="text-xs mt-1">Registra leads para trackear tu pipeline de ventas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map(apt => {
                const cfg = STATUS_CONFIG[apt.status as AppointmentStatus] || STATUS_CONFIG.scheduled;
                const StatusIcon = cfg.icon;
                const leadGoal = (apt as any).lead_goal;
                const product = (apt as any).product;
                const canConvertToSale = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'scheduled';
                return (
                  <div
                    key={apt.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card"
                  >
                    {/* Status icon */}
                    <div className={cn('p-1.5 rounded-md border', cfg.color)}>
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{apt.lead_name}</span>
                        <Badge variant="outline" className={cn('text-[10px] border', cfg.color)}>
                          {cfg.label}
                        </Badge>
                        {apt.setter_name && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" /> {apt.setter_name}
                          </span>
                        )}
                      </div>
                      {product && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" /> {product}
                        </p>
                      )}
                      {leadGoal && (
                        <p className="text-xs text-muted-foreground">
                          🎯 {leadGoal}
                        </p>
                      )}
                      {apt.ad_name && (
                        <p className="text-[10px] text-muted-foreground">
                          📢 {apt.ad_name} — {apt.ad_campaign_name}
                        </p>
                      )}
                      {apt.status === 'sold' && (apt.estimated_value || 0) > 0 && (
                        <p className="text-xs font-medium text-foreground">
                          {apt.currency === 'CRC' ? '₡' : '$'}
                          {(apt.estimated_value || 0).toLocaleString()}
                        </p>
                      )}
                      {apt.notes && (
                        <p className="text-[10px] text-muted-foreground italic">{apt.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                      {/* Convert to sale button */}
                      {canConvertToSale && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => openSaleDialog(apt)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-0.5" />
                          Venta
                        </Button>
                      )}
                      {/* Quick status change */}
                      <Select
                        value={apt.status}
                        onValueChange={v => handleStatusChange(apt, v as AppointmentStatus)}
                      >
                        <SelectTrigger className="h-6 text-[10px] w-24 border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                            <SelectItem key={val} value={val} className="text-xs">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => { setEditing(apt); setShowForm(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {confirmDelete === apt.id ? (
                        <div className="flex gap-0.5">
                          <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDelete(apt.id)}>
                            Sí
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setConfirmDelete(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDelete(apt.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentFormDialog
        open={showForm}
        onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}
        onSubmit={handleSubmit}
        clientId={clientId}
        hasAdAccount={hasAdAccount}
        isSubmitting={addAppointment.isPending || updateAppointment.isPending}
        editing={editing}
        existingSetters={existingSetters}
      />

      {/* Sale conversion dialog */}
      <Dialog open={!!salePrompt} onOpenChange={(v) => { if (!v) setSalePrompt(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar Venta</DialogTitle>
            <DialogDescription className="text-xs">
              Convierte este lead en una venta para <span className="font-medium text-foreground">{salePrompt?.lead_name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Product */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Package className="h-3 w-3" /> Producto
              </Label>
              {showNewSaleProduct ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del producto"
                    value={newSaleProductName}
                    onChange={e => setNewSaleProductName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSaleProduct(); }}
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddSaleProduct} disabled={!newSaleProductName.trim() || addProduct.isPending}>
                    {addProduct.isPending ? '...' : 'OK'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowNewSaleProduct(false)}>
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={saleProduct || '_none'} onValueChange={v => setSaleProduct(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-xs">Sin producto</SelectItem>
                      {saleProduct && !productNames.includes(saleProduct) && (
                        <SelectItem key={saleProduct} value={saleProduct} className="text-xs">{saleProduct}</SelectItem>
                      )}
                      {productNames.map(name => (
                        <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewSaleProduct(true)}>
                    <Plus className="h-3 w-3 mr-0.5" /> Nuevo
                  </Button>
                </div>
              )}
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Monto de la Venta *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={saleAmount}
                  onChange={e => setSaleAmount(e.target.value)}
                  className="h-8 text-xs"
                  min="0"
                  autoFocus={!showNewSaleProduct}
                />
              </div>
              <div className="w-20 space-y-1.5">
                <Label className="text-xs">Moneda</Label>
                <Select value={saleCurrency} onValueChange={v => setSaleCurrency(v as 'CRC' | 'USD')}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC" className="text-xs">CRC</SelectItem>
                    <SelectItem value="USD" className="text-xs">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setSalePrompt(null)}>
              Cancelar
            </Button>
            <Button size="sm" className="text-xs" onClick={handleConfirmSale} disabled={!saleAmount || updateAppointment.isPending}>
              {updateAppointment.isPending ? 'Guardando...' : 'Confirmar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

// Small stats card
const StatsCard = ({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub: string; icon: React.ElementType }) => (
  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);
