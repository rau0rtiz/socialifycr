import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutatePlan } from '@/hooks/use-billing';
import { toast } from 'sonner';

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlanFormDialog = ({ open, onOpenChange }: PlanFormDialogProps) => {
  const { create } = useMutatePlan();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [features, setFeatures] = useState('');
  const [maxClients, setMaxClients] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async () => {
    if (!name || !priceAmount) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    try {
      await create.mutateAsync({
        name,
        description: description || null,
        price_amount: parseFloat(priceAmount),
        currency,
        billing_interval: billingInterval,
        features: features.split('\n').filter(Boolean),
        max_clients: maxClients ? parseInt(maxClients) : null,
        max_users: maxUsers ? parseInt(maxUsers) : null,
        is_active: isActive,
        sort_order: 0,
      } as any);
      toast.success('Plan creado exitosamente');
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error('Error al crear el plan');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriceAmount('');
    setFeatures('');
    setMaxClients('');
    setMaxUsers('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Plan de Suscripción</DialogTitle>
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
            <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Dashboard completo&#10;Reportes ilimitados&#10;Soporte prioritario" rows={3} />
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
          <Button className="w-full" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
