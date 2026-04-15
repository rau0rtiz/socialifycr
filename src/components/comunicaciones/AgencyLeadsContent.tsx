import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Calendar, CheckCircle2, XCircle, ArrowLeft, Users, ExternalLink, Megaphone, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';

const levelNames = ['', 'Idea', 'Startup', 'Growing', 'Scaling', 'Established', 'Empire'];
const levelColors: Record<number, string> = {
  1: '#94a3b8', 2: '#3b82f6', 3: '#22c55e', 4: '#FF6B35', 5: '#8b5cf6', 6: '#ef4444',
};

const AgencyLeadsContent = () => {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch funnels
  const { data: funnels = [] } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch lead counts per funnel
  const { data: leadCounts = {} } = useQuery({
    queryKey: ['funnel-lead-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_leads')
        .select('funnel_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((l: any) => {
        const key = l.funnel_id || 'unassigned';
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch leads for selected funnel
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['funnel-leads', selectedFunnelId],
    queryFn: async () => {
      let query = supabase
        .from('funnel_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (selectedFunnelId) {
        query = query.eq('funnel_id', selectedFunnelId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFunnelId,
  });

  const filtered = leads.filter((l) => {
    const matchesSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || l.business_level === Number(levelFilter);
    return matchesSearch && matchesLevel;
  });

  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'Nivel', 'Industria', 'Ingresos', 'Calendly', 'Fecha'];
    const rows = filtered.map((l) => [
      l.name, l.email, `${l.business_level} - ${levelNames[l.business_level]}`,
      l.industry || '', l.revenue_range || '',
      l.calendly_clicked ? 'Sí' : 'No',
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-funnel-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('funnel_leads')
        .delete()
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: `${selectedIds.size} lead(s) eliminado(s)` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-lead-counts'] });
    } catch (e: any) {
      toast({ title: 'Error al eliminar', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const selectedFunnel = funnels.find((f: any) => f.id === selectedFunnelId);
  if (!selectedFunnelId) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel: any) => (
            <Card
              key={funnel.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSelectedFunnelId(funnel.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={funnel.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {funnel.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {funnel.name}
                </h3>
                {funnel.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{funnel.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{(leadCounts as any)[funnel.id] || 0} leads</span>
                  </div>
                  {funnel.public_path && (
                    <a
                      href={funnel.public_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {funnels.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay funnels creados
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Leads Drill-down View ───
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedFunnelId(null); setSearch(''); setLevelFilter('all'); setSelectedIds(new Set()); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">{selectedFunnel?.name}</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Eliminar ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {[1,2,3,4,5,6].map((n) => (
              <SelectItem key={n} value={String(n)}>Nivel {n}: {levelNames[n]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Industria</TableHead>
              <TableHead>Calendly</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay leads</TableCell></TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{ borderColor: levelColors[lead.business_level], color: levelColors[lead.business_level] }}>
                      {lead.business_level} · {levelNames[lead.business_level]}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{lead.industry || '—'}</TableCell>
                  <TableCell>
                    {lead.calendly_clicked ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedLead?.name}</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{selectedLead.email}</p></div>
                <div><span className="text-muted-foreground">Teléfono:</span><p className="font-medium">{selectedLead.phone || '—'}</p></div>
                <div>
                  <span className="text-muted-foreground">Nivel:</span>
                  <p className="font-medium" style={{ color: levelColors[selectedLead.business_level] }}>
                    {selectedLead.business_level} · {levelNames[selectedLead.business_level]}
                  </p>
                </div>
                <div><span className="text-muted-foreground">Industria:</span><p className="font-medium capitalize">{selectedLead.industry || '—'}</p></div>
                <div><span className="text-muted-foreground">Ingresos:</span><p className="font-medium">{selectedLead.revenue_range || '—'}</p></div>
                <div>
                  <span className="text-muted-foreground">Calendly:</span>
                  <p className="font-medium">{selectedLead.calendly_clicked ? '✅ Sí' : '❌ No'}</p>
                </div>
              </div>
              {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Respuestas:</span>
                  <div className="mt-1 rounded-lg bg-muted p-3 space-y-1">
                    {Object.entries(selectedLead.answers as Record<string, string>).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(selectedLead.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los leads seleccionados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgencyLeadsContent;
