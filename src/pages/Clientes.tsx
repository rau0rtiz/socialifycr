import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ClientsTable } from '@/components/clientes/ClientsTable';
import { ClientFormDialog } from '@/components/clientes/ClientFormDialog';
import { ClientDetailDialog } from '@/components/clientes/ClientDetailDialog';
import { DeleteConfirmDialog } from '@/components/clientes/DeleteConfirmDialog';
import { ClientBrandSettings } from '@/components/clientes/ClientBrandSettings';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/use-audit-log';

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

const Clientes = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes.',
        variant: 'destructive',
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientCreated = () => {
    fetchClients();
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleRequestDelete = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientToDelete(client);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientToDelete.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente.',
        variant: 'destructive',
      });
    } else {
      await logAction({
        action: 'client.delete',
        entityType: 'client',
        entityId: clientToDelete.id,
        entityName: clientToDelete.name,
        details: {
          industry: clientToDelete.industry,
          deleted_at: new Date().toISOString(),
        },
      });

      toast({
        title: 'Cliente eliminado',
        description: 'El cliente ha sido eliminado correctamente.',
      });
      fetchClients();
      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null);
      }
    }
    setClientToDelete(null);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gestiona tus clientes, conexiones y configuración de marca</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="brand" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Marca</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <ClientsTable
              clients={clients}
              loading={loading}
              onSelectClient={setSelectedClient}
              selectedClientId={selectedClient?.id}
              onEditClient={handleEditClient}
              onDeleteClient={handleRequestDelete}
            />
          </TabsContent>

          <TabsContent value="brand">
            <ClientBrandSettings clients={clients} loading={loading} />
          </TabsContent>
        </Tabs>

        <ClientDetailDialog
          client={selectedClient}
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          onUpdate={fetchClients}
        />

        <ClientFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={handleClientCreated}
          client={editingClient}
        />

        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          clientName={clientToDelete?.name || ''}
          onConfirm={handleDeleteClient}
        />
      </div>
    </DashboardLayout>
  );
};

export default Clientes;
