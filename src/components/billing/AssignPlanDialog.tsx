import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscriptionPlans, useAssignPlan } from '@/hooks/use-billing';
import { toast } from 'sonner';

interface AssignPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  preselectedClientId?: string | null;
}

export const AssignPlanDialog = ({ open, onOpenChange, clients, preselectedClientId }: AssignPlanDialogProps) => {
  const { data: plans = [] } = useSubscriptionPlans();
  const assignPlan = useAssignPlan();
  const [selectedClient, setSelectedClient] = useState(preselectedClientId || '');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const activePlans = plans.filter(p => p.is_active);

  const handleAssign = async () => {
    if (!selectedClient || !selectedPlan) {
      toast.error('Selecciona un cliente y un plan');
      return;
    }

    try {
      await assignPlan.mutateAsync({
        clientId: selectedClient,
        planId: selectedPlan,
        provider: selectedProvider || null,
      });
      toast.success('Plan asignado exitosamente');
      onOpenChange(false);
      setSelectedClient('');
      setSelectedPlan('');
      setSelectedProvider('');
    } catch (err) {
      toast.error('Error al asignar el plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Plan a Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cliente</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue placeholder="Selecciona un plan" /></SelectTrigger>
              <SelectContent>
                {activePlans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {new Intl.NumberFormat('es-CR', { style: 'currency', currency: p.currency === 'CRC' ? 'CRC' : 'USD' }).format(p.price_amount)}/{p.billing_interval === 'monthly' ? 'mes' : 'año'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pasarela de pago (opcional)</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger><SelectValue placeholder="Sin pasarela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin pasarela (manual)</SelectItem>
                <SelectItem value="tilopay">Tilopay</SelectItem>
                <SelectItem value="onvopay">OnvoPay</SelectItem>
                <SelectItem value="bac_compra_click">BAC Compra Click</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleAssign} disabled={assignPlan.isPending}>
            {assignPlan.isPending ? 'Asignando...' : 'Asignar Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
