import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthSelectorProps {
  value: string; // 'yyyy-MM'
  onChange: (next: string) => void;
}

export const MonthSelector = ({ value, onChange }: MonthSelectorProps) => {
  const date = parseISO(`${value}-01`);
  const isCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM') === value;

  return (
    <div className="inline-flex items-center gap-1 border rounded-lg bg-card">
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={() => onChange(format(subMonths(date, 1), 'yyyy-MM'))}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="px-3 min-w-[140px] text-center">
        <div className="text-sm font-semibold capitalize leading-tight">
          {format(date, 'MMMM yyyy', { locale: es })}
        </div>
        {isCurrentMonth && <div className="text-[10px] text-muted-foreground">Mes actual</div>}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={() => onChange(format(addMonths(date, 1), 'yyyy-MM'))}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
