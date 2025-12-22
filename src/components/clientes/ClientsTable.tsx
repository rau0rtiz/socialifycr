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
import { MoreHorizontal, Pencil, Trash2, Eye, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

  const handlePreviewDashboard = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to dashboard with preview mode and client ID
    navigate(`/?preview=${client.id}`);
  };
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
      <CardHeader>
        <CardTitle>Lista de Clientes ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Industria</TableHead>
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
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="h-8 w-8 rounded-lg object-contain"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm"
                        style={{ backgroundColor: `hsl(${client.accent_color})` }}
                      >
                        {client.name.charAt(0)}
                      </div>
                    )}
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
                <TableCell className="text-muted-foreground">
                  {new Date(client.created_at).toLocaleDateString('es-ES')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handlePreviewDashboard(client, e)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectClient(client); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditClient(client); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDeleteClient(client.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
