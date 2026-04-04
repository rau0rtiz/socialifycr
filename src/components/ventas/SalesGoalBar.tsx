import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Target, Pencil, Calendar } from 'lucide-react';
import { useSalesGoal } from '@/hooks/use-sales-goals';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBrand } from '@/contexts/BrandContext';

interface SalesGoalBarProps {
  clientId: string;
  currentSalesUSD: number;
  currentSalesCRC: number;
  primaryColor?: string;
  accentColor?: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

export const SalesGoalBar = ({ clientId, currentSalesUSD, currentSalesCRC, primaryColor, accentColor }: SalesGoalBarProps) => {
  const { selectedClient } = useBrand();
  const isMindCoach = selectedClient?.name?.toLowerCase().includes('mind coach');
  const goalLabel = isMindCoach ? 'Meta de Pipeline' : 'Meta de Ventas';
  const { goal, isLoading, upsertGoal } = useSalesGoal(clientId);
  const [editOpen, setEditOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (isLoading || !goal) return null;

  const currentAmount = goal.currency === 'USD' ? currentSalesUSD : currentSalesCRC;
  const progress = Math.min((currentAmount / goal.target_amount) * 100, 100);
  const remaining = Math.max(goal.target_amount - currentAmount, 0);
  const daysLeft = differenceInDays(new Date(goal.end_date), new Date());
  const expired = daysLeft < 0;

  const openEdit = () => {
    setTargetAmount(String(goal.target_amount));
    setCurrency(goal.currency);
    setStartDate(goal.start_date);
    setEndDate(goal.end_date);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!targetAmount || !endDate) {
      toast.error('Meta y fecha de fin son requeridos');
      return;
    }
    upsertGoal.mutate(
      { target_amount: parseFloat(targetAmount), currency, start_date: startDate || new Date().toISOString().split('T')[0], end_date: endDate },
      {
        onSuccess: () => { toast.success('Meta actualizada'); setEditOpen(false); },
        onError: () => toast.error('Error al actualizar meta'),
      }
    );
  };

  const barBg = primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))';
  const barAccent = accentColor ? `hsl(${accentColor})` : 'hsl(var(--accent))';

  return (
    <>
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: barBg + '15' }}>
                <Target className="h-5 w-5" style={{ color: barBg }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">{goalLabel}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(goal.start_date), 'dd MMM', { locale: es })} — {format(new Date(goal.end_date), 'dd MMM yyyy', { locale: es })}
                  {!expired && <span className="text-foreground/60">· {daysLeft}d restantes</span>}
                  {expired && <span className="text-destructive font-medium">· Expirada</span>}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="relative h-10 rounded-xl overflow-hidden bg-muted/60">
            <div
              className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${barBg}, ${barAccent})`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold mix-blend-difference text-white tracking-wide">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between mt-3 text-xs">
            <span className="font-semibold" style={{ color: barBg }}>
              {formatCurrency(currentAmount, goal.currency)} logrado
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(remaining, goal.currency)} restante de {formatCurrency(goal.target_amount, goal.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar {goalLabel}</DialogTitle>
            <DialogDescription>Configura la meta de ingresos para este cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Meta *</Label>
                <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
              </div>
              <div className="w-24">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">₡ CRC</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Fecha fin *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsertGoal.isPending}>
              {upsertGoal.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
