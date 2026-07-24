import { useMemo, useState } from 'react';
import {
  AgencyCrmLead,
  AgencyCrmStatus,
  CRM_STATUS_OPTIONS,
  getLostReasonLabel,
  useAgencyCrmLeads,
} from '@/hooks/use-agency-crm-leads';
import { Mail, Phone, GripVertical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContractClient {
  name: string;
  seller_name: string | null;
  start_date: string | null;
}

interface Props {
  leads: AgencyCrmLead[];
  contractClients: ContractClient[];
  search: string;
  onOpenLead: (lead: AgencyCrmLead) => void;
}

const columnAccent: Record<AgencyCrmStatus, string> = {
  nuevo: 'from-blue-500/40 to-blue-500/0',
  contactado: 'from-purple-500/40 to-purple-500/0',
  en_conversacion: 'from-amber-500/40 to-amber-500/0',
  agendado: 'from-cyan-500/40 to-cyan-500/0',
  cliente: 'from-green-500/40 to-green-500/0',
  perdido: 'from-red-500/40 to-red-500/0',
};

export const CrmKanban = ({ leads, contractClients, search, onOpenLead }: Props) => {
  const { updateLead } = useAgencyCrmLeads();
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q),
    );
  }, [leads, search]);

  const syntheticContracts = useMemo(() => {
    const leadNames = new Set(leads.map((l) => l.name.trim().toLowerCase()));
    const q = search.trim().toLowerCase();
    return contractClients
      .filter((c) => !leadNames.has(c.name.toLowerCase()))
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [leads, contractClients, search]);

  const columns = useMemo(() => {
    const map: Record<string, AgencyCrmLead[]> = {};
    CRM_STATUS_OPTIONS.forEach((s) => (map[s.value] = []));
    filteredLeads.forEach((l) => {
      (map[l.status] ||= []).push(l);
    });
    return map;
  }, [filteredLeads]);

  const handleDrop = async (status: AgencyCrmStatus, leadId: string) => {
    setOverCol(null);
    setDraggingId(null);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        patch: { status },
        prevStatus: lead.status,
      });
      toast({ title: 'Movido a ' + (CRM_STATUS_OPTIONS.find((s) => s.value === status)?.label || status) });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 pb-4">
      <div className="flex gap-4 min-w-max">
        {CRM_STATUS_OPTIONS.map((col) => {
          const status = col.value;
          const items = columns[status] || [];
          const isOver = overCol === status;
          const showContracts = status === 'cliente' ? syntheticContracts : [];
          const total = items.length + showContracts.length;

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== status) setOverCol(status);
              }}
              onDragLeave={() => setOverCol((prev) => (prev === status ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/lead-id');
                if (id) handleDrop(status, id);
              }}
              className={cn(
                'w-72 shrink-0 rounded-xl border bg-card/40 backdrop-blur-sm transition',
                isOver ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/40' : 'border-border/60',
              )}
            >
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-xl">
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', columnAccent[status])} />
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.color.replace('/15', '').replace('bg-', 'bg-').split(' ')[0])} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                    {total}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-320px)] overflow-y-auto">
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/lead-id', lead.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingId(lead.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onOpenLead(lead)}
                    className={cn(
                      'group rounded-lg border bg-background/70 border-border/60 p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition',
                      draggingId === lead.id && 'opacity-40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{lead.name}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1 truncate">
                              <Phone className="h-3 w-3 shrink-0" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    </div>

                    {/* Badges */}
                    {lead.status === 'cliente' && (lead.sale_package || lead.sale_amount) && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/15 text-green-400 border border-green-500/30">
                        {lead.sale_package || 'Venta'}
                        {lead.sale_amount
                          ? ` · ${lead.sale_currency === 'CRC' ? '₡' : '$'}${Number(lead.sale_amount).toLocaleString('en-US')}`
                          : ''}
                      </div>
                    )}
                    {lead.status === 'perdido' && lead.lost_reason && (
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-400 border border-red-500/30">
                        {getLostReasonLabel(lead.lost_reason)}
                      </div>
                    )}
                    {lead.notes && (
                      <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
                        {lead.notes}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-muted-foreground/70">
                      {format(parseISO(lead.created_at), 'd MMM', { locale: es })}
                    </div>
                  </div>
                ))}

                {/* Synthetic contract clients (not draggable) */}
                {showContracts.map((c) => (
                  <div
                    key={`contract-${c.name}`}
                    className="rounded-lg border border-green-500/30 bg-green-500/5 p-3"
                    title="Cliente activo (desde Contratos)"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      <div className="font-medium text-sm truncate">{c.name}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {c.seller_name ? `Vendedor: ${c.seller_name}` : 'Contrato activo'}
                    </div>
                    {c.start_date && (
                      <div className="mt-1 text-[10px] text-muted-foreground/70">
                        Desde {format(parseISO(c.start_date), 'd MMM yyyy', { locale: es })}
                      </div>
                    )}
                  </div>
                ))}

                {total === 0 && (
                  <div className="text-center text-[11px] text-muted-foreground/60 py-6 border border-dashed border-border/50 rounded-lg">
                    Arrastrá una tarjeta acá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
