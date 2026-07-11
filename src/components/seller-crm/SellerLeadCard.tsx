import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Sparkles, Clock, Repeat } from 'lucide-react';
import type { SellerLead } from '@/hooks/use-seller-leads';
import { getUrgencyFromLead } from '@/lib/comfortex-urgency';
import { UrgencyBadge } from './UrgencyBadge';

const STATUS_STYLES: Record<string, { label: string; chip: string; ring: string }> = {
  new:         { label: 'Nuevo',       chip: 'bg-[hsl(var(--status-new))]/15 text-[hsl(var(--status-new))]',          ring: 'ring-[hsl(var(--status-new))]/40' },
  contactado:  { label: 'Contactado',  chip: 'bg-[hsl(var(--status-contactado))]/15 text-[hsl(var(--status-contactado))]', ring: 'ring-[hsl(var(--status-contactado))]/40' },
  seguimiento: { label: 'Seguimiento', chip: 'bg-[hsl(var(--status-seguimiento))]/15 text-[hsl(var(--status-seguimiento))]', ring: 'ring-[hsl(var(--status-seguimiento))]/40' },
  venta:       { label: 'Venta',       chip: 'bg-[hsl(var(--status-venta))]/18 text-[hsl(var(--status-venta))]',       ring: 'ring-[hsl(var(--status-venta))]/40' },
  perdido:     { label: 'Perdido',     chip: 'bg-[hsl(var(--status-perdido))]/15 text-[hsl(var(--status-perdido))]',   ring: 'ring-[hsl(var(--status-perdido))]/40' },
};

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
};

interface Props {
  lead: SellerLead;
  onOpen: () => void;
  showClient?: boolean;
}

export const SellerLeadCard = ({ lead, onOpen, showClient = false }: Props) => {
  const status = (lead.lead_status || 'new') as keyof typeof STATUS_STYLES;
  const style = STATUS_STYLES[status] || STATUS_STYLES.new;
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const ca = lead.custom_answers || {};
  const model = ca.modelo_de_camisa || ca.tipo_de_polo || ca.tipo_de_camisa;
  const cantidad = ca.cantidad_de_camisas;
  const urgency = getUrgencyFromLead(ca);

  const isNew = status === 'new';

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-all border ${isNew ? `ring-2 ${style.ring}` : ''}`}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isNew && <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--status-new))] shrink-0" />}
            <p className="font-semibold truncate">{lead.full_name || '(Sin nombre)'}</p>
          </div>
          {showClient && lead.client_name && (
            <p className="text-[11px] text-muted-foreground truncate">{lead.client_name}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <UrgencyBadge urgency={urgency} />
          <Badge className={`${style.chip} border-0`}>{style.label}</Badge>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        {model && <p className="truncate">📦 {String(model)}{cantidad ? ` · ${String(cantidad)}` : ''}</p>}
        <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> Entró hace {formatRelative(lead.created_time || lead.created_at)}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {cleanPhone && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 flex-1"
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`, '_blank'); }}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${cleanPhone}`; }}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Button size="sm" className="h-8 px-3 ml-auto" onClick={onOpen}>Abrir</Button>
      </div>
    </Card>
  );
};
