import * as React from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface Preset {
  label: string;
  getValue: () => DateRange;
}

const presets: Record<PresetKey, Preset> = {
  today: {
    label: 'Hoy',
    getValue: () => ({ from: new Date(), to: new Date() }),
  },
  yesterday: {
    label: 'Ayer',
    getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
  },
  week: {
    label: 'Esta semana',
    getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
  },
  month: {
    label: 'Este mes',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  custom: {
    label: 'Personalizado',
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
};

export const DateRangePicker = () => {
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey>('month');
  const [date, setDate] = React.useState<DateRange | undefined>(presets.month.getValue());
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  const handlePresetChange = (value: string) => {
    const preset = value as PresetKey;
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      setIsCustomOpen(true);
    } else {
      setDate(presets[preset].getValue());
      setIsCustomOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!date?.from) return 'Seleccionar fechas';
    if (!date.to) return format(date.from, 'dd MMM yyyy', { locale: es });
    return `${format(date.from, 'dd MMM', { locale: es })} - ${format(date.to, 'dd MMM yyyy', { locale: es })}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-28 md:w-36 bg-background text-xs md:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {Object.entries(presets).map(([key, preset]) => (
            <SelectItem key={key} value={key}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal bg-background text-xs md:text-sm hidden md:flex",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">{formatDateRange()}</span>
            <span className="lg:hidden">Fechas</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover z-50" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              if (newDate?.from && newDate?.to) {
                setSelectedPreset('custom');
              }
            }}
            numberOfMonths={1}
            locale={es}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
