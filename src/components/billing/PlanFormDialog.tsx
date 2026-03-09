import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutatePlan, SubscriptionPlan } from '@/hooks/use-billing';
import { toast } from 'sonner';

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPlan?: SubscriptionPlan | null;
}

export const PlanFormDialog = ({ open, onOpenChange, editPlan }: PlanFormDialogProps) => {
  const { create, update } = useMutatePlan();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [features, setFeatures] = useState('');
  const [maxClients, setMaxClients] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editPlan) {
      setName(editPlan.name);
      setDescription(editPlan.description || '');
      setPriceAmount(String(editPlan.price_amount));
      setCurrency(editPlan.currency);
      setBillingInterval(editPlan.billing_interval);
      setFeatures((editPlan.features || []).join('\n'));
      setMaxClients(editPlan.max_clients ? String(editPlan.max_clients) : '');
      setMaxUsers(editPlan.max_users ? String(editPlan.max_users) : '');
      setIsActive(editPlan.is_active);
    } else {
      resetForm();
    }
  }, [editPlan, open]);

  const handleSubmit = async () => {
    if (!name || !priceAmount) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    const payload = {
      name,
      description: description || null,
      price_amount: parseFloat(priceAmount),
      currency,
      billing_interval: billingInterval,
      features: features.split('\n').filter(Boolean),
      max_clients: maxClients ? parseInt(maxClients) : null,
      max_users: maxUsers ? parseInt(maxUsers) : null,
      is_active: isActive,
      sort_order: editPlan?.sort_order ?? 0,
    };

    try {
      if (editPlan) {
        await update.mutateAsync({ id: editPlan.id, ...payload } as any);
        toast.success('Plan actualizado');
      } else {
        await create.mutateAsync(payload as any);
        toast.success('Plan creado exitosamente');
      }
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(editPlan ? 'Error al actualizar el plan' : 'Error al crear el plan');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriceAmount('');
    setCurrency('CRC');
    setBillingInterval('monthly');
    setFeatures('');
    setMaxClients('');
    setMaxUsers('');
    setIsActive(true);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editPlan ? 'Editar Plan' : 'Nuevo Plan de Suscripción'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Plan Pro" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del plan..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio</Label>
              <Input type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} placeholder="50000" />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">CRC (Colones)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Intervalo</Label>
            <Select value={billingInterval} onValueChange={setBillingInterval}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Características (una por línea)</Label>
            <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={"Dashboard completo\nReportes ilimitados\nSoporte prioritario"} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Máx. clientes</Label>
              <Input type="number" value={maxClients} onChange={(e) => setMaxClients(e.target.value)} placeholder="∞" />
            </div>
            <div>
              <Label>Máx. usuarios</Label>
              <Input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} placeholder="∞" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Plan activo</Label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (editPlan ? 'Guardando...' : 'Creando...') : (editPlan ? 'Guardar Cambios' : 'Crear Plan')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
