import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, UserPlus, Mail, Phone, Loader2 } from 'lucide-react';
import {
  AgencyCrmLead,
  CRM_STATUS_OPTIONS,
  getStatusMeta,
  useAgencyCrmLeads,
} from '@/hooks/use-agency-crm-leads';
import { CrmLeadDialog } from '@/components/agency-crm/CrmLeadDialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const AgencyCRM = () => {
  const { leads, isLoading, updateLead } = useAgencyCrmLeads();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyCrmLead | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: leads.length };
    CRM_STATUS_OPTIONS.forEach((s) => (map[s.value] = 0));
    leads.forEach((l) => {
      map[l.status] = (map[l.status] || 0) + 1;
    });
    return map;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (lead: AgencyCrmLead) => {
    setEditing(lead);
    setDialogOpen(true);
  };

  const quickChangeStatus = async (lead: AgencyCrmLead, status: string) => {
    if (status === lead.status) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, patch: { status: status as any } });
      toast({ title: 'Estado actualizado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-7 w-7 text-primary" /> CRM Agencia
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registra y gestiona los leads de la agencia.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo lead
          </Button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs border transition',
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/40 border-border hover:bg-muted',
            )}
          >
            Todos · {counts.all}
          </button>
          {CRM_STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition',
                statusFilter === s.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 border-border hover:bg-muted',
              )}
            >
              {s.label} · {counts[s.value] || 0}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {leads.length === 0 ? 'Aún no hay leads. Crea el primero.' : 'No hay resultados con esos filtros.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Nombre</th>
                    <th className="text-left px-4 py-2">Contacto</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Notas</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const meta = getStatusMeta(lead.status);
                    return (
                      <tr
                        key={lead.id}
                        className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => openEdit(lead)}
                      >
                        <td className="px-4 py-3 font-medium">{lead.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex flex-col gap-0.5">
                            {lead.email && (
                              <span className="flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3" /> {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </span>
                            )}
                            {!lead.email && !lead.phone && <span className="text-xs opacity-50">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(v) => quickChangeStatus(lead, v)}
                          >
                            <SelectTrigger className={cn('h-7 w-auto min-w-[140px] border text-xs', meta.color)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground max-w-[280px] truncate">
                          {lead.notes || '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                          {format(parseISO(lead.created_at), "d MMM yyyy", { locale: es })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <CrmLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />
      </div>
    </DashboardLayout>
  );
};

export default AgencyCRM;
