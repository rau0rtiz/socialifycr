import { Client } from '@/pages/Clientes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Eye, ExternalLink, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useAllSubscriptions, useSubscriptionPlans } from '@/hooks/use-billing';

type ViewMode = 'list' | 'grid';

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  onSelectClient: (client: Client) => void;
  selectedClientId?: string;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientsTable = ({
  clients,
  loading,
  onSelectClient,
  selectedClientId,
  onEditClient,
  onDeleteClient,
}: ClientsTableProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { data: subscriptions = [] } = useAllSubscriptions();
  const { data: plans = [] } = useSubscriptionPlans();

  const clientPlanMap = useMemo(() => {
    const map: Record<string, { planName: string; status: string }> = {};
    for (const sub of subscriptions) {
      const plan = plans.find(p => p.id === sub.plan_id);
      if (plan) {
        map[sub.client_id] = { planName: plan.name, status: sub.status };
      }
    }
    return map;
  }, [subscriptions, plans]);

  const handlePreviewDashboard = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/?preview=${client.id}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Lista de Clientes</CardTitle>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-40 w-full rounded-xl' : 'h-12 w-full'} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay clientes aún.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer cliente para comenzar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Clientes ({clients.length})</CardTitle>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </CardHeader>
      <CardContent>
        {viewMode === 'list' ? (
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Industria</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedClientId === client.id && 'bg-accent'
                  )}
                  onClick={() => onSelectClient(client)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ClientAvatar client={client} size="sm" />
                      <span className="font-medium">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.industry ? (
                      <Badge variant="secondary">{client.industry}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PlanBadge info={clientPlanMap[client.id]} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <ClientActions
                      client={client}
                      onPreview={handlePreviewDashboard}
                      onSelect={onSelectClient}
                      onEdit={onEditClient}
                      onDelete={onDeleteClient}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={cn(
                  'group relative rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                  selectedClientId === client.id && 'border-primary bg-primary/5 shadow-md'
                )}
              >
                {/* Gradient accent bar */}
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                  style={{
                    background: `linear-gradient(90deg, hsl(${client.primary_color}) 0%, hsl(${client.accent_color}) 100%)`
                  }}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ClientAvatar client={client} size="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{client.name}</p>
                      {client.industry && (
                        <Badge variant="secondary" className="mt-1 text-xs">{client.industry}</Badge>
                      )}
                    </div>
                  </div>
                  <ClientActions
                    client={client}
                    onPreview={handlePreviewDashboard}
                    onSelect={onSelectClient}
                    onEdit={onEditClient}
                    onDelete={onDeleteClient}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Creado {new Date(client.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex gap-1.5">
                    <div
                      className="h-4 w-4 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: `hsl(${client.primary_color})` }}
                      title="Primario"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: `hsl(${client.accent_color})` }}
                      title="Acento"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Sub-components ---

const ViewToggle = ({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) => (
  <div className="flex items-center rounded-lg border border-border p-0.5">
    <Button
      variant={value === 'grid' ? 'secondary' : 'ghost'}
      size="icon"
      className="h-7 w-7"
      onClick={() => onChange('grid')}
    >
      <LayoutGrid className="h-3.5 w-3.5" />
    </Button>
    <Button
      variant={value === 'list' ? 'secondary' : 'ghost'}
      size="icon"
      className="h-7 w-7"
      onClick={() => onChange('list')}
    >
      <List className="h-3.5 w-3.5" />
    </Button>
  </div>
);

const ClientAvatar = ({ client, size = 'sm' }: { client: Client; size?: 'sm' | 'lg' }) => {
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  const textSize = size === 'lg' ? 'text-lg' : 'text-sm';

  return client.logo_url ? (
    <img
      src={client.logo_url}
      alt={client.name}
      className={cn(dim, 'rounded-lg object-contain')}
    />
  ) : (
    <div
      className={cn(dim, 'rounded-lg flex items-center justify-center text-primary-foreground font-bold', textSize)}
      style={{ backgroundColor: `hsl(${client.accent_color})` }}
    >
      {client.name.charAt(0)}
    </div>
  );
};

const ClientActions = ({
  client,
  onPreview,
  onSelect,
  onEdit,
  onDelete,
}: {
  client: Client;
  onPreview: (c: Client, e: React.MouseEvent) => void;
  onSelect: (c: Client) => void;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(client); }}>
        <Eye className="h-4 w-4 mr-2" />
        Ver detalles
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
        <Pencil className="h-4 w-4 mr-2" />
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Eliminar
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
