import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ClientsTable } from '@/components/clientes/ClientsTable';
import { ClientFormDialog } from '@/components/clientes/ClientFormDialog';
import { ClientDetailPanel } from '@/components/clientes/ClientDetailPanel';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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

  const handleDeleteClient = async (clientId: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cliente eliminado',
        description: 'El cliente ha sido eliminado correctamente.',
      });
      fetchClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gestiona tus clientes, conexiones de plataformas y equipo</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <ClientsTable
              clients={clients}
              loading={loading}
              onSelectClient={setSelectedClient}
              selectedClientId={selectedClient?.id}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
            />
          </div>

          {selectedClient && (
            <div className="lg:col-span-1">
              <ClientDetailPanel
                client={selectedClient}
                onClose={() => setSelectedClient(null)}
                onUpdate={fetchClients}
              />
            </div>
          )}
        </div>
      </div>

      <ClientFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleClientCreated}
        client={editingClient}
      />
    </DashboardLayout>
  );
};

export default Clientes;
