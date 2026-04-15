import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Target, Pencil, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSalesGoal } from '@/hooks/use-sales-goals';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

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

const getMonthKey = (date: Date) => format(date, 'yyyy-MM');

export const SalesGoalBar = ({ clientId, currentSalesUSD, currentSalesCRC, primaryColor, accentColor }: SalesGoalBarProps) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const { goal, isLoading, upsertGoal } = useSalesGoal(clientId, viewMonth);
  const [editOpen, setEditOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [editMonth, setEditMonth] = useState(new Date());

  const isCurrentMonth = getMonthKey(viewMonth) === getMonthKey(new Date());
  const barBg = 'hsl(142, 71%, 45%)';   // green-500
  const barAccent = 'hsl(142, 76%, 36%)'; // green-600

  if (isLoading) return null;

  const openCreate = () => {
    setTargetAmount('');
    setCurrency('USD');
    setEditMonth(viewMonth);
    setEditOpen(true);
  };

  const openEdit = () => {
    if (goal) {
      setTargetAmount(String(goal.target_amount));
      setCurrency(goal.currency);
      setEditMonth(viewMonth);
    }
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!targetAmount) {
      toast.error('El monto de la meta es requerido');
      return;
    }
    const monthStart = startOfMonth(editMonth);
    const monthEndDate = endOfMonth(editMonth);
    upsertGoal.mutate(
      {
        target_amount: parseFloat(targetAmount),
        currency,
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(monthEndDate, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => {
          toast.success('Meta mensual actualizada');
          setEditOpen(false);
          setViewMonth(editMonth);
        },
        onError: () => toast.error('Error al actualizar meta'),
      }
    );
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    setViewMonth(prev => dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // No goal for this month
  if (!goal) {
    return (
      <>
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: barBg + '15' }}>
                  <Target className="h-5 w-5" style={{ color: barBg }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Meta Mensual</h3>
                  <p className="text-xs text-muted-foreground">
                    No hay meta para {format(viewMonth, 'MMMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={openCreate}>Crear meta</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <EditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editMonth={editMonth}
          setEditMonth={setEditMonth}
          targetAmount={targetAmount}
          setTargetAmount={setTargetAmount}
          currency={currency}
          setCurrency={setCurrency}
          onSave={handleSave}
          isPending={upsertGoal.isPending}
        />
      </>
    );
  }

  const currentAmount = goal.currency === 'USD' ? currentSalesUSD : currentSalesCRC;
  const progress = Math.min((currentAmount / goal.target_amount) * 100, 100);
  const remaining = Math.max(goal.target_amount - currentAmount, 0);
  const now = new Date();
  const monthEnd = endOfMonth(viewMonth);
  const daysLeft = Math.max(Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
  const expired = !isCurrentMonth && viewMonth < now;

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
                <h3 className="font-semibold text-sm text-foreground">Meta Mensual</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span className="capitalize">{format(viewMonth, 'MMMM yyyy', { locale: es })}</span>
                  {!expired && isCurrentMonth && <span className="text-foreground/60">· {daysLeft}d restantes</span>}
                  {expired && <span className="text-destructive font-medium">· Expirada</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
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
              <span className="text-sm font-bold text-white tracking-wide drop-shadow-sm">
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

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editMonth={editMonth}
        setEditMonth={setEditMonth}
        targetAmount={targetAmount}
        setTargetAmount={setTargetAmount}
        currency={currency}
        setCurrency={setCurrency}
        onSave={handleSave}
        isPending={upsertGoal.isPending}
      />
    </>
  );
};

// Extracted edit dialog
function EditDialog({
  open, onOpenChange, editMonth, setEditMonth, targetAmount, setTargetAmount, currency, setCurrency, onSave, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editMonth: Date;
  setEditMonth: (d: Date) => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Meta Mensual</DialogTitle>
          <DialogDescription>Configura la meta de ingresos para el mes</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Mes</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditMonth(subMonths(editMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center font-medium text-sm capitalize">
                {format(editMonth, 'MMMM yyyy', { locale: es })}
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditMonth(addMonths(editMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
