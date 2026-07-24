import { useState } from 'react';
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

const AgencyCRM = () => {
  const { leads, isLoading } = useAgencyCrmLeads();
  const { data: contractClients = [], isLoading: loadingContracts } = useContractClients();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyCrmLead | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (lead: AgencyCrmLead) => {
    setEditing(lead);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" /> CRM Agencia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline de prospectos y clientes. Arrastrá tarjetas entre columnas para cambiar de estado.
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
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, correo o teléfono..."
                  className="pl-9"
                />
              </div>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo lead
              </Button>
            </div>

            {isLoading || loadingContracts ? (
              <div className="p-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando pipeline...
              </div>
            ) : (
              <CrmKanban
                leads={leads}
                contractClients={contractClients}
                search={search}
                onOpenLead={openEdit}
              />
            )}
          </TabsContent>
        </Tabs>

        <CrmLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />
      </div>
    </DashboardLayout>
  );
};

export default AgencyCRM;
