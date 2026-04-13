import { useMemo } from 'react';
import { SetterAppointment } from '@/hooks/use-setter-appointments';
import { Megaphone, Leaf, Users, MoreHorizontal, MessageCircle } from 'lucide-react';

interface LeadSourceWidgetProps {
  appointments: SetterAppointment[];
}

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ads: { label: 'Pauta', icon: Megaphone, color: 'hsl(210, 80%, 50%)' },
  organic: { label: 'Orgánico', icon: Leaf, color: 'hsl(142, 70%, 45%)' },
  referral: { label: 'Referencia', icon: Users, color: 'hsl(45, 80%, 50%)' },
  landing_page: { label: 'Landing Page', icon: Megaphone, color: 'hsl(270, 70%, 55%)' },
  dm: { label: 'Mensaje directo', icon: MessageCircle, color: 'hsl(330, 70%, 50%)' },
  other: { label: 'Otro', icon: MoreHorizontal, color: 'hsl(0, 0%, 60%)' },
};

export const LeadSourceWidget = ({ appointments }: LeadSourceWidgetProps) => {
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      const src = a.source || 'other';
      counts[src] = (counts[src] || 0) + 1;
    });
    const total = appointments.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({
        source,
        count,
        pct: Math.round((count / total) * 100),
        ...(SOURCE_CONFIG[source] || SOURCE_CONFIG.other),
      }));
  }, [appointments]);

  if (appointments.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {breakdown.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.source} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{item.count}</span>
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-[10px] text-muted-foreground">({item.pct}%)</span>
          </div>
        );
      })}
    </div>
  );
};
