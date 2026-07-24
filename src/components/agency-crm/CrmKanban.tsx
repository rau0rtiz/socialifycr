import { useMemo, useState } from 'react';
import {
  AgencyCrmLead,
  AgencyCrmStatus,
  CRM_STATUS_OPTIONS,
  getLostReasonLabel,
  useAgencyCrmLeads,
} from '@/hooks/use-agency-crm-leads';
import { Mail, Phone, GripVertical, User } from 'lucide-react';
import { useInternalTeam } from '@/hooks/use-internal-team';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  leads: AgencyCrmLead[];
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

export const CrmKanban = ({ leads, search, onOpenLead }: Props) => {
  const { data: team = [] } = useInternalTeam();
  const teamById = useMemo(() => {
    const m = new Map<string, InternalTeamMember>();
    team.forEach((t) => m.set(t.id, t));
    return m;
  }, [team]);
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
          const total = items.length;

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
                'w-72 shrink-0 rounded-xl border bg-white/[0.03] backdrop-blur-sm transition',
                isOver ? 'border-primary/70 bg-primary/10 ring-2 ring-primary/50' : 'border-white/15',
              )}
            >
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-xl border-b border-white/10">
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', columnAccent[status])} />
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.color.replace('/15', '').replace('bg-', 'bg-').split(' ')[0])} />
                    <span className="text-sm font-semibold text-white tracking-wide uppercase">{col.label}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white font-semibold">
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
                      'group rounded-lg border bg-white/[0.06] border-white/15 p-3 cursor-grab active:cursor-grabbing hover:border-primary/60 hover:bg-white/[0.09] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3)] transition',
                      draggingId === lead.id && 'opacity-40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate text-white">{lead.name}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-white/70">
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0 text-white/50" /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1 truncate">
                              <Phone className="h-3 w-3 shrink-0 text-white/50" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-white/30 shrink-0 mt-0.5 group-hover:text-white/60" />
                    </div>

                    {/* Badges */}
                    {lead.status === 'cliente' && (lead.sale_package || lead.sale_amount) && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 border border-green-500/40 font-medium">
                        {lead.sale_package || 'Venta'}
                        {lead.sale_amount
                          ? ` · ${lead.sale_currency === 'CRC' ? '₡' : '$'}${Number(lead.sale_amount).toLocaleString('en-US')}`
                          : ''}
                      </div>
                    )}
                    {lead.status === 'perdido' && lead.lost_reason && (
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 font-medium">
                        {getLostReasonLabel(lead.lost_reason)}
                      </div>
                    )}
                    {lead.assigned_to && teamById.get(lead.assigned_to) && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/15 text-primary border border-primary/40 font-medium">
                        <User className="h-3 w-3" /> {teamById.get(lead.assigned_to)}
                      </div>
                    )}
                    {lead.notes && (
                      <div className="mt-2 text-[11px] text-white/60 line-clamp-2">
                        {lead.notes}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-white/40 uppercase tracking-wider">
                      {format(parseISO(lead.created_at), 'd MMM', { locale: es })}
                    </div>
                  </div>
                ))}

                {total === 0 && (
                  <div className="text-center text-[11px] text-white/40 py-6 border border-dashed border-white/15 rounded-lg">
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
