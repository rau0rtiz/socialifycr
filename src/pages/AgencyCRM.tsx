import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, UserPlus, Loader2, Wallet, KanbanSquare, Users } from 'lucide-react';
import {
  AgencyCrmLead,
  useAgencyCrmLeads,
} from '@/hooks/use-agency-crm-leads';
import { CrmLeadDialog } from '@/components/agency-crm/CrmLeadDialog';
import { CrmKanban } from '@/components/agency-crm/CrmKanban';
import { SellerCommissionsView } from '@/components/agency-crm/SellerCommissionsView';
import { ClientsView } from '@/components/agency-crm/ClientsView';


interface ContractClient {
  name: string;
  seller_name: string | null;
  start_date: string | null;
}

const useContractClients = () => {
  return useQuery({
    queryKey: ['agency-contract-clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_contracts')
        .select('customer_name, seller_name, start_date')
        .order('start_date', { ascending: false });
      if (error) throw error;
      const map = new Map<string, ContractClient>();
      for (const row of (data || []) as any[]) {
        const name = (row.customer_name || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name, seller_name: row.seller_name, start_date: row.start_date });
        }
      }
      return Array.from(map.values());
    },
    staleTime: 5 * 60 * 1000,
  });
};

type LeadRow = { kind: 'lead'; lead: AgencyCrmLead };
type ContractRow = { kind: 'contract'; client: ContractClient };
type Row = LeadRow | ContractRow;

const AgencyCRM = () => {
  const { leads, isLoading, updateLead } = useAgencyCrmLeads();
  const { data: contractClients = [], isLoading: loadingContracts } = useContractClients();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyCrmLead | null>(null);

  // Synthetic rows for contract clients that aren't already in agency_crm_leads
  const syntheticContractRows = useMemo<ContractRow[]>(() => {
    const leadNames = new Set(leads.map((l) => l.name.trim().toLowerCase()));
    return contractClients
      .filter((c) => !leadNames.has(c.name.toLowerCase()))
      .map((c) => ({ kind: 'contract' as const, client: c }));
  }, [leads, contractClients]);

  const allRows = useMemo<Row[]>(
    () => [
      ...leads.map<LeadRow>((l) => ({ kind: 'lead', lead: l })),
      ...syntheticContractRows,
    ],
    [leads, syntheticContractRows],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: allRows.length };
    CRM_STATUS_OPTIONS.forEach((s) => (map[s.value] = 0));
    allRows.forEach((r) => {
      const status = r.kind === 'lead' ? r.lead.status : 'cliente';
      map[status] = (map[status] || 0) + 1;
    });
    return map;
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const status = r.kind === 'lead' ? r.lead.status : 'cliente';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      if (r.kind === 'lead') {
        const l = r.lead;
        return (
          l.name.toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q)
        );
      }
      return r.client.name.toLowerCase().includes(q);
    });
  }, [allRows, search, statusFilter]);


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
      await updateLead.mutateAsync({ id: lead.id, patch: { status: status as any }, prevStatus: lead.status });
      toast({ title: 'Estado actualizado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" /> CRM Agencia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comisiones de Lucía sobre cobros reales y registro de prospectos.
          </p>
        </div>

        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pipeline">
              <KanbanSquare className="h-4 w-4 mr-1" /> Prospección
            </TabsTrigger>
            <TabsTrigger value="clientes">
              <Users className="h-4 w-4 mr-1" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="comisiones">
              <Wallet className="h-4 w-4 mr-1" /> Comisiones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <ClientsView />
          </TabsContent>

          <TabsContent value="comisiones">
            <SellerCommissionsView />
          </TabsContent>
          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Registro de leads y prospectos antes de convertirse en clientes.
              </p>
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
              {isLoading || loadingContracts ? (
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
                      {filtered.map((row) => {
                        if (row.kind === 'contract') {
                          const c = row.client;
                          return (
                            <tr
                              key={`contract-${c.name}`}
                              className="border-t border-border/50 hover:bg-muted/30"
                            >
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-2">
                                  {c.name}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/15 text-green-400 border border-green-500/30">
                                    <CheckCircle2 className="h-3 w-3" /> Ya es cliente
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <span className="text-xs opacity-60">—</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn('inline-flex h-7 items-center px-3 rounded-md border text-xs', 'bg-green-500/15 text-green-400 border-green-500/30')}>
                                  Cliente
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground max-w-[280px]">
                                <span className="opacity-70">
                                  {c.seller_name ? `Vendedor: ${c.seller_name}` : 'Contrato activo en Clientes'}
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                                {c.start_date ? format(parseISO(c.start_date), 'd MMM yyyy', { locale: es }) : '—'}
                              </td>
                            </tr>
                          );
                        }
                        const lead = row.lead;
                        const meta = getStatusMeta(lead.status);
                        const isClient = lead.status === 'cliente';
                        return (
                          <tr
                            key={lead.id}
                            className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                            onClick={() => openEdit(lead)}
                          >
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                {lead.name}
                                {isClient && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/15 text-green-400 border border-green-500/30">
                                    <CheckCircle2 className="h-3 w-3" /> Ya es cliente
                                  </span>
                                )}
                              </div>
                            </td>
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
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground max-w-[280px]">
                              <div className="flex flex-col gap-1">
                                {lead.status === 'cliente' && (lead.sale_package || lead.sale_amount) && (
                                  <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[11px] bg-green-500/15 text-green-400 border border-green-500/30">
                                    {lead.sale_package || 'Venta'}
                                    {lead.sale_amount ? ` · ${lead.sale_currency === 'CRC' ? '₡' : '$'}${Number(lead.sale_amount).toLocaleString('en-US')}` : ''}
                                  </span>
                                )}
                                {lead.status === 'perdido' && lead.lost_reason && (
                                  <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[11px] bg-red-500/15 text-red-400 border border-red-500/30">
                                    {getLostReasonLabel(lead.lost_reason)}
                                  </span>
                                )}
                                <span className="truncate">{lead.notes || (lead.status === 'cliente' || lead.status === 'perdido' ? '' : '—')}</span>
                              </div>
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
          </TabsContent>
        </Tabs>

        <CrmLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />
      </div>
    </DashboardLayout>
  );
};

export default AgencyCRM;
