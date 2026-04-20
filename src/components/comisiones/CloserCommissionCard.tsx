import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloserCommission } from '@/hooks/use-commissions';
import { TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloserCommissionCardProps {
  closerName: string;
  avatarUrl: string | null;
  commissions: CloserCommission[];
  currency: string;
  onClick: () => void;
}

const formatMoney = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || '?';

export const CloserCommissionCard = ({
  closerName,
  avatarUrl,
  commissions,
  currency,
  onClick,
}: CloserCommissionCardProps) => {
  const salesCount = commissions.length;
  const cashCollected = commissions.reduce((s, c) => s + (c.cash_collected || 0), 0);
  const totalCommission = commissions.reduce((s, c) => s + c.total_commission, 0);
  const earnedToDate = commissions.reduce((s, c) => s + (c.earned_to_date || 0), 0);
  const paid = commissions.reduce((s, c) => s + c.paid_amount, 0);
  const pendingToPay = commissions.reduce((s, c) => s + (c.pending_to_pay || 0), 0);

  const isEmpty = salesCount === 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden flex flex-col',
        'aspect-[3/4]',
        isEmpty && 'opacity-60 hover:opacity-90',
        pendingToPay > 0 && 'ring-2 ring-amber-500/40'
      )}
    >
      {/* Top section: avatar + name */}
      <div className="flex flex-col items-center pt-5 pb-3 px-3 bg-gradient-to-b from-muted/40 to-transparent">
        <Avatar className="h-16 w-16 mb-2 ring-2 ring-background shadow-md">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={closerName} />}
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials(closerName)}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-semibold text-center truncate w-full px-2" title={closerName}>
          {closerName}
        </div>
      </div>

      {/* Big "Por pagar" number */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 border-y bg-card">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Por pagar
        </div>
        <div
          className={cn(
            'text-2xl lg:text-3xl font-bold tabular-nums',
            pendingToPay > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          )}
        >
          {formatMoney(pendingToPay, currency)}
        </div>
        {isEmpty && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            Sin ventas este mes
          </Badge>
        )}
      </div>

      {/* Mini stats */}
      <div className="px-3 py-2.5 space-y-1 text-xs">
        <Row label="Ventas" value={String(salesCount)} />
        <Row label="Cobrado" value={formatMoney(cashCollected, currency)} />
        <Row
          label="Comisión"
          value={formatMoney(totalCommission, currency)}
          icon={<TrendingUp className="h-3 w-3 text-blue-500" />}
        />
        <Row
          label="Pagado"
          value={formatMoney(paid, currency)}
          icon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />}
        />
      </div>

      {/* Footer */}
      <div className="px-3 pb-3">
        <Button variant="ghost" size="sm" className="w-full h-8 text-xs justify-between group-hover:bg-muted">
          Ver detalle
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
};

const Row = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground flex items-center gap-1">
      {icon}
      {label}
    </span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);
