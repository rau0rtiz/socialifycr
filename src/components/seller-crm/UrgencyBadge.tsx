import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import type { UrgencyBucket } from '@/lib/comfortex-urgency';
import { URGENCY_SHORT, URGENCY_STYLE } from '@/lib/comfortex-urgency';

interface Props {
  urgency: UrgencyBucket | null;
  compact?: boolean;
}

export const UrgencyBadge = ({ urgency, compact = false }: Props) => {
  if (!urgency) return null;
  return (
    <Badge variant="outline" className={`gap-1 ${URGENCY_STYLE[urgency]} shrink-0`}>
      {urgency === '24h' && <Zap className="h-3 w-3" />}
      {compact ? URGENCY_SHORT[urgency] : URGENCY_SHORT[urgency]}
    </Badge>
  );
};
