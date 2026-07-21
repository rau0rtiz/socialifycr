import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Sparkles, Clock, Repeat, Store } from 'lucide-react';
import type { SellerLead } from '@/hooks/use-seller-leads';
import { getUrgencyFromLead } from '@/lib/comfortex-urgency';
import { UrgencyBadge } from './UrgencyBadge';

const STATUS_STYLES: Record<string, { label: string; chip: string; bar: string; dot: string }> = {
  new:           { label: 'Nuevo',        chip: 'bg-[hsl(var(--status-new))]/12 text-[hsl(var(--status-new))]',                 bar: 'bg-[hsl(var(--status-new))]',          dot: 'bg-[hsl(var(--status-new))]' },
  contactado:    { label: 'Contactado',   chip: 'bg-[hsl(var(--status-contactado))]/12 text-[hsl(var(--status-contactado))]',   bar: 'bg-[hsl(var(--status-contactado))]',   dot: 'bg-[hsl(var(--status-contactado))]' },
  seguimiento:   { label: 'Seguimiento',  chip: 'bg-[hsl(var(--status-seguimiento))]/12 text-[hsl(var(--status-seguimiento))]', bar: 'bg-[hsl(var(--status-seguimiento))]',  dot: 'bg-[hsl(var(--status-seguimiento))]' },
  visita_tienda: { label: 'Va a visitar', chip: 'bg-[hsl(var(--status-visita))]/12 text-[hsl(var(--status-visita))]',           bar: 'bg-[hsl(var(--status-visita))]',       dot: 'bg-[hsl(var(--status-visita))]' },
  venta:         { label: 'Venta',        chip: 'bg-[hsl(var(--status-venta))]/15 text-[hsl(var(--status-venta))]',              bar: 'bg-[hsl(var(--status-venta))]',        dot: 'bg-[hsl(var(--status-venta))]' },
  perdido:       { label: 'Perdido',      chip: 'bg-[hsl(var(--status-perdido))]/12 text-[hsl(var(--status-perdido))]',         bar: 'bg-[hsl(var(--status-perdido))]',      dot: 'bg-[hsl(var(--status-perdido))]' },
};

const formatVisit = (iso: string | null | undefined): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
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
      className="relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border"
      onClick={onOpen}
    >
      {/* Left status bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />

      <div className="p-3.5 pl-4 space-y-2.5">
        {/* Header: name + status chip */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isNew && <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--status-new))] shrink-0" />}
              <p className="font-semibold text-sm leading-tight truncate">{lead.full_name || '(Sin nombre)'}</p>
            </div>
            {showClient && lead.client_name && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{lead.client_name}</p>
            )}
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>

        {/* Meta row: recontact + urgency (only if present) */}
        {(lead.is_recontact || urgency) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {lead.is_recontact && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-medium"
                title="Este lead ya había llenado otro formulario antes"
              >
                <Repeat className="h-2.5 w-2.5" /> Recontacto
              </span>
            )}
            {urgency && <UrgencyBadge urgency={urgency} />}
          </div>
        )}

        {/* Info block */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {model && (
            <p className="truncate">
              <span className="opacity-60">📦</span> <span className="text-foreground/80">{String(model)}</span>
              {cantidad ? <span className="opacity-70"> · {String(cantidad)}</span> : null}
            </p>
          )}
          {status === 'visita_tienda' && (lead as any).store_visit_at && (
            <p className="flex items-center gap-1 text-[hsl(var(--status-visita))] font-medium">
              <Store className="h-3 w-3" /> {formatVisit((lead as any).store_visit_at)}
            </p>
          )}
          <p className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 opacity-70" /> hace {formatRelative(lead.created_time || lead.created_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          {cleanPhone && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`, '_blank'); }}
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${cleanPhone}`; }}
                title="Llamar"
              >
                <Phone className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" className="h-8 px-3 ml-auto text-xs font-semibold" onClick={onOpen}>
            Abrir
          </Button>
        </div>
      </div>
    </Card>
  );
};
