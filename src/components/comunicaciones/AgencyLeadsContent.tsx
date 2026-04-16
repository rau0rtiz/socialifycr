import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Calendar, CheckCircle2, ArrowLeft, Users, ExternalLink, Megaphone, Trash2, Mail, TrendingUp, BarChart3 } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import { SendCampaignDialog } from './SendCampaignDialog';
import { useEmailTemplates } from '@/hooks/use-email-templates';

const levelNames = ['', 'Idea', 'Startup', 'Growing', 'Scaling', 'Established', 'Empire'];
const levelColors: Record<number, string> = {
  1: '#94a3b8', 2: '#3b82f6', 3: '#22c55e', 4: '#FF6B35', 5: '#8b5cf6', 6: '#ef4444',
};

// Maps for translating stored answer keys to human-readable labels
const answerLabels: Record<string, Record<string, string>> = {
  industria: {
    retail: 'Retail / Tienda física o en línea',
    restaurante: 'Restaurante / Comida',
    salud: 'Salud y bienestar',
    servicios: 'Servicios profesionales',
    educacion: 'Educación / Cursos',
    otro: 'Otro',
  },
  ingresos: {
    menos1k: 'Menos de $1,000',
    '1k5k': '$1,000 – $5,000',
    '5k15k': '$5,000 – $15,000',
    '15k50k': '$15,000 – $50,000',
    mas50k: 'Más de $50,000',
  },
  presencia: {
    nada: 'No tengo presencia todavía',
    perfil_inactivo: 'Tengo perfil pero no publico',
    poco: 'Publico 1 a 2 veces por semana',
    consistente: 'Publico 3 a 5 veces por semana',
    diario: 'Publico todos los días',
  },
  pauta: {
    nada: 'No invierto nada',
    intente: 'Lo intenté pero lo dejé',
    menos200: 'Menos de $200 al mes',
    '200_500': '$200 – $500 al mes',
    '500_1000': '$500 – $1,000 al mes',
    '1000_2000': '$1,000 – $2,000 al mes',
    mas2000: 'Más de $2,000 al mes',
  },
  canalVentas: {
    local: 'En persona / local físico',
    mensajes: 'WhatsApp / Instagram / Facebook',
    web: 'Página web / tienda en línea',
    outbound: 'Contacto frío / outbound',
    marketplace: 'Marketplace (Uber Eats, Amazon, etc.)',
    puntos_venta: 'Puntos de venta externos',
    otro: 'Otro',
  },
  objetivo: {
    awareness: 'Que más gente conozca mi producto',
    nuevos_clientes: 'Conseguir más clientes nuevos',
    retencion: 'Venderle más a quienes ya compraron',
    lanzamiento: 'Lanzar un nuevo producto',
    marca: 'Construir una marca reconocida',
  },
};

const answerQuestions: Record<string, string> = {
  industria: '¿En qué industria está tu negocio?',
  ingresos: '¿Cuánto factura tu negocio al mes?',
  presencia: '¿Cómo es tu presencia en redes?',
  pauta: '¿Cuánto invertís en publicidad pagada?',
  canalVentas: '¿Cuál es tu principal canal de ventas?',
  objetivo: '¿Cuál es tu objetivo principal?',
};

const getAnswerLabel = (key: string, value: string): string => {
  return answerLabels[key]?.[value] || value;
};

const AgencyLeadsContent = () => {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailLead, setEmailLead] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: emailTemplates = [] } = useEmailTemplates();

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

  const handleDeleteLead = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('funnel_leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Lead eliminado' });
      setSelectedLead(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-lead-counts'] });
    } catch (e: any) {
      toast({ title: 'Error al eliminar', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // Find outbound template
  const outboundTemplate = emailTemplates.find(t => t.slug === 'outbound-funnel-roadmap');

  // ─── KPI Metrics (computed from leads array) ───
  const kpiMetrics = useMemo(() => {
    const now = new Date();
    const d7 = subDays(now, 7);
    const d14 = subDays(now, 14);

    const last7 = leads.filter(l => isAfter(new Date(l.created_at), d7)).length;
    const prev7 = leads.filter(l => {
      const d = new Date(l.created_at);
      return isAfter(d, d14) && !isAfter(d, d7);
    }).length;
    const growthDelta = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

    const qualifiedCount = leads.filter(l => l.business_level >= 4).length;
    const qualifiedRate = leads.length > 0 ? Math.round((qualifiedCount / leads.length) * 100) : 0;

    const levelDist: Record<number, number> = {};
    leads.forEach(l => { levelDist[l.business_level] = (levelDist[l.business_level] || 0) + 1; });

    return { total: leads.length, last7, growthDelta, qualifiedRate, qualifiedCount, levelDist };
  }, [leads]);

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
          <Button variant="ghost" size="icon" onClick={() => { setSelectedFunnelId(null); setSearch(''); setLevelFilter('all'); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">{selectedFunnel?.name}</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Leads */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{kpiMetrics.total}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 7 days */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold text-foreground">{kpiMetrics.last7}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${kpiMetrics.growthDelta >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                    {kpiMetrics.growthDelta >= 0 ? '+' : ''}{kpiMetrics.growthDelta}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Últimos 7 días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualified Rate (Level 4+) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{kpiMetrics.qualifiedRate}%</p>
                <p className="text-xs text-muted-foreground">Calificados ({kpiMetrics.qualifiedCount})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level Distribution — Pie Chart */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground">Distribución</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mini SVG Pie Chart */}
              <svg viewBox="0 0 32 32" className="h-12 w-12 shrink-0" style={{ transform: 'rotate(-90deg)' }}>
                {(() => {
                  let cumulative = 0;
                  return [1,2,3,4,5,6].map(level => {
                    const count = kpiMetrics.levelDist[level] || 0;
                    const pct = kpiMetrics.total > 0 ? count / kpiMetrics.total : 0;
                    if (pct === 0) return null;
                    const dashArray = pct * 100;
                    const dashOffset = -cumulative * 100;
                    cumulative += pct;
                    return (
                      <circle
                        key={level}
                        cx="16" cy="16" r="15.9155"
                        fill="none"
                        stroke={levelColors[level]}
                        strokeWidth="3.5"
                        strokeDasharray={`${dashArray} ${100 - dashArray}`}
                        strokeDashoffset={dashOffset}
                        className="transition-all"
                      />
                    );
                  });
                })()}
              </svg>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {[1,2,3,4,5,6].map(level => {
                  const count = kpiMetrics.levelDist[level] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={level} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: levelColors[level] }} />
                      <span className="text-[10px] text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
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

      {leadsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-36" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay leads</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((lead) => {
            const utmData = (lead.answers as any)?.utm_source || (lead.answers as any)?.utm_campaign;
            return (
              <Card
                key={lead.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all relative"
                onClick={() => setSelectedLead(lead)}
              >
                <CardContent className="p-4 space-y-2">
                  {/* Mail button top-right */}
                  <div className="absolute top-2.5 right-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmailLead(lead);
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Name + Level */}
                  <div className="flex items-center gap-2.5 pr-8">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: levelColors[lead.business_level] }}
                    >
                      {lead.business_level}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                      {(lead.answers as any)?.businessHandle && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">{(lead.answers as any).businessHandle}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: levelColors[lead.business_level], color: levelColors[lead.business_level] }}>
                      {levelNames[lead.business_level]}
                    </Badge>
                    {lead.industry && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{lead.industry}</Badge>
                    )}
                    {lead.calendly_clicked && (
                      <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30" variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Calendly
                      </Badge>
                    )}
                    {utmData && (
                      <Badge variant="outline" className="text-[10px] border-purple-400/40 text-purple-500">
                        UTM
                      </Badge>
                    )}
                  </div>

                  {/* Revenue + date */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>{lead.revenue_range ? answerLabels.ingresos?.[lead.revenue_range] || lead.revenue_range : '—'}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(lead.created_at), 'dd MMM', { locale: es })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lead detail dialog */}
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
                {(selectedLead.answers as any)?.businessHandle && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Negocio:</span>
                    <p className="font-medium">{(selectedLead.answers as any).businessHandle}</p>
                  </div>
                )}
              </div>
              {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">Respuestas del quiz:</span>
                  <div className="mt-2 space-y-3">
                    {(['industria', 'ingresos', 'presencia', 'pauta', 'canalVentas', 'objetivo'] as const)
                      .filter(key => (selectedLead.answers as Record<string, string>)[key])
                      .map((key) => (
                        <div key={key} className="rounded-lg bg-muted p-3">
                          <p className="text-xs text-muted-foreground mb-1">{answerQuestions[key] || key}</p>
                          <p className="font-medium text-sm">{getAnswerLabel(key, (selectedLead.answers as Record<string, string>)[key])}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {/* UTM Data */}
              {selectedLead.answers && (
                (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const)
                  .some(k => (selectedLead.answers as Record<string, string>)[k])
              ) && (
                <div>
                  <span className="text-muted-foreground font-medium">Atribución (UTMs):</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const)
                      .filter(k => (selectedLead.answers as Record<string, string>)[k])
                      .map(k => (
                        <div key={k} className="rounded-lg bg-purple-500/10 p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.replace('utm_', '')}</p>
                          <p className="font-medium text-xs mt-0.5">{(selectedLead.answers as Record<string, string>)[k]}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(selectedLead.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </div>

              {/* Delete button */}
              <div className="pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El lead será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLead && handleDeleteLead(selectedLead.id)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Outbound email dialog */}
      {emailLead && outboundTemplate && (
        <SendCampaignDialog
          open={!!emailLead}
          onOpenChange={(open) => !open && setEmailLead(null)}
          template={outboundTemplate}
          preselectedRecipients={[{ id: emailLead.id, name: emailLead.name, email: emailLead.email }]}
          leadContext={emailLead}
        />
      )}
    </div>
  );
};

export default AgencyLeadsContent;
