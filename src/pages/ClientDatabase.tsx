import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Users, Phone, Mail, Calendar, DollarSign, Filter, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type LeadRecord = {
  id: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  source: string | null;
  status: string;
  setter_name: string | null;
  product: string | null;
  appointment_date: string;
  created_at: string | null;
  notes: string | null;
  not_sold_reason: string | null;
  estimated_value: number | null;
  currency: string;
  ad_campaign_name: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  sold: 'Vendido',
  not_sold: 'No vendido',
  no_show: 'No se presentó',
  rescheduled: 'Reagendado',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-200',
  sold: 'bg-green-500/10 text-green-700 border-green-200',
  not_sold: 'bg-red-500/10 text-red-600 border-red-200',
  no_show: 'bg-orange-500/10 text-orange-600 border-orange-200',
  rescheduled: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
};

const ClientDatabase = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id ?? null;
  const isSpkUp = selectedClient?.name?.toLowerCase().includes('speak up');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<LeadRecord | null>(null);

  // Fetch ALL leads for this client (no date filter)
  const { data: allLeads = [] } = useQuery<LeadRecord[]>({
    queryKey: ['client-database-leads', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('setter_appointments')
        .select('id, lead_name, lead_phone, lead_email, source, status, setter_name, product, appointment_date, created_at, notes, not_sold_reason, estimated_value, currency, ad_campaign_name')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRecord[];
    },
    enabled: !!clientId,
  });

  // Unique sources for filter
  const sources = useMemo(() => {
    const set = new Set(allLeads.map(l => l.source).filter(Boolean));
    return Array.from(set) as string[];
  }, [allLeads]);

  // Filtered leads
  const filtered = useMemo(() => {
    return allLeads.filter(lead => {
      const matchSearch = !search || 
        lead.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.lead_phone && lead.lead_phone.includes(search)) ||
        (lead.lead_email && lead.lead_email.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchSource = sourceFilter === 'all' || lead.source === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [allLeads, search, statusFilter, sourceFilter]);

  // Stats
  const totalLeads = allLeads.length;
  const soldCount = allLeads.filter(l => l.status === 'sold').length;
  const activeCount = allLeads.filter(l => ['scheduled', 'confirmed', 'rescheduled'].includes(l.status)).length;

  const handleDeleteLead = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('setter_appointments').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el lead', variant: 'destructive' });
    } else {
      toast({ title: 'Lead eliminado' });
      queryClient.invalidateQueries({ queryKey: ['client-database-leads', clientId] });
    }
    setDeleteTarget(null);
  };

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle className="text-lg">Selecciona un cliente</CardTitle>
              <p className="text-sm text-muted-foreground">Selecciona un cliente para ver su base de datos de leads.</p>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">{isSpkUp ? 'Student Database' : 'Client Database'}</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{soldCount}</p>
                <p className="text-xs text-muted-foreground">Vendidos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  {sources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Contacto</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Fuente</TableHead>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs w-[50px]"></TableHead>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron leads
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(lead => (
                      <TableRow key={lead.id} className="text-xs">
                        <TableCell className="font-medium">{lead.lead_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {lead.lead_phone && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />{lead.lead_phone}
                              </span>
                            )}
                            {lead.lead_email && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />{lead.lead_email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[lead.status] || ''}`}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{lead.source || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.setter_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yy', { locale: es }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(lead)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                Mostrando {filtered.length} de {totalLeads} leads
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lead</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteTarget?.lead_name}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ClientDatabase;
