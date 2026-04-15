import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const levelNames = ['', 'Idea', 'Startup', 'Growing', 'Scaling', 'Established', 'Empire'];
const levelColors: Record<number, string> = {
  1: '#94a3b8', 2: '#3b82f6', 3: '#22c55e', 4: '#FF6B35', 5: '#8b5cf6', 6: '#ef4444',
};

const AgencyLeadsContent = () => {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['funnel-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{filtered.length} leads registrados</p>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
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
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay leads</TableCell></TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id}>
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
    </div>
  );
};

export default AgencyLeadsContent;
