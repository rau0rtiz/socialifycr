import * as React from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export type DatePresetKey = 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month' | 'custom';
interface Preset {
  label: string;
  getValue: () => DateRange;
}
const presets: Record<DatePresetKey, Preset> = {
  last_7d: {
    label: 'Últimos 7 días',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date()
    })
  },
  last_14d: {
    label: 'Últimos 14 días',
    getValue: () => ({
      from: subDays(new Date(), 14),
      to: new Date()
    })
  },
  last_30d: {
    label: 'Últimos 30 días',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date()
    })
  },
  last_90d: {
    label: 'Últimos 90 días',
    getValue: () => ({
      from: subDays(new Date(), 90),
      to: new Date()
    })
  },
  this_month: {
    label: 'Este mes',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  last_month: {
    label: 'Mes pasado',
    getValue: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      };
    }
  },
  custom: {
    label: 'Personalizado',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date()
    })
  }
};
interface DateRangePickerProps {
  value?: DatePresetKey;
  onChange?: (preset: DatePresetKey) => void;
}
export const DateRangePicker = ({
  value,
  onChange
}: DateRangePickerProps) => {
  const [selectedPreset, setSelectedPreset] = React.useState<DatePresetKey>(value || 'last_30d');
  const [date, setDate] = React.useState<DateRange | undefined>(presets[value || 'last_30d'].getValue());
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  // Sync with external value
  React.useEffect(() => {
    if (value && value !== selectedPreset) {
      setSelectedPreset(value);
      setDate(presets[value].getValue());
    }
  }, [value]);
  const handlePresetChange = (newValue: string) => {
    const preset = newValue as DatePresetKey;
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setIsCustomOpen(true);
    } else {
      setDate(presets[preset].getValue());
      setIsCustomOpen(false);
      onChange?.(preset);
    }
  };
  const formatDateRange = () => {
    if (!date?.from) return 'Seleccionar fechas';
    if (!date.to) return format(date.from, 'dd MMM yyyy', {
      locale: es
    });
    return `${format(date.from, 'dd MMM', {
      locale: es
    })} - ${format(date.to, 'dd MMM yyyy', {
      locale: es
    })}`;
  };
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presets).map(([key, preset]) => (
            <SelectItem key={key} value={key}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset === 'custom' && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                if (newDate?.from && newDate?.to) {
                  onChange?.('custom');
                }
              }}
              numberOfMonths={2}
              locale={es}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};